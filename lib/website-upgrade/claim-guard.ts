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

interface ClaimPatternRule {
  type: WebsiteClaimType
  regex: RegExp
  name: string
  gatingReason: string
  suggestedReplacement?: string
}

export const CLAIM_RULES: ClaimPatternRule[] = [
  // 1. Superlatives
  {
    type: 'superlative',
    regex: /(?:^|\W)(best|#1|no\.?\s*1|number\s+one|leading|cheapest|most\s+trusted|premier|world[\s-]class|top[\s-]rated|unmatched|unrivaled|greatest)(?=\W|$)/i,
    name: 'Superlative Claim',
    gatingReason: 'Superlative claims must be corroborated by independent ranking, third-party citation, or verified market audit.',
    suggestedReplacement: 'Use descriptive value propositions highlighting specific capabilities instead of unverified superlatives.',
  },
  // 2. Numerical Metrics & Revenue Figures
  {
    type: 'numerical_metric',
    regex: /\b(\d+[\d,]*\+?\s*(customers|clients|users|patients|subscribers|cases|projects)|[₹$€£]\s*[\d,.]+\s*(lakh|cr|crore|k|m|million|billion)?|(\d+(\.\d+)?%)\s*(conversion|success|increase|roi|growth))\b/i,
    name: 'Numerical Metric or Conversion Figure',
    gatingReason: 'Quantitative customer counts, revenues, and conversion rates require documented analytics or financial evidence.',
    suggestedReplacement: 'Focus on qualitative benefits or mark quantitative figures as requiring client data sign-off.',
  },
  // 3. Medical Outcomes & Absolute Claims
  {
    type: 'medical_outcome',
    regex: /\b(100%\s*painless|cure[sd]?|zero\s*side[\s-]effects?|guaranteed\s*healing|permanent\s*cure)\b/i,
    name: 'Medical / Clinical Outcome Claim',
    gatingReason: 'Medical outcome assurances violate clinical advertising guidelines without formal clinical trial evidence.',
    suggestedReplacement: 'Emphasize patient comfort protocols, thorough consultation, and individualized care.',
  },
  // 4. Guarantees
  {
    type: 'guarantee',
    regex: /\b(guarantee[ds]?|100%\s*guaranteed?|money[\s-]back\s*guarantee|risk[\s-]free|guaranteed\s*results?)\b/i,
    name: 'Performance or Legal Guarantee',
    gatingReason: 'Legal or financial outcome guarantees create liability without an explicit signed client guarantee terms sheet.',
    suggestedReplacement: 'Describe process rigor and satisfaction commitments without binding guarantees.',
  },
  // 5. Awards & Recognitions
  {
    type: 'award',
    regex: /\b(award[\s-]winning|voted\s*(best|#1)|winner\s+of|recipient\s+of\s+the|recognized\s+as\s+the\s+best)\b/i,
    name: 'Award / Recognition Claim',
    gatingReason: 'Award claims require the exact awarding body, year, and category verification.',
    suggestedReplacement: 'Specify the exact award name and year if verified, or omit until confirmed.',
  },
  // 6. Certifications & Accreditations
  {
    type: 'certification',
    regex: /\b(iso\s*\d+|board\s*certified|nabh\s*accredited|jci\s*accredited|certified\s+by|accredited\s+by)\b/i,
    name: 'Certification / Accreditation Badge',
    gatingReason: 'Formal regulatory, ISO, or healthcare accreditations require valid registration license numbers.',
    suggestedReplacement: 'List verified credentials with official registration identifiers.',
  },
  // 7. Staff Credentials & Qualifications
  {
    type: 'credential',
    regex: /\b(ph\.?d|m\.?d|fellow\s+of|board-certified\s+specialist|licensed\s+practitioner)\b/i,
    name: 'Staff Professional Credential',
    gatingReason: 'Practitioner degrees and board specializations require professional directory confirmation.',
    suggestedReplacement: 'Display verified clinician/professional titles as registered.',
  },
  // 8. Experience & Tenure Claims
  {
    type: 'experience',
    regex: /\b(\d+\+?\s*years(\s+of)?\s*(experience|excellence|serving|practice)|established\s+in\s+\d{4}|since\s+\d{4}|decades\s+of\s+experience)\b/i,
    name: 'Tenure / Experience Claim',
    gatingReason: 'Years of operation or founding year require business registry or incorporation document verification.',
    suggestedReplacement: 'Confirm founding year or mention sustained commitment to the domain.',
  },
  // 9. Pricing Claims
  {
    type: 'pricing',
    regex: /\b(lowest\s*price|cheapest\s*rates?|starts?\s*at\s*[₹$€£]\s*\d+|unbeatable\s*pricing)\b/i,
    name: 'Pricing Superiority Claim',
    gatingReason: 'Pricing and lowest-rate claims require a verified published rate schedule and comparative audit.',
    suggestedReplacement: 'Highlight transparent pricing guidance rather than unsubstantiated lowest-price claims.',
  },
]

/**
 * Checks if a specific claim is substantiated by the supplied verified evidence.
 */
function findSupportingEvidence(
  claimText: string,
  suppliedEvidence: WebsiteEvidence[] = []
): WebsiteEvidence | undefined {
  const normalizedClaim = claimText.toLowerCase().trim()
  return suppliedEvidence.find((ev) => {
    const normFact = ev.fact.toLowerCase().trim()
    const normRaw = ev.raw_text?.toLowerCase().trim() || ''
    return (
      normFact.includes(normalizedClaim) ||
      normalizedClaim.includes(normFact) ||
      (normRaw.length > 0 && (normRaw.includes(normalizedClaim) || normalizedClaim.includes(normRaw)))
    )
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
      const supportingEvidence = findSupportingEvidence(pattern, suppliedEvidence)

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

  // General statement without sensitive claim patterns
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
      // Only record sensitive claims or general observations if relevant
      if (claim.claim_type !== 'general' || claim.is_gated) {
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
