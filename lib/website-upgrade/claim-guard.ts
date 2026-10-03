/**
 * Grovaitech AI Platform
 * lib/website-upgrade/claim-guard.ts
 *
 * Reusable Claim Guard for AI Website Upgrades.
 * Identifies, validates, and gates unsupported claims (superlatives, metrics, credentials, guarantees)
 * unless corroborated by verified evidence.
 *
 * Prevents false claims, legal exposure, and fabricated testimonials or statistics.
 */

import type { WebsiteClaim, WebsiteClaimType, WebsiteEvidence, EvidenceStatus } from './types'

export interface ClaimPatternRule {
  type: WebsiteClaimType
  regex: RegExp
  name: string
  gatingReason: string
  suggestedReplacement?: string
  /**
   * Allowed evidence sources that can corroborate this claim.
   * Superlatives, guarantees, medical outcomes, etc. cannot be verified by website_content or unverified user_input.
   */
  allowedEvidenceSources?: Array<WebsiteEvidence['source']>
  /**
   * Whether an explicit source reference (citation, registration ID, license number) is required.
   */
  requireSourceReference?: boolean
  /**
   * Optional custom validator to verify if an evidence item truly corroborates this claim.
   */
  validateEvidence?: (evidence: WebsiteEvidence, fullClaim: string, detectedPattern: string) => boolean
}

/**
 * Evaluates whether an evidence item truly corroborates a superlative claim.
 * Requires:
 * 1. Must mention the superlative pattern (e.g. "best", "#1", "top", "leading").
 * 2. Must reference the relevant subject/domain from the claim (e.g. "dental", "hospital", "clinic")
 *    so an unrelated ranking or passing mention cannot corroborate a specific superlative claim.
 */
function matchesSuperlativeEvidence(
  ev: WebsiteEvidence,
  fullClaim: string,
  pattern: string
): boolean {
  const normFact = (ev.fact + ' ' + (ev.raw_text || '')).toLowerCase()
  const normPattern = pattern.toLowerCase()

  if (!normFact.includes(normPattern)) {
    return false
  }

  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'were', 'your', 'about',
    'and', 'for', 'the', 'our', 'all', 'are', 'not', 'you', 'was', 'has', 'in', 'of', 'to'
  ])

  const words = fullClaim
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w) && !normPattern.includes(w))

  if (words.length === 0) {
    return true
  }

  // Must match at least one significant domain or subject term from the claim
  return words.some((w) => normFact.includes(w))
}

