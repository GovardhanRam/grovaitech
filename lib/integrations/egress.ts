/**
 * Grovaitech AI Platform
 * lib/integrations/egress.ts
 *
 * Safe Egress Foundation for External Provider Network Calls.
 * Reusable server-side egress guard enforcing strict HTTPS, private IP/cloud metadata
 * resolution blocklists, redirect prohibition, request timeouts, and zero logging of secrets.
 *
 * IMPORTANT LIMITATIONS & BOUNDARIES:
 * - This module provides an application-layer defense against SSRF.
 * - In environments using standard Node.js global fetch without a custom HTTP Agent/Dispatcher,
 *   a theoretical DNS rebinding window exists between the pre-flight DNS lookup and fetch connection.
 * - This interface is provider-neutral and designed to allow socket-level IP binding when
 *   custom runtime dispatchers (e.g. undici Agent) are configured.
 */

import dns from 'dns/promises'
import net from 'net'

export class EgressSecurityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EgressSecurityError'
  }
}

export interface SafeFetchOptions extends Omit<RequestInit, 'redirect'> {
  /** Request timeout in milliseconds (default: 5000ms, max: 30000ms) */
  timeoutMs?: number
  /** Custom DNS resolver override for testing/mocking */
  lookupFn?: (hostname: string) => Promise<string[]>
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true // Invalid format treated as unsafe
  }

  const [a, b] = parts

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true

  // 10.0.0.0/8 (RFC 1918 Private)
  if (a === 10) return true

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true

  // 169.254.0.0/16 (Link-local / Cloud Metadata like 169.254.169.254)
  if (a === 169 && b === 254) return true

  // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true

  // 192.168.0.0/16 (RFC 1918 Private)
  if (a === 192 && b === 168) return true

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation/TEST-NET)
  if (a === 192 && b === 0 && parts[2] === 2) return true
  if (a === 198 && b === 51 && parts[2] === 100) return true
  if (a === 203 && b === 0 && parts[2] === 113) return true

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true

  return false
}

/**
 * Checks if an IPv6 address is in a loopback, unique local, link-local, or reserved range.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim()

  // ::1 (Loopback) or :: (Unspecified)
  if (normalized === '::1' || normalized === '::') return true

  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.replace('::ffff:', '')
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIPv4(ipv4Part)
    }
  }

  // fc00::/7 (Unique Local Address - fc00:: to fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

  // fe80::/10 (Link-local unicast - fe80:: to febf::)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true
  }

  return false
}

/**
 * Validates that a target URL conforms to strict egress safety rules:
 * 1. Protocol must be HTTPS
 * 2. Hostname must not be a localhost alias
 * 3. Resolved IP addresses must not belong to private or reserved subnets
 */
export async function validateEgressUrl(
  urlStr: string,
  lookupFn?: (hostname: string) => Promise<string[]>
): Promise<{ valid: boolean; url: URL; resolvedIps?: string[]; reason?: string }> {
  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    return { valid: false, url: null as any, reason: 'Invalid URL format' }
  }

  // A. Only HTTPS URLs are permitted for external provider calls
  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      url: parsed,
      reason: `Insecure protocol: ${parsed.protocol} is rejected. Provider calls require https:`,
    }
  }

  const hostname = parsed.hostname.toLowerCase().trim()

  // B. Reject obvious localhost / internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return {
      valid: false,
      url: parsed,
      reason: `Restricted hostname: "${hostname}" resolves to an internal or local domain.`,
    }
  }

  // C. If hostname is already a raw IP literal, check directly
  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateOrReservedIPv4(hostname)) {
      return {
        valid: false,
        url: parsed,
        reason: `Restricted IPv4 target: "${hostname}" belongs to a private or reserved network.`,
      }
    }
    if (net.isIPv6(hostname) && isPrivateOrReservedIPv6(hostname)) {
      return {
        valid: false,
        url: parsed,
        reason: `Restricted IPv6 target: "${hostname}" belongs to a private or reserved network.`,
      }
    }
    return { valid: true, url: parsed, resolvedIps: [hostname] }
  }

  // D. Resolve hostname before connection
  try {
    let resolvedIps: string[] = []
    if (lookupFn) {
      resolvedIps = await lookupFn(hostname)
    } else {
      const addresses = await dns.lookup(hostname, { all: true })
      resolvedIps = addresses.map((a) => a.address)
    }

    if (!resolvedIps || resolvedIps.length === 0) {
      return {
        valid: false,
        url: parsed,
        reason: `DNS resolution failed for hostname "${hostname}".`,
      }
    }

    // E. Verify all resolved IPs against blocklists
    for (const ip of resolvedIps) {
      if (net.isIPv4(ip) && isPrivateOrReservedIPv4(ip)) {
        return {
          valid: false,
          url: parsed,
          resolvedIps,
          reason: `DNS resolution for "${hostname}" yielded restricted private IPv4: ${ip}.`,
        }
      }
      if (net.isIPv6(ip) && isPrivateOrReservedIPv6(ip)) {
        return {
          valid: false,
          url: parsed,
          resolvedIps,
          reason: `DNS resolution for "${hostname}" yielded restricted private IPv6: ${ip}.`,
        }
      }
    }

    return { valid: true, url: parsed, resolvedIps }
  } catch (dnsErr: any) {
    return {
      valid: false,
      url: parsed,
      reason: `DNS resolution error for "${hostname}": ${dnsErr.message || dnsErr}`,
    }
  }
}

/**
 * Reusable server-side hardened fetch wrapper for provider adapters.
 * Enforces:
 * - HTTPS and pre-flight DNS validation
 * - redirect: 'error'
 * - default 5000ms timeout via AbortController
 * - zero logging of headers or request bodies
 */
export async function safeFetch(
  urlStr: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 5000, lookupFn, ...fetchOptions } = options

  // Validate egress constraints
  const validation = await validateEgressUrl(urlStr, lookupFn)
  if (!validation.valid) {
    throw new EgressSecurityError(`Egress blocked: ${validation.reason}`)
  }

  const boundedTimeout = Math.min(Math.max(timeoutMs, 500), 30000)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), boundedTimeout)

  try {
    const res = await fetch(validation.url.toString(), {
      ...fetchOptions,
      redirect: 'error', // Prevent redirects to prevent SSRF bypass
      signal: controller.signal,
    })
    return res
  } catch (err: any) {
    if (err.name === 'AbortError' || controller.signal.aborted) {
      throw new Error(`Egress request timed out after ${boundedTimeout}ms`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
