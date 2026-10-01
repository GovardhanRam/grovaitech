/**
 * Grovaitech AI Platform
 * lib/website-intelligence/url-security.ts
 *
 * Strict SSRF protection and URL validation for untrusted public website analysis.
 * - Allows only http: and https: protocols
 * - Rejects loopback, private IPv4/IPv6, link-local, carrier-grade NAT, cloud metadata, and internal TLDs
 * - Validates DNS resolution before making requests
 * - Validates redirect destinations individually to prevent redirect-based SSRF
 * - Normalizes same-origin crawl URLs and strips tracking parameters
 */

import dns from 'dns/promises'
import net from 'net'
import { isPrivateOrReservedIPv4, isPrivateOrReservedIPv6 } from '@/lib/integrations/egress'

export class UrlSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UrlSecurityError'
  }
}

export interface UrlValidationResult {
  valid: boolean
  url?: URL
  normalizedUrl?: string
  resolvedIps?: string[]
  reason?: string
}

/**
 * Checks whether a hostname or domain name is an internal, local, or cloud metadata target.
 */
export function isInternalOrReservedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().trim()

  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.arpa') ||
    normalized.endsWith('.example') ||
    normalized.endsWith('.invalid') ||
    normalized.endsWith('.test') ||
    normalized.endsWith('.lan') ||
    normalized.endsWith('.home') ||
    normalized.endsWith('.corp')
  ) {
    return true
  }

  // Cloud metadata hostnames
  if (
    normalized === 'metadata.google.internal' ||
    normalized === 'metadata' ||
    normalized === 'instance-data' ||
    normalized === '169.254.169.254'
  ) {
    return true
  }

  return false
}

/**
 * Validates an untrusted input URL against strict SSRF constraints.
 * Resolves DNS to verify that the host does not resolve to any private or reserved IP.
 */
export async function validateUntrustedUrl(
  inputUrlStr: string,
  options: {
    lookupFn?: (hostname: string) => Promise<string[]>
  } = {}
): Promise<UrlValidationResult> {
  if (!inputUrlStr || typeof inputUrlStr !== 'string') {
    return { valid: false, reason: 'URL cannot be empty.' }
  }

  const trimmed = inputUrlStr.trim()
  if (trimmed.length > 2048) {
    return { valid: false, reason: 'URL exceeds maximum length of 2048 characters.' }
  }

  // Pre-parse check for dangerous prefixes
  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:')
  ) {
    return { valid: false, reason: `Disallowed protocol scheme in URL.` }
  }

  let parsed: URL
  try {
    // If user provided domain without scheme (e.g. "example.com"), standard URL() throws.
    // However, if it starts with // or doesn't have scheme, we should evaluate carefully:
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.includes('://')) {
      parsed = new URL(`https://${trimmed}`)
    } else {
      parsed = new URL(trimmed)
    }
  } catch {
    return { valid: false, reason: 'Malformed or invalid URL format.' }
  }

  // Enforce http: or https: only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only http: and https: are allowed.`,
    }
  }

  // Reject user credentials in URL (e.g. https://user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: 'URLs with embedded user credentials (username/password) are not permitted.',
    }
  }

  const hostname = parsed.hostname.toLowerCase().trim()
  if (!hostname) {
    return { valid: false, reason: 'URL does not contain a valid hostname.' }
  }

  // Check internal hostname blocklist
  if (isInternalOrReservedHostname(hostname)) {
    return {
      valid: false,
      reason: `Host "${hostname}" is an internal, local, or reserved target and cannot be accessed.`,
    }
  }

  // Direct IP literal evaluation
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateOrReservedIPv4(hostname)) {
      return {
        valid: false,
        reason: `Target IP "${hostname}" is a private, loopback, or reserved IPv4 address.`,
      }
    }
    if (net.isIPv6(hostname) && isPrivateOrReservedIPv6(hostname)) {
      return {
        valid: false,
        reason: `Target IP "${hostname}" is a private, loopback, or reserved IPv6 address.`,
      }
    }

    return {
      valid: true,
      url: parsed,
      normalizedUrl: parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname) + parsed.search,
      resolvedIps: [hostname],
    }
  }

  // Resolve DNS to verify all destination IPs
  try {
    let resolvedIps: string[] = []
    if (options.lookupFn) {
      resolvedIps = await options.lookupFn(hostname)
    } else {
      const addresses = await dns.lookup(hostname, { all: true })
      resolvedIps = addresses.map((a) => a.address)
    }

    if (!resolvedIps || resolvedIps.length === 0) {
      return {
        valid: false,
        reason: `DNS resolution failed for hostname "${hostname}". Domain could not be resolved.`,
      }
    }

    for (const ip of resolvedIps) {
      if (net.isIPv4(ip) && isPrivateOrReservedIPv4(ip)) {
        return {
          valid: false,
          resolvedIps,
          reason: `Hostname "${hostname}" resolves to a restricted private or reserved IPv4 address (${ip}).`,
        }
      }
      if (net.isIPv6(ip) && isPrivateOrReservedIPv6(ip)) {
        return {
          valid: false,
          resolvedIps,
          reason: `Hostname "${hostname}" resolves to a restricted private or reserved IPv6 address (${ip}).`,
        }
      }
    }

    return {
      valid: true,
      url: parsed,
      normalizedUrl: parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname) + parsed.search,
      resolvedIps,
    }
  } catch (err: any) {
    return {
      valid: false,
      reason: `DNS lookup failed for hostname "${hostname}": ${err?.message || 'Host not found'}.`,
    }
  }
}