export const CLAIM_RULES: ClaimPatternRule[] = [
  // 1. Superlatives
  {
    type: 'superlative',
    regex: /(?:^|\W)(best|#1|no\.?\s*1|number\s+one|leading|cheapest|most\s+trusted|premier|world[\s-]class|top[\s-]rated|unmatched|unrivaled|greatest)(?=\W|$)/i,
    name: 'Superlative Claim',
    gatingReason: 'Superlative claims must be corroborated by independent ranking, third-party citation, or verified market audit.',
    suggestedReplacement: 'Use descriptive value propositions highlighting specific capabilities instead of unverified superlatives.',
    allowedEvidenceSources: ['third_party_verified'],
    requireSourceReference: true,
    validateEvidence: matchesSuperlativeEvidence,
  },
  // 2. Numerical Metrics & Revenue Figures
  {
    type: 'numerical_metric',
    regex: /\b(\d+[\d,]*\+?\s*(customers|clients|users|patients|subscribers|cases|projects)|[₹$€£]\s*[\d,.]+\s*(lakh|cr|crore|k|m|million|billion)?|(\d+(\.\d+)?%)\s*(conversion|success|increase|roi|growth))\b/i,
    name: 'Numerical Metric or Conversion Figure',
    gatingReason: 'Quantitative customer counts, revenues, and conversion rates require documented analytics or financial evidence.',
    suggestedReplacement: 'Focus on qualitative benefits or mark quantitative figures as requiring client data sign-off.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
  },
  // 3. Medical Outcomes & Absolute Claims
  {
    type: 'medical_outcome',
    regex: /\b(100%\s*painless|cure[sd]?|zero\s*side[\s-]effects?|guaranteed\s*healing|permanent\s*cure)\b/i,
    name: 'Medical / Clinical Outcome Claim',
    gatingReason: 'Medical outcome assurances violate clinical advertising guidelines without formal clinical trial evidence.',
    suggestedReplacement: 'Emphasize patient comfort protocols, thorough consultation, and individualized care.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
    requireSourceReference: true,
  },
  // 4. Guarantees
  {
    type: 'guarantee',
    regex: /\b(guarantee[ds]?|100%\s*guaranteed?|money[\s-]back\s*guarantee|risk[\s-]free|guaranteed\s*results?)\b/i,
    name: 'Performance or Legal Guarantee',
    gatingReason: 'Legal or financial outcome guarantees create liability without an explicit signed client guarantee terms sheet.',
    suggestedReplacement: 'Describe process rigor and satisfaction commitments without binding guarantees.',
    allowedEvidenceSources: ['document'],
  },
  // 5. Awards & Recognitions
  {
    type: 'award',
    regex: /\b(award[\s-]winning|voted\s*(best|#1)|winner\s+of|recipient\s+of\s+the|recognized\s+as\s+the\s+best)\b/i,
    name: 'Award / Recognition Claim',
    gatingReason: 'Award claims require the exact awarding body, year, and category verification.',
    suggestedReplacement: 'Specify the exact award name and year if verified, or omit until confirmed.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
    requireSourceReference: true,
  },
  // 6. Certifications & Accreditations
  {
    type: 'certification',
    regex: /\b(iso\s*\d+|board\s*certified|nabh\s*accredited|jci\s*accredited|certified\s+by|accredited\s+by)\b/i,
    name: 'Certification / Accreditation Badge',
    gatingReason: 'Formal regulatory, ISO, or healthcare accreditations require valid registration license numbers.',
    suggestedReplacement: 'List verified credentials with official registration identifiers.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
  },
  // 7. Staff Credentials & Qualifications
  {
    type: 'credential',
    regex: /\b(ph\.?d|m\.?d|fellow\s+of|board-certified\s+specialist|licensed\s+practitioner)\b/i,
    name: 'Staff Professional Credential',
    gatingReason: 'Practitioner degrees and board specializations require professional directory confirmation.',
    suggestedReplacement: 'Display verified clinician/professional titles as registered.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
  },
  // 8. Experience & Tenure Claims
  {
    type: 'experience',
    regex: /\b(\d+\+?\s*years(\s+of)?\s*(experience|excellence|serving|practice)|established\s+in\s+\d{4}|since\s+\d{4}|decades\s+of\s+experience)\b/i,
    name: 'Tenure / Experience Claim',
    gatingReason: 'Years of operation or founding year require business registry or incorporation document verification.',
    suggestedReplacement: 'Confirm founding year or mention sustained commitment to the domain.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
  },
  // 9. Pricing Claims
  {
    type: 'pricing',
    regex: /\b(lowest\s*price|cheapest\s*rates?|starts?\s*at\s*[₹$€£]\s*\d+|unbeatable\s*pricing)\b/i,
    name: 'Pricing Superiority Claim',
    gatingReason: 'Pricing and lowest-rate claims require a verified published rate schedule and comparative audit.',
    suggestedReplacement: 'Highlight transparent pricing guidance rather than unsubstantiated lowest-price claims.',
    allowedEvidenceSources: ['document', 'third_party_verified'],
  },
]

/**
 * Checks if a specific claim or pattern is substantiated by the supplied verified evidence.
 */
export function findSupportingEvidence(
  claimText: string,
  suppliedEvidence: WebsiteEvidence[] = [],
  options?: {
    allowedSources?: Array<WebsiteEvidence['source']>
    requireSourceReference?: boolean
    validate?: (evidence: WebsiteEvidence) => boolean
  }
): WebsiteEvidence | undefined {
  const normalizedClaim = claimText.toLowerCase().trim()
  if (!normalizedClaim || normalizedClaim.length < 2) return undefined

  return suppliedEvidence.find((ev) => {
    // 1. Source verification filter
    if (options?.allowedSources && !options.allowedSources.includes(ev.source)) {
      return false
    }

    // 2. Source reference check
    if (
      options?.requireSourceReference &&
      (!ev.source_reference || ev.source_reference.trim().length === 0)
    ) {
      return false
    }

    // 3. Custom validator if provided
    if (options?.validate) {
      return options.validate(ev)
    }

    // 4. Normalized text containment matching
    const normFact = ev.fact.toLowerCase().trim()
    const normRaw = ev.raw_text?.toLowerCase().trim() || ''

    const minMatchLength = 2
    const matchFact =
      (normFact.length >= minMatchLength && normalizedClaim.includes(normFact)) ||
      (normalizedClaim.length >= minMatchLength && normFact.includes(normalizedClaim))
    const matchRaw =
      normRaw.length > 0 &&
      ((normRaw.length >= minMatchLength && normalizedClaim.includes(normRaw)) ||
        (normalizedClaim.length >= minMatchLength && normRaw.includes(normalizedClaim)))

    return matchFact || matchRaw
  })
}

/**
 * Audits a single statement or headline against the Claim Guard rules.
 */
export function auditSingleClaim(
  text: string,
  suppliedEvidence: WebsiteEvidence[] = []
): WebsiteClaim {
  const trimmed = text.trim()

  for (const rule of CLAIM_RULES) {
    const match = trimmed.match(rule.regex)
    if (match) {
      const pattern = (match[1] || match[0]).trim()
      const supportingEvidence = findSupportingEvidence(pattern, suppliedEvidence, {
        allowedSources: rule.allowedEvidenceSources,
        requireSourceReference: rule.requireSourceReference,
        validate: rule.validateEvidence
          ? (ev) => rule.validateEvidence!(ev, trimmed, pattern)
          : undefined,
      })

      if (supportingEvidence) {
        return {
          id: `claim-${Math.random().toString(36).substring(2, 9)}`,
          text: trimmed,
          claim_type: rule.type,
          status: 'VERIFIED_FACT',
          source_reference: supportingEvidence.source_reference || supportingEvidence.source,
          is_gated: false,
          detected_pattern: pattern,
        }
      }

      // Unsupported claim must be gated and marked UNKNOWN
      return {
        id: `claim-${Math.random().toString(36).substring(2, 9)}`,
        text: trimmed,
        claim_type: rule.type,
        status: 'UNKNOWN',
        is_gated: true,
        gating_reason: rule.gatingReason,
        detected_pattern: pattern,
        replacement_suggestion: rule.suggestedReplacement,
      }
    }
  }

  // Objectively verifiable factual statements & general observations
  const factualEvidence = findSupportingEvidence(trimmed, suppliedEvidence)
  if (factualEvidence) {
    return {
      id: `claim-${Math.random().toString(36).substring(2, 9)}`,
      text: trimmed,
      claim_type: 'general',
      status: 'VERIFIED_FACT',
      source_reference: factualEvidence.source_reference || factualEvidence.source,
      is_gated: false,
    }
  }

  return {
    id: `claim-${Math.random().toString(36).substring(2, 9)}`,
    text: trimmed,
    claim_type: 'general',
    status: 'OBSERVATION',
    is_gated: false,
  }
}

/**
 * Scans an array of texts, sentences, or paragraphs, isolating all claims that require gating or evidence.
 */
export function scanClaims(
  texts: string[],
  suppliedEvidence: WebsiteEvidence[] = []
): WebsiteClaim[] {
  const claims: WebsiteClaim[] = []

  for (const block of texts) {
    if (!block || typeof block !== 'string') continue

    // Break paragraphs into sentences
    const sentences = block
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4)

    for (const sentence of sentences) {
      const claim = auditSingleClaim(sentence, suppliedEvidence)
      // Only record sensitive claims or verified factual evidence
      if (claim.claim_type !== 'general' || claim.is_gated || claim.status === 'VERIFIED_FACT') {
        claims.push(claim)
      }
    }
  }

  return claims
}

/**
 * Evaluates whether proposed copy contains unverified claims.
 * If unverified claims exist, gates them with replacement placeholders.
 */
export function sanitizeProposedCopy(
  proposedCopy: string,
  suppliedEvidence: WebsiteEvidence[] = []
): {
  sanitizedCopy: string
  gatedClaims: WebsiteClaim[]
  verifiedClaims: WebsiteClaim[]
} {
  const sentences = proposedCopy
    .split(/([.!?\n]+)/)
    .filter((s) => s.length > 0)

  const gatedClaims: WebsiteClaim[] = []
  const verifiedClaims: WebsiteClaim[] = []
  let sanitizedCopy = ''

  for (let i = 0; i < sentences.length; i++) {
    const chunk = sentences[i]
    if (/^[.!?\n\s]+$/.test(chunk)) {
      sanitizedCopy += chunk
      continue
    }

    const claim = auditSingleClaim(chunk, suppliedEvidence)

    if (claim.is_gated) {
      gatedClaims.push(claim)
      // Safely replace unverified superlative/guarantee with placeholder or moderated language
      const safeReplacement = claim.replacement_suggestion
        ? `[GATED CLAIM: ${claim.detected_pattern} — Requires Customer Evidence]`
        : chunk
      sanitizedCopy += safeReplacement
    } else {
      if (claim.status === 'VERIFIED_FACT') {
        verifiedClaims.push(claim)
      }
      sanitizedCopy += chunk
    }
  }

  return {
    sanitizedCopy,
    gatedClaims,
    verifiedClaims,
  }
}

/**
 * Validates that an evidence item meets verification standards.
 */
export function validateEvidenceItem(item: Partial<WebsiteEvidence>): WebsiteEvidence | null {
  if (!item || !item.fact || typeof item.fact !== 'string' || item.fact.trim().length < 3) {
    return null
  }

  return {
    id: item.id || `ev-${Math.random().toString(36).substring(2, 9)}`,
    fact: item.fact.trim(),
    source: item.source || 'user_input',
    source_reference: item.source_reference?.trim(),
    verified_at: item.verified_at || new Date().toISOString(),
    raw_text: item.raw_text?.trim(),
  }
}
