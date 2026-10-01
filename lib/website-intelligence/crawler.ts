/**
 * Grovaitech AI Platform
 * lib/website-intelligence/crawler.ts
 *
 * Hardened, same-origin breadth-first crawler for public website intelligence.
 * - Restricts crawling strictly to same-origin URLs
 * - Enforces hard limits on page count, crawl depth, response bytes, and redirects
 * - Deduplicates URLs and strips tracking parameters
 * - Produces consolidated, factual WebsiteEvidenceItems without marketing judgments
 */

import {
  safeFetchWebsiteHtml,
  safeFetchSameOriginAsset,
  DEFAULT_CRAWL_LIMITS,
  type SafeFetchWebsiteOptions,
} from './fetcher'
import { parseHtmlDocument } from './parser'
import {
  extractPageEvidence,
  extractServicesFromMetadata,
  extractLocationFromMetadata,
} from './extractor'
import { normalizeSameOriginCrawlUrl } from './url-security'
import type {
  WebsitePage,
  WebsiteEvidenceItem,
  WebsiteCrawlResult,
  WebsiteCrawlSummary,
  CrawlErrorItem,
  WebsiteCrawlLimits,
} from './types'

export interface CrawlProgressEvent {
  stage: 'VALIDATING' | 'CONNECTING' | 'ANALYZING_HOMEPAGE' | 'DISCOVERING_PAGES' | 'CRAWLING_PAGE' | 'EXTRACTING_EVIDENCE' | 'COMPLETED' | 'FAILED'
  message: string
  currentUrl?: string
  pagesCrawled?: number
  totalPages?: number
}

export interface CrawlWebsiteOptions extends SafeFetchWebsiteOptions {
  onProgress?: (event: CrawlProgressEvent) => void
}

/**
 * Crawls a publicly accessible website starting from the given URL.
 */