/**
 * Validates a redirect target URL against SSRF constraints and ensures it does not
 * redirect into private/internal network addresses.
 */
export async function validateRedirectTarget(
  redirectUrlStr: string,
  currentUrl: URL,
  options: { lookupFn?: (hostname: string) => Promise<string[]> } = {}
): Promise<UrlValidationResult> {
  let resolvedUrl: string
  try {
    resolvedUrl = new URL(redirectUrlStr, currentUrl.href).href
  } catch {
    return { valid: false, reason: 'Invalid redirect target URL format.' }
  }

  return validateUntrustedUrl(resolvedUrl, options)
}

/**
 * Normalizes a candidate crawl URL:
 * - Checks same-origin against baseOriginUrl
 * - Strips fragments (#section)
 * - Strips marketing/tracking query parameters (utm_*, gclid, fbclid, etc.)
 * - Filters out binary files (pdf, jpg, zip, etc.)
 * - Filters out obvious admin, auth, checkout, and cart routes
 * Returns a normalized URL string, or null if the URL should be ignored.
 */
export function normalizeSameOriginCrawlUrl(
  candidateHref: string,
  baseOriginUrl: URL
): string | null {
  if (!candidateHref || typeof candidateHref !== 'string') return null

  const trimmed = candidateHref.trim()
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('sms:') ||
    trimmed.startsWith('data:')
  ) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed, baseOriginUrl.href)
  } catch {
    return null
  }

  // Must match origin exactly
  if (parsed.origin !== baseOriginUrl.origin) {
    return null
  }

  // Only http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null
  }

  // Disallow user authentication credentials
  if (parsed.username || parsed.password) {
    return null
  }

  // Disallow common binary, media, and document file extensions
  const ignoredExtensions = /\.(pdf|zip|tar|gz|exe|dmg|pkg|deb|rpm|mp3|mp4|avi|mov|wmv|wav|flac|ogg|jpg|jpeg|png|gif|webp|svg|ico|bmp|tiff|css|js|map|xml|rss|woff|woff2|ttf|eot)$/i
  if (ignoredExtensions.test(parsed.pathname)) {
    return null
  }

  // Disallow sensitive/stateful routes
  const ignoredPathPatterns = [
    /^\/(login|signin|logout|signout|register|signup|auth)/i,
    /^\/(admin|wp-admin|wp-login|dashboard|backend|cpanel)/i,
    /^\/(cart|checkout|basket|order|billing|payment|my-account)/i,
    /^\/(api|webhook|graphql)/i,
  ]

  for (const pattern of ignoredPathPatterns) {
    if (pattern.test(parsed.pathname)) {
      return null
    }
  }

  // Remove fragment
  parsed.hash = ''

  // Filter out noisy tracking query params to avoid infinite URL variations
  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'ref',
    'source',
    '_ga',
    'mc_cid',
    'mc_eid',
  ]
  for (const param of trackingParams) {
    parsed.searchParams.delete(param)
  }

  // Normalize trailing slash: if pathname ends with / and length > 1, trim it for consistency
  let cleanPathname = parsed.pathname
  if (cleanPathname.length > 1 && cleanPathname.endsWith('/')) {
    cleanPathname = cleanPathname.slice(0, -1)
  }

  parsed.pathname = cleanPathname

  return parsed.href
}
