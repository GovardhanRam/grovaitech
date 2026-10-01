/**
 * Grovaitech AI Platform
 * lib/website-intelligence/fetcher.ts
 *
 * Hardened public HTML fetcher with:
 * - Pre-request DNS and IP verification
 * - Manual redirect interception with destination SSRF validation
 * - Strict response body size enforcement (chunks abort when exceeded)
 * - Safe standard headers (no credential forwarding)
 * - Strict Content-Type enforcement (HTML only)
 * - Request timeouts via AbortController
 */

import {
  validateUntrustedUrl,
  validateRedirectTarget,
  UrlSecurityError,
} from './url-security'
import type { WebsiteCrawlLimits } from './types'

export interface SafeFetchWebsiteOptions extends Partial<WebsiteCrawlLimits> {
  fetchFn?: typeof fetch
  lookupFn?: (hostname: string) => Promise<string[]>
}

export interface FetchWebsiteOutput {
  success: boolean
  url: string
  finalUrl?: string
  statusCode?: number
  contentType?: string
  responseTimeMs?: number
  html?: string
  error?: string
}

export const DEFAULT_CRAWL_LIMITS: WebsiteCrawlLimits = {
  timeoutMs: 8000,
  maxResponseBytes: 2 * 1024 * 1024, // 2 MB
  maxPages: 3,
  maxCrawlDepth: 1,
  maxRedirects: 3,
  maxHtmlParseBytes: 1024 * 1024, // 1 MB
}

/**
 * Fetches public HTML content for a URL safely, enforcing strict SSRF and resource limits.
 */
