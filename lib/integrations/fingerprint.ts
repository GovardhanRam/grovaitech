/**
 * Grovaitech AI Platform
 * lib/integrations/fingerprint.ts
 *
 * Canonical request serializer and payload fingerprinting.
 * Generates deterministic SHA256 hashes of payloads to ensure that identical payloads
 * produce identical fingerprints and modified payloads trigger conflict detection.
 * Also provides result payload sanitization to prevent storing secrets or tokens.
 */

import crypto from 'crypto'

const SENSITIVE_KEY_PATTERN = /^(authorization|token|access_token|refresh_token|secret|api_key|apikey|password|bearer)$/i

/**
 * Recursively canonicalizes any JSON-compatible value:
 * - Sorts object keys alphabetically
 * - Preserves array element order exactly
 * - Distinguishes null, boolean, number, string, array, object
 * - Normalizes Date objects to ISO strings
 * - Omits undefined fields in objects
 * - Masks sensitive keys if present
 */
export function canonicalizeJson(val: any): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'

  const t = typeof val
  if (t === 'boolean' || t === 'number') {
    return String(val)
  }
  if (t === 'string') {
    return JSON.stringify(val)
  }
  if (val instanceof Date) {
    return JSON.stringify(val.toISOString())
  }

  if (Array.isArray(val)) {
    const items = val.map((item) => canonicalizeJson(item))
    return `[${items.join(',')}]`
  }

  if (t === 'object') {
    const keys = Object.keys(val).sort()
    const entries: string[] = []
    for (const key of keys) {
      const propVal = val[key]
      if (propVal === undefined) continue

      // Mask sensitive keys if inadvertently present in payload
      const serializedVal = SENSITIVE_KEY_PATTERN.test(key)
        ? '"[REDACTED_SECRET]"'
        : canonicalizeJson(propVal)

      entries.push(`${JSON.stringify(key)}:${serializedVal}`)
    }
    return `{${entries.join(',')}}`
  }

  return JSON.stringify(String(val))
}

/**
 * Generates a deterministic SHA256 request fingerprint from an arbitrary request payload.
 */
export function createRequestFingerprint(payload: any): string {
  const canonical = canonicalizeJson(payload ?? {})
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex')
}

/**
 * Deeply sanitizes a provider result payload before persisting it in the database.
 * Strips tokens, authorization headers, private keys, and passwords.
 */
export function sanitizeResultPayload(val: any): any {
  if (val === null || val === undefined) return val

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeResultPayload(item))
  }

  if (typeof val === 'object' && !(val instanceof Date)) {
    const sanitized: Record<string, any> = {}
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        sanitized[k] = '[REDACTED_SECRET]'
      } else {
        sanitized[k] = sanitizeResultPayload(v)
      }
    }
    return sanitized
  }

  return val
}