export async function crawlWebsite(
  startingUrl: string,
  options: CrawlWebsiteOptions = {}
): Promise<WebsiteCrawlResult> {
  const limits: WebsiteCrawlLimits = {
    ...DEFAULT_CRAWL_LIMITS,
    ...options,
  }

  const startTime = Date.now()
  const pages: WebsitePage[] = []
  const allEvidence: WebsiteEvidenceItem[] = []
  const errors: CrawlErrorItem[] = []

  const visitedUrls = new Set<string>()
  const queue: Array<{ url: string; depth: number }> = [{ url: startingUrl, depth: 0 }]

  options.onProgress?.({
    stage: 'VALIDATING',
    message: 'Validating website URL and security constraints...',
    currentUrl: startingUrl,
  })

  let finalBaseOriginUrl: URL | null = null

  while (queue.length > 0 && pages.length < limits.maxPages) {
    const item = queue.shift()!
    const currentUrlStr = item.url
    const currentDepth = item.depth

    if (visitedUrls.has(currentUrlStr)) {
      continue
    }
    visitedUrls.add(currentUrlStr)

    const isHomepage = pages.length === 0

    options.onProgress?.({
      stage: isHomepage ? 'CONNECTING' : 'CRAWLING_PAGE',
      message: isHomepage
        ? `Connecting to ${currentUrlStr}...`
        : `Analyzing page ${pages.length + 1} of ${limits.maxPages} (${currentUrlStr})...`,
      currentUrl: currentUrlStr,
      pagesCrawled: pages.length,
      totalPages: limits.maxPages,
    })

    const fetchResult = await safeFetchWebsiteHtml(currentUrlStr, options)

    if (!fetchResult.success || !fetchResult.html) {
      errors.push({
        url: currentUrlStr,
        error: fetchResult.error || 'Failed to fetch page.',
        statusCode: fetchResult.statusCode,
      })

      if (isHomepage) {
        // If homepage itself fails, terminate crawl immediately
        options.onProgress?.({
          stage: 'FAILED',
          message: fetchResult.error || 'Failed to connect to website.',
          currentUrl: currentUrlStr,
        })

        return {
          success: false,
          startingUrl,
          finalBaseUrl: fetchResult.finalUrl || startingUrl,
          pages: [],
          allEvidence: [
            {
              id: `ev-fetch-fail-root`,
              type: 'title',
              page: '/',
              status: 'FETCH_FAILED',
              detail: fetchResult.error || 'Website could not be accessed.',
            },
          ],
          summary: {
            totalPagesCrawled: 0,
            totalHeadingsFound: 0,
            totalFormsFound: 0,
            totalCtasFound: 0,
            phoneNumbers: [],
            emailAddresses: [],
            whatsappLinks: [],
            detectedServices: [],
            missingCriticalElements: ['Accessible Website'],
          },
          errors,
          crawlDurationMs: Date.now() - startTime,
        }
      }

      continue
    }

    // Set base URL from final redirect of homepage
    if (isHomepage && fetchResult.finalUrl) {
      try {
        finalBaseOriginUrl = new URL(fetchResult.finalUrl)
      } catch {
        finalBaseOriginUrl = null
      }
    }

    options.onProgress?.({
      stage: isHomepage ? 'ANALYZING_HOMEPAGE' : 'EXTRACTING_EVIDENCE',
      message: `Extracting structure and evidence from ${currentUrlStr}...`,
      currentUrl: currentUrlStr,
      pagesCrawled: pages.length + 1,
    })

    // Parse HTML
    const parsedDoc = parseHtmlDocument(fetchResult.html, limits.maxHtmlParseBytes)

    // Inspect same-origin application bundle if SPA shell detected
    let bundleContent: string | undefined
    if (parsedDoc.isSpaShell && parsedDoc.scriptSources.length > 0) {
      const pageBase = fetchResult.finalUrl || currentUrlStr
      // Prioritize scripts matching common bundle naming conventions
      const candidate =
        parsedDoc.scriptSources.find((s) => /(?:index|app|main|bundle|chunk)[^"']*\.js/i.test(s)) ||
        parsedDoc.scriptSources.find((s) => s.endsWith('.js')) ||
        parsedDoc.scriptSources[0]

      if (candidate) {
        options.onProgress?.({
          stage: 'EXTRACTING_EVIDENCE',
          message: `Inspecting primary application script bundle (${candidate})...`,
          currentUrl: currentUrlStr,
        })
        try {
          const assetResult = await safeFetchSameOriginAsset(candidate, pageBase, options)
          if (assetResult.success && assetResult.content) {
            bundleContent = assetResult.content
          }
        } catch {
          // Non-fatal: fallback to HTML and metadata evidence
        }
      }
    }

    // Extract Evidence
    const { page, evidence } = extractPageEvidence(
      parsedDoc,
      fetchResult.finalUrl || currentUrlStr,
      fetchResult.statusCode || 200,
      fetchResult.contentType || 'text/html',
      fetchResult.responseTimeMs || 0,
      bundleContent
    )

    pages.push(page)
    allEvidence.push(...evidence)

    // Discover internal links or SPA client routes for subsequent crawl if depth allows
    if (currentDepth < limits.maxCrawlDepth && finalBaseOriginUrl) {
      options.onProgress?.({
        stage: 'DISCOVERING_PAGES',
        message: 'Discovering relevant same-origin pages...',
        currentUrl: currentUrlStr,
      })

      // Standard HTML anchor links
      for (const link of page.internalLinks) {
        const normalized = normalizeSameOriginCrawlUrl(link.href, finalBaseOriginUrl)
        if (normalized && !visitedUrls.has(normalized)) {
          const alreadyQueued = queue.some((q) => q.url === normalized)
          if (!alreadyQueued && queue.length + pages.length < limits.maxPages * 2) {
            queue.push({ url: normalized, depth: currentDepth + 1 })
          }
        }
      }

      // If static links are empty (SPA), queue discovered client routes
      if (page.internalLinks.length === 0 && page.discoveredRoutes && page.discoveredRoutes.length > 0) {
        for (const route of page.discoveredRoutes) {
          const normalized = normalizeSameOriginCrawlUrl(route, finalBaseOriginUrl)
          if (normalized && !visitedUrls.has(normalized)) {
            const alreadyQueued = queue.some((q) => q.url === normalized)
            if (!alreadyQueued && queue.length + pages.length < limits.maxPages * 2) {
              queue.push({ url: normalized, depth: currentDepth + 1 })
            }
          }
        }
      }
    }
  }

  // Aggregate Crawl Summary
  const allPhones = new Set<string>()
  const allEmails = new Set<string>()
  const allWhatsApp = new Set<string>()
  const serviceCandidates = new Set<string>()
  let totalHeadings = 0
  let totalForms = 0
  let totalCtas = 0

  for (const page of pages) {
    totalHeadings += page.headings.length
    totalForms += page.forms.length
    totalCtas += page.buttons.length

    for (const c of page.contacts) {
      if (c.type === 'phone') allPhones.add(c.value)
      if (c.type === 'email') allEmails.add(c.value)
      if (c.type === 'whatsapp') allWhatsApp.add(c.value)
    }

    // Identify service candidates from H2 headings and navigation links
    for (const h of page.headings) {
      if (h.level === 2 && h.text.length > 3 && h.text.length < 50) {
        serviceCandidates.add(h.text)
      }
    }
    for (const l of page.navigationLinks) {
      if (l.text.length > 3 && l.text.length < 40 && !l.isExternal) {
        serviceCandidates.add(l.text)
      }
    }
  }

  const rootPage = pages[0]
  // Fallback to metadata services if zero headings exist (e.g. client-side SPA)
  if (serviceCandidates.size === 0 && rootPage) {
    const metaServices = extractServicesFromMetadata(rootPage.metaDescription, rootPage.title)
    for (const s of metaServices) {
      serviceCandidates.add(s)
    }
  }

  const detectedLocation = extractLocationFromMetadata(rootPage?.metaDescription, rootPage?.title)

  // Critical Elements: strictly only flag when status === 'NOT_FOUND'.
  // NEVER flag when status is UNKNOWN (e.g. SPA) or FETCH_FAILED!
  const missingElements: string[] = []
  if (rootPage) {
    if (!rootPage.metaDescription) {
      missingElements.push('Meta Description')
    }

    const h1Ev = allEvidence.find((e) => e.type === 'h1_heading' && e.page === rootPage.pathname)
    if (h1Ev?.status === 'NOT_FOUND') {
      missingElements.push('H1 Main Heading')
    }

    const ctaEv = allEvidence.find((e) => e.type === 'cta_signal' && e.page === rootPage.pathname)
    if (ctaEv?.status === 'NOT_FOUND') {
      missingElements.push('Prominent Call-to-Action')
    }

    const formEv = allEvidence.find((e) => e.type === 'lead_capture_form' && e.page === rootPage.pathname)
    if (formEv?.status === 'NOT_FOUND') {
      missingElements.push('Direct Lead Capture Form')
    }

    const phoneEv = allEvidence.find((e) => e.type === 'phone_contact')
    const emailEv = allEvidence.find((e) => e.type === 'email_contact')
    if (phoneEv?.status === 'NOT_FOUND' && emailEv?.status === 'NOT_FOUND') {
      missingElements.push('Clear Contact Method')
    }

    // For SPA pages, surface an architectural SEO observation instead of claiming elements are missing
    if (rootPage.isSpaShell) {
      missingElements.push('Static HTML Pre-Rendering / Client-Rendered SPA')
    }
  }

  options.onProgress?.({
    stage: 'COMPLETED',
    message: `Website intelligence completed: ${pages.length} page(s) analyzed.`,
    pagesCrawled: pages.length,
  })

  return {
    success: pages.length > 0,
    startingUrl,
    finalBaseUrl: finalBaseOriginUrl ? finalBaseOriginUrl.origin : startingUrl,
    pages,
    allEvidence,
    summary: {
      totalPagesCrawled: pages.length,
      totalHeadingsFound: totalHeadings,
      totalFormsFound: totalForms,
      totalCtasFound: totalCtas,
      phoneNumbers: Array.from(allPhones),
      emailAddresses: Array.from(allEmails),
      whatsappLinks: Array.from(allWhatsApp),
      detectedServices: Array.from(serviceCandidates).slice(0, 10),
      detectedTitle: rootPage?.title,
      detectedDescription: rootPage?.metaDescription,
      detectedLocation,
      missingCriticalElements: missingElements,
      isSpaShell: rootPage?.isSpaShell,
      spaFramework: rootPage?.spaFramework,
      discoveredRoutes: rootPage?.discoveredRoutes,
    },
    errors,
    crawlDurationMs: Date.now() - startTime,
  }
}