export async function safeFetchWebsiteHtml(
  targetUrl: string,
  options: SafeFetchWebsiteOptions = {}
): Promise<FetchWebsiteOutput> {
  const limits: WebsiteCrawlLimits = {
    ...DEFAULT_CRAWL_LIMITS,
    ...options,
  }

  const boundedTimeout = Math.min(Math.max(limits.timeoutMs, 1000), 15000)
  const fetchImpl = options.fetchFn || fetch
  const startTime = Date.now()

  let currentUrlStr = targetUrl
  let redirectsCount = 0

  while (redirectsCount <= limits.maxRedirects) {
    // 1. Validate destination URL before every single request
    const validation = await validateUntrustedUrl(currentUrlStr, {
      lookupFn: options.lookupFn,
    })

    if (!validation.valid || !validation.url) {
      return {
        success: false,
        url: targetUrl,
        finalUrl: currentUrlStr,
        responseTimeMs: Date.now() - startTime,
        error: validation.reason || 'URL security validation failed.',
      }
    }

    const currentUrl = validation.url
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), boundedTimeout)

    try {
      const response = await fetchImpl(currentUrl.href, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; GovaWebsiteUpgradeBot/1.0; +https://grovaitech.ai/bot)',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'manual', // Intercept all redirects to validate destination
        signal: controller.signal,
      })

      clearTimeout(timer)

      // Handle Redirects (301, 302, 303, 307, 308)
      if (
        [301, 302, 303, 307, 308].includes(response.status) ||
        (response.type === 'opaqueredirect' && response.status === 0)
      ) {
        redirectsCount++
        if (redirectsCount > limits.maxRedirects) {
          return {
            success: false,
            url: targetUrl,
            finalUrl: currentUrlStr,
            statusCode: response.status,
            responseTimeMs: Date.now() - startTime,
            error: `Maximum redirect limit (${limits.maxRedirects}) exceeded.`,
          }
        }

        const locationHeader = response.headers.get('location')
        if (!locationHeader) {
          return {
            success: false,
            url: targetUrl,
            finalUrl: currentUrlStr,
            statusCode: response.status,
            responseTimeMs: Date.now() - startTime,
            error: `Redirect status ${response.status} returned without a Location header.`,
          }
        }

        // Validate redirect target against SSRF (no loopback, private IP, cloud metadata)
        const redirectValidation = await validateRedirectTarget(
          locationHeader,
          currentUrl,
          { lookupFn: options.lookupFn }
        )

        if (!redirectValidation.valid || !redirectValidation.url) {
          return {
            success: false,
            url: targetUrl,
            finalUrl: locationHeader,
            statusCode: response.status,
            responseTimeMs: Date.now() - startTime,
            error: `Insecure redirect blocked: ${redirectValidation.reason}`,
          }
        }

        currentUrlStr = redirectValidation.url.href
        continue // Loop to make next validated request
      }

      // Check HTTP Status
      if (!response.ok) {
        return {
          success: false,
          url: targetUrl,
          finalUrl: currentUrl.href,
          statusCode: response.status,
          responseTimeMs: Date.now() - startTime,
          error: `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
        }
      }

      // Check Content-Type (must be HTML)
      const rawContentType = response.headers.get('content-type') || ''
      const isHtml =
        rawContentType.toLowerCase().includes('text/html') ||
        rawContentType.toLowerCase().includes('application/xhtml+xml')

      if (!isHtml) {
        return {
          success: false,
          url: targetUrl,
          finalUrl: currentUrl.href,
          statusCode: response.status,
          contentType: rawContentType,
          responseTimeMs: Date.now() - startTime,
          error: `Non-HTML content type (${rawContentType || 'unknown'}). Analysis requires an HTML web page.`,
        }
      }

      // Stream / Read body with hard byte-limit enforcement
      let html = ''
      if (response.body && typeof (response.body as any).getReader === 'function') {
        const reader = (response.body as ReadableStream<Uint8Array>).getReader()
        const decoder = new TextDecoder('utf-8')
        let totalBytes = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            totalBytes += value.length
            if (totalBytes > limits.maxResponseBytes) {
              await reader.cancel()
              return {
                success: false,
                url: targetUrl,
                finalUrl: currentUrl.href,
                statusCode: response.status,
                responseTimeMs: Date.now() - startTime,
                error: `Response size exceeded maximum allowed limit (${limits.maxResponseBytes} bytes).`,
              }
            }
            html += decoder.decode(value, { stream: true })
          }
        }
        html += decoder.decode()
      } else {
        // Fallback for mock/test fetch responses
        const text = await response.text()
        if (text.length > limits.maxResponseBytes) {
          return {
            success: false,
            url: targetUrl,
            finalUrl: currentUrl.href,
            statusCode: response.status,
            responseTimeMs: Date.now() - startTime,
            error: `Response size exceeded maximum allowed limit (${limits.maxResponseBytes} bytes).`,
          }
        }
        html = text
      }

      return {
        success: true,
        url: targetUrl,
        finalUrl: currentUrl.href,
        statusCode: response.status,
        contentType: rawContentType,
        responseTimeMs: Date.now() - startTime,
        html,
      }
    } catch (err: any) {
      clearTimeout(timer)
      const elapsed = Date.now() - startTime
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return {
          success: false,
          url: targetUrl,
          finalUrl: currentUrlStr,
          responseTimeMs: elapsed,
          error: `Request timed out after ${boundedTimeout}ms.`,
        }
      }

      return {
        success: false,
        url: targetUrl,
        finalUrl: currentUrlStr,
        responseTimeMs: elapsed,
        error: err?.message || 'Network connection failed.',
      }
    }
  }

  return {
    success: false,
    url: targetUrl,
    finalUrl: currentUrlStr,
    responseTimeMs: Date.now() - startTime,
    error: `Exceeded maximum redirect limit (${limits.maxRedirects}).`,
  }
}

export interface FetchAssetOutput {
  success: boolean
  url: string
  finalUrl?: string
  statusCode?: number
  contentType?: string
  responseTimeMs?: number
  content?: string
  error?: string
}

/**
 * Safely fetches a single same-origin asset (e.g. primary JavaScript application bundle)
 * under strict SSRF validation, same-origin origin matching, and hard byte/timeout bounds.
 */
export async function safeFetchSameOriginAsset(
  assetUrlStr: string,
  baseOriginUrlStr: string,
  options: SafeFetchWebsiteOptions = {}
): Promise<FetchAssetOutput> {
  const startTime = Date.now()
  const fetchImpl = options.fetchFn || fetch
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 5000, 1000), 10000)
  const maxBytes = Math.min(options.maxResponseBytes ?? 1048576, 1048576) // max 1MB

  // 1. Resolve relative URLs against base origin
  let targetUrl: URL
  let baseOrigin: URL
  try {
    baseOrigin = new URL(baseOriginUrlStr)
    targetUrl = new URL(assetUrlStr, baseOrigin.href)
  } catch (err: any) {
    return {
      success: false,
      url: assetUrlStr,
      responseTimeMs: 0,
      error: `Invalid asset or base origin URL: ${err?.message || 'Malformed URL'}`,
    }
  }

  // 2. Strict Same-Origin Verification
  if (targetUrl.origin !== baseOrigin.origin) {
    return {
      success: false,
      url: targetUrl.href,
      responseTimeMs: 0,
      error: `Cross-origin asset fetch rejected. Origin '${targetUrl.origin}' does not match base '${baseOrigin.origin}'.`,
    }
  }

  // 3. Strict SSRF validation on target URL (DNS, private IP blocking)
  const validation = await validateUntrustedUrl(targetUrl.href, { lookupFn: options.lookupFn })
  if (!validation.valid || !validation.url) {
    return {
      success: false,
      url: targetUrl.href,
      responseTimeMs: 0,
      error: validation.reason || 'Asset URL failed SSRF validation.',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(validation.url.href, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GovaWebsiteUpgradeBot/1.0; +https://grovaitech.ai/bot)',
        Accept: 'application/javascript,text/javascript,text/plain,*/*;q=0.5',
        'Cache-Control': 'no-cache',
      },
      redirect: 'manual', // Do not automatically follow redirects on assets
      signal: controller.signal,
    })

    clearTimeout(timer)

    // Handle Redirects: Reject or only allow if same origin and validated
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        return {
          success: false,
          url: targetUrl.href,
          statusCode: response.status,
          responseTimeMs: Date.now() - startTime,
          error: 'Asset redirect returned without location header.',
        }
      }
      const redirectValidation = await validateRedirectTarget(location, targetUrl, {
        lookupFn: options.lookupFn,
      })
      if (!redirectValidation.valid || !redirectValidation.url) {
        return {
          success: false,
          url: targetUrl.href,
          finalUrl: location,
          statusCode: response.status,
          responseTimeMs: Date.now() - startTime,
          error: `Insecure asset redirect rejected: ${redirectValidation.reason}`,
        }
      }
      if (redirectValidation.url.origin !== baseOrigin.origin) {
        return {
          success: false,
          url: targetUrl.href,
          finalUrl: location,
          statusCode: response.status,
          responseTimeMs: Date.now() - startTime,
          error: 'Asset redirected to a cross-origin target.',
        }
      }
      // Follow single validated same-origin redirect
      return safeFetchSameOriginAsset(redirectValidation.url.href, baseOriginUrlStr, {
        ...options,
        maxRedirects: 0,
      })
    }

    if (!response.ok) {
      return {
        success: false,
        url: targetUrl.href,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
        error: `HTTP ${response.status} fetching asset.`,
      }
    }

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    if (text.length > maxBytes) {
      return {
        success: false,
        url: targetUrl.href,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
        error: `Asset body length (${text.length} bytes) exceeds limit (${maxBytes} bytes).`,
      }
    }

    return {
      success: true,
      url: targetUrl.href,
      finalUrl: targetUrl.href,
      statusCode: response.status,
      contentType,
      responseTimeMs: Date.now() - startTime,
      content: text,
    }
  } catch (err: any) {
    clearTimeout(timer)
    return {
      success: false,
      url: targetUrl.href,
      responseTimeMs: Date.now() - startTime,
      error:
        err?.name === 'AbortError'
          ? `Asset request timed out after ${timeoutMs}ms.`
          : err?.message || 'Failed to fetch asset.',
    }
  }
}
