/**
 * Grovaitech AI Platform
 * tests/unit/website-upgrade.test.ts
 *
 * Comprehensive Unit Test Suite for the GOVA Website Upgrade Employee.
 * Verifies Claim Guard, Evidence Status, 15-Point Audit, Revenue Leak Model,
 * Canonical Strategy Mapping, Preview Generation, Business Agnosticism,
 * and Deployment Handoff Integrity.
 */

import { describe, it, expect } from 'vitest'
import {
  auditSingleClaim,
  scanClaims,
  sanitizeProposedCopy,
  executeWebsiteAudit,
  analyzeWebsiteRevenueLeaks,
  generateWebsiteStrategy,
  generateUIUXPlan,
  generatePreviewPlan,
  analyzeWebsiteForUpgrade,
  resolveAIOpportunities,
  isHealthcareRecommendationSafe,
  type WebsiteUpgradeInput,
  type WebsiteEvidence,
} from '@/lib/website-upgrade'
import { CANONICAL_EMPLOYEES } from '@/lib/employees/registry'

describe('GOVA Website Upgrade Employee Domain', () => {
  // ─── 1. CLAIM GUARD & UNSUPPORTED CLAIM GATING ─────────────────────────────
  describe('1. Claim Guard & Unsupported Claim Gating', () => {
    it('detects and gates unsupported superlatives when no evidence is supplied', () => {
      const claim1 = auditSingleClaim('We are the best dental clinic in the region.')
      expect(claim1.claim_type).toBe('superlative')
      expect(claim1.is_gated).toBe(true)
      expect(claim1.status).toBe('UNKNOWN')
      expect(claim1.gating_reason).toContain('Superlative claims must be corroborated')
      expect(claim1.replacement_suggestion).toBeDefined()

      const claim2 = auditSingleClaim('We are the #1 real estate brokerage in town.')
      expect(claim2.claim_type).toBe('superlative')
      expect(claim2.is_gated).toBe(true)
      expect(claim2.status).toBe('UNKNOWN')
    })

    it('detects and gates unverified numerical metrics and revenue claims', () => {
      const claim = auditSingleClaim('Trusted by over 10,000 customers with 95% conversion rate.')
      expect(claim.claim_type).toBe('numerical_metric')
      expect(claim.is_gated).toBe(true)
      expect(claim.status).toBe('UNKNOWN')
      expect(claim.gating_reason).toContain('Quantitative customer counts')
    })

    it('detects and gates binding guarantees and medical outcome claims', () => {
      const claimGuarantee = auditSingleClaim('100% money-back guarantee on all treatments.')
      expect(claimGuarantee.claim_type).toBe('guarantee')
      expect(claimGuarantee.is_gated).toBe(true)

      const claimMedical = auditSingleClaim('Guaranteed 100% painless root canal treatment.')
      expect(claimMedical.claim_type).toBe('medical_outcome')
      expect(claimMedical.is_gated).toBe(true)
      expect(claimMedical.gating_reason).toContain('Medical outcome assurances')
    })

    it('validates and un-gates claims when corroborated by explicit verified evidence', () => {
      const evidence: WebsiteEvidence[] = [
        {
          id: 'ev-1',
          fact: 'ISO 9001 certified clinic with board-certified specialists',
          source: 'document',
          source_reference: 'Cert #9821-A',
        },
      ]

      const claim = auditSingleClaim('ISO 9001 certified facility.', evidence)
      expect(claim.claim_type).toBe('certification')
      expect(claim.is_gated).toBe(false)
      expect(claim.status).toBe('VERIFIED_FACT')
      expect(claim.source_reference).toBe('Cert #9821-A')
    })

    it('sanitizes proposed copy by isolating gated claims and inserting placeholders', () => {
      const copy = 'We are the #1 leading provider. We offer comprehensive customer consultations.'
      const { sanitizedCopy, gatedClaims } = sanitizeProposedCopy(copy)

      expect(gatedClaims.length).toBeGreaterThan(0)
      expect(sanitizedCopy).toContain('[GATED CLAIM:')
      expect(sanitizedCopy).toContain('We offer comprehensive customer consultations')
    })
  })

  // ─── 2. EVIDENCE STATUS INTEGRITY ──────────────────────────────────────────
  describe('2. Evidence Status Integrity', () => {
    it('never silently converts inferences or assumptions into verified facts', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Metro Legal Partners',
        industry: 'Legal Services',
        current_description: 'We handle civil litigation and corporate compliance.',
      }

      const result = analyzeWebsiteForUpgrade(input)

      // Verified facts should only exist if explicitly supplied
      const verifiedClaims = result.intelligence.claims_analyzed.filter(
        (c) => c.status === 'VERIFIED_FACT'
      )
      expect(verifiedClaims.length).toBe(0)

      // Audit findings should be OBSERVATION or INFERENCE, never VERIFIED_FACT without external proof
      const factFindings = result.audit_findings.filter(
        (f) => f.evidence_status === 'VERIFIED_FACT'
      )
      expect(factFindings.length).toBe(0)

      // Strategy value prop should be marked as proposed copy
      expect(result.strategy.value_proposition.status).toBe('PROPOSED_COPY')
    })
  })

  // ─── 3. SEVERITY & PRIORITY CALCULATION ────────────────────────────────────
  describe('3. Audit Severity & Priority Rules', () => {
    it('does not label conversion optimizations as P0 (P0 reserved for broken/inaccessible/unsafe)', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Apex Plumbing',
        industry: 'Home Services',
        current_description: 'Fast plumbing services.',
      }

      const result = analyzeWebsiteForUpgrade(input)

      // Assert zero P0 findings exist purely from conversion or copy improvements
      const p0Findings = result.audit_findings.filter((f) => f.priority === 'P0')
      expect(p0Findings.length).toBe(0)

      // High-impact conversion issues (like missing contact or unverified claims) must be P1
      const p1Findings = result.audit_findings.filter((f) => f.priority === 'P1')
      expect(p1Findings.length).toBeGreaterThan(0)

      // Accessibility specification is an implementation target, not P0
      const a11yFinding = result.audit_findings.find((f) => f.category === 'ACCESSIBILITY')
      expect(a11yFinding).toBeDefined()
      expect(a11yFinding?.priority).toBe('P2')
      expect(a11yFinding?.uncertainty).toContain('implementation target until live automated')
    })
  })

  // ─── 4. REVENUE LEAK MODEL ─────────────────────────────────────────────────
  describe('4. Revenue Leak Model Structure & Non-Fabricated Language', () => {
    it('covers the 8 stages of the customer journey with truthful impact phrasing', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Elevate Realty',
        industry: 'Real Estate',
        current_description: 'Luxury residential villas and apartments.',
        known_problems: ['Slow lead response', 'Missed leads after hours'],
      }

      const leaks = analyzeWebsiteRevenueLeaks(input, [])

      expect(leaks.length).toBe(8)

      const expectedStages = [
        'TRAFFIC_TO_LANDING',
        'LANDING_TO_UNDERSTANDING',
        'UNDERSTANDING_TO_TRUST',
        'TRUST_TO_SERVICE_DISCOVERY',
        'SERVICE_DISCOVERY_TO_CTA',
        'CTA_TO_LEAD',
        'LEAD_TO_FOLLOWUP',
        'FOLLOWUP_TO_ACTION',
      ]

      leaks.forEach((leak, idx) => {
        expect(leak.stage).toBe(expectedStages[idx])
        expect(leak.impact_language).toBeDefined()

        // Strict rule: No fabricated revenue figures (₹, $, or specific loss amounts)
        expect(leak.impact_language).not.toMatch(/[₹$€£]\s*\d+/)
        expect(leak.impact_language).not.toMatch(/loses\s+\d+/i)

        // Must contain truthful friction/risk language
        const lowerImpact = leak.impact_language.toLowerCase()
        const validPhrasing =
          lowerImpact.includes('may reduce contact opportunities') ||
          lowerImpact.includes('creates friction') ||
          lowerImpact.includes('proof is not visible') ||
          lowerImpact.includes('cta requires additional navigation')
        expect(validPhrasing).toBe(true)
      })
    })
  })

  // ─── 5. STRATEGY & CANONICAL AI WORKFORCE INTEGRATION ──────────────────────
  describe('5. Strategy & Canonical AI Workforce Mapping', () => {
    it('maps opportunities strictly to existing canonical employees and workflows', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Dharmas Dental Clinic',
        industry: 'Healthcare & Dental',
        current_description: 'Comprehensive restorative dentistry and smile design.',
        known_problems: ['Delayed WhatsApp replies', 'Receptionist busy with calls'],
      }

      const leaks = analyzeWebsiteRevenueLeaks(input, [])
      const opportunities = resolveAIOpportunities(input, leaks)

      expect(opportunities.length).toBeGreaterThan(0)

      // Must include clinic-receptionist
      const clinicAgent = opportunities.find((o) => o.employee_slug === 'clinic-receptionist')
      expect(clinicAgent).toBeDefined()
      expect(clinicAgent?.department).toBe('Operations')

      // Must include whatsapp-lead-agent due to WhatsApp problem
      const whatsappAgent = opportunities.find((o) => o.employee_slug === 'whatsapp-lead-agent')
      expect(whatsappAgent).toBeDefined()

      // Verify every mapped employee exists in CANONICAL_EMPLOYEES
      opportunities.forEach((opp) => {
        const canonical = CANONICAL_EMPLOYEES.find((e) => e.slug === opp.employee_slug)
        expect(canonical).toBeDefined()
        expect(opp.employee_id).toBe(canonical?.id)
        expect(opp.workflow_id).toBeDefined()
      })
    })
  })

  // ─── 6. PREVIEW GENERATION & COPY MANIFEST ─────────────────────────────────
  describe('6. Preview Generation & Copy Manifest', () => {
    it('generates a preview plan with explicit VERIFIED, PROPOSED, and MISSING labels', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Zenith Accounting',
        industry: 'Financial Advisory',
        raw_site_text: 'We are the #1 tax accountants with 100% money back guarantee.',
        supplied_evidence: [
          {
            id: 'ev-1',
            fact: 'Certified Public Accountants registered with ICAI',
            source: 'document',
          },
        ],
      }

      const result = analyzeWebsiteForUpgrade(input)
      const preview = result.preview_plan

      expect(preview.pages.length).toBeGreaterThanOrEqual(3)
      expect(preview.copy_manifest.length).toBeGreaterThan(0)

      const manifestStatuses = new Set(preview.copy_manifest.map((c) => c.status))
      expect(manifestStatuses.has('PROPOSED')).toBe(true)
      expect(manifestStatuses.has('MISSING')).toBe(true)

      // Gated claims must be listed in preview
      expect(preview.gated_claims.length).toBeGreaterThanOrEqual(1)
      expect(preview.required_customer_inputs.length).toBeGreaterThan(0)
    })
  })

  // ─── 7. BUSINESS-AGNOSTIC ADAPTABILITY ─────────────────────────────────────
  describe('7. Business-Agnostic Adaptability', () => {
    const testCases: Array<{ name: string; industry: string; expectedSlug: string }> = [
      {
        name: 'Blue River Realty',
        industry: 'Real Estate',
        expectedSlug: 'real-estate-lead-receptionist',
      },
      {
        name: 'Harmony Dental Care',
        industry: 'Dental Care',
        expectedSlug: 'clinic-receptionist',
      },
      {
        name: 'Vanguard Legal Defense',
        industry: 'Legal Practice',
        expectedSlug: 'legal-intake-agent',
      },
      {
        name: 'Arctic Air Solutions',
        industry: 'HVAC Contractor',
        expectedSlug: 'hvac-lead-recovery',
      },
    ]

    testCases.forEach(({ name, industry, expectedSlug }) => {
      it(`analyzes ${name} in ${industry} without cross-tenant bleed`, () => {
        const input: WebsiteUpgradeInput = {
          business_name: name,
          industry,
          current_description: `Quality ${industry} operations.`,
        }

        const result = analyzeWebsiteForUpgrade(input)

        expect(result.input.business_name).toBe(name)
        expect(result.deployment_handoff.prospect.company_name).toBe(name)
        expect(result.deployment_handoff.primary_employee_slug).toBe(expectedSlug)
        expect(result.strategy.homepage_structure.length).toBeGreaterThan(5)
      })
    })
  })

  // ─── 8. DEPLOYMENT ENGINE HANDOFF INTEGRITY ────────────────────────────────
  describe('8. Deployment Engine Handoff Integrity', () => {
    it('creates a compliant handoff payload matching Deployment Engine Prospect shape', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Solace Spa Retreat',
        industry: 'Beauty & Wellness',
        contact_name: 'Elena Rostova',
        contact_phone: '+91 9988776655',
        contact_email: 'elena@solacespa.com',
        location: 'Goa, India',
        budget: 'Custom Plan',
        timeline: '15 Days',
      }

      const result = analyzeWebsiteForUpgrade(input)
      const handoff = result.deployment_handoff

      expect(handoff.approval_status).toBe('PENDING_APPROVAL')
      expect(handoff.prospect.company_name).toBe('Solace Spa Retreat')
      expect(handoff.prospect.phone).toBe('+91 9988776655')
      expect(handoff.crm_readiness.ready_for_lead_creation).toBe(true)
      expect(handoff.crm_readiness.missing_fields.length).toBe(0)
    })

    it('identifies missing CRM qualification fields when intake is incomplete', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Incomplete Intake Co',
        industry: 'Technology',
      }

      const result = analyzeWebsiteForUpgrade(input)
      const handoff = result.deployment_handoff

      expect(handoff.crm_readiness.ready_for_lead_creation).toBe(false)
      expect(handoff.crm_readiness.missing_fields).toContain('name')
      expect(handoff.crm_readiness.missing_fields).toContain('phone')
      expect(handoff.crm_readiness.missing_fields).toContain('location')
    })
  })

  // ─── 9. SECRET ISOLATION & DATA LEAKAGE PREVENTION ─────────────────────────
  describe('9. Secret Isolation & Zero Data Leakage', () => {
    it('ensures no execution secrets, database passwords, or prompt keys exist in output', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Secure Enterprise Systems',
        industry: 'Technology',
        current_description: 'Cloud infrastructure security.',
      }

      const result = analyzeWebsiteForUpgrade(input)
      const serialized = JSON.stringify(result)

      // Strict test: client-facing output must not contain sensitive strings
      expect(serialized).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(serialized).not.toContain('GEMINI_API_KEY')
      expect(serialized).not.toContain('system_prompt')
      expect(serialized).not.toContain('DATABASE_URL')
    })
  })

  // ─── 10. INDUSTRY CONTEXT ISOLATION MATRIX ───────────────────────────────
  describe('10. Industry Context Isolation & Cross-Industry Leak Prevention Matrix', () => {
    const matrixCases: Array<{
      name: string
      industry: string
      description: string
      expectedFrontlineSlug: string
      rejectedTerms: string[]
    }> = [
      {
        name: 'Apex Dental Care',
        industry: 'Healthcare & Dental',
        description: 'Comprehensive restorative dentistry, dental implants, and cosmetic care.',
        expectedFrontlineSlug: 'clinic-receptionist',
        rejectedTerms: [
          'bhk',
          'site visit',
          'property budget',
          'property type',
          'real estate',
          'real estate lead',
          'get instant estimate',
        ],
      },
      {
        name: 'Prestige Living Properties',
        industry: 'Real Estate',
        description: 'Luxury apartments, penthouses, and gated community villas.',
        expectedFrontlineSlug: 'real-estate-lead-receptionist',
        rejectedTerms: [
          'patient',
          'treatment',
          'dental implant',
          'root canal',
          'clinic receptionist',
        ],
      },
      {
        name: 'Bella Cucina Bistro',
        industry: 'Restaurant',
        description: 'Artisanal Italian dining, private events, and chef table reservations.',
        expectedFrontlineSlug: 'customer-support-agent',
        rejectedTerms: [
          'property budget',
          'patient',
          'dental treatment',
          'bhk',
          'site visit',
          'dental implant',
          'root canal',
        ],
      },
      {
        name: 'Glow Aesthetics & Spa',
        industry: 'Salon',
        description: 'Luxury hair styling, organic skincare, and therapeutic massage treatments.',
        expectedFrontlineSlug: 'salon-spa-receptionist',
        rejectedTerms: [
          'property budget',
          'bhk',
          'site visit',
          'dental implant',
          'root canal',
          'real estate',
        ],
      },
      {
        name: 'Sterling Legal Advisors',
        industry: 'Law Firm',
        description: 'Corporate law, contract litigation, and intellectual property compliance.',
        expectedFrontlineSlug: 'legal-intake-agent',
        rejectedTerms: [
          'bhk',
          'site visit',
          'property budget',
          'dental implant',
          'root canal',
          'haircut',
          'real estate',
        ],
      },
      {
        name: 'All-Pro Heating & Air',
        industry: 'Home Services',
        description: 'Emergency HVAC maintenance, air conditioning repairs, and furnace service.',
        expectedFrontlineSlug: 'hvac-lead-recovery',
        rejectedTerms: [
          'patient',
          'dental treatment',
          'bhk',
          'court appearance',
          'dental implant',
          'root canal',
        ],
      },
    ]

    matrixCases.forEach(({ name, industry, description, expectedFrontlineSlug, rejectedTerms }) => {
      it(`enforces strict terminology and workforce isolation for ${industry}`, () => {
        const input: WebsiteUpgradeInput = {
          business_name: name,
          industry,
          current_description: description,
          known_problems: ['Delayed WhatsApp replies', 'After-hours inquiries missed'],
        }

        const result = analyzeWebsiteForUpgrade(input)

        // Frontline employee must match expected role
        const frontline = result.strategy.ai_employee_opportunities[0]
        expect(frontline.employee_slug).toBe(expectedFrontlineSlug)

        // Compile all generated copy and recommendations
        const aggregatedText = [
          JSON.stringify(result.audit_findings),
          JSON.stringify(result.revenue_leaks),
          JSON.stringify(result.strategy.ai_employee_opportunities),
          JSON.stringify(result.strategy.value_proposition),
          JSON.stringify(result.strategy.conversion_journey_steps),
          JSON.stringify(result.preview_plan.copy_manifest),
          result.strategy.primary_cta.label,
          result.strategy.secondary_cta.label,
        ]
          .join(' ')
          .toLowerCase()

        // Verify that NO prohibited terms from other industries appear
        rejectedTerms.forEach((forbiddenTerm) => {
          const lowerTerm = forbiddenTerm.toLowerCase()
          const containsForbidden = aggregatedText.includes(lowerTerm)
          if (containsForbidden) {
            console.error(
              `[Isolation Failure] Industry "${industry}" contains forbidden term: "${forbiddenTerm}"`
            )
          }
          expect(containsForbidden).toBe(false)
        })
      })
    })
  })

  // ─── 11. DHARMAS DENTAL SPECIFIC QUALITY & ISOLATION REGRESSION TEST ──────
  describe('11. Dharmas Dental Specific Quality & Isolation Regression Test', () => {
    it('generates strictly healthcare-aware recommendations for Dharmas Dental without real-estate contamination', () => {
      const input: WebsiteUpgradeInput = {
        business_name: 'Dharmas Dental',
        industry: 'Healthcare & Dental',
        url: 'https://dharmasdental.com/',
        current_description:
          'Dharmas Dental provides comprehensive dental care including preventive treatments, cosmetic dentistry, and dental implants.',
        current_services: ['Teeth Whitening', 'Dental Implants', 'Orthodontic Aligners', 'General Consultation'],
        known_problems: ['Inbound WhatsApp messages delayed', 'Missed appointment inquiries outside clinic hours'],
        location: 'Bengaluru, Karnataka',
      }

      const result = analyzeWebsiteForUpgrade(input)

      // 1. Verify Matched AI Employees
      const matchedSlugs = result.strategy.ai_employee_opportunities.map((o) => o.employee_slug)

      // Clinic Receptionist must be the primary frontline employee
      expect(matchedSlugs[0]).toBe('clinic-receptionist')
      expect(result.strategy.ai_employee_opportunities[0].workflow_name).toBe(
        'Clinic Appointment Booking & Reminder Pipeline'
      )

      // WhatsApp Lead Agent should be matched due to WhatsApp problem, with healthcare-safe workflow
      const whatsappOpp = result.strategy.ai_employee_opportunities.find(
        (o) => o.employee_slug === 'whatsapp-lead-agent'
      )
      expect(whatsappOpp).toBeDefined()
      expect(whatsappOpp?.workflow_name).toBe(
        'Patient Inquiry ➔ WhatsApp Conversation ➔ Appointment Coordination'
      )
      expect(whatsappOpp?.workflow_name).not.toContain('Real Estate')
      expect(whatsappOpp?.workflow_name).not.toContain('Site Visit')

      // GBP Growth Manager should be matched due to location signal
      const gbpOpp = result.strategy.ai_employee_opportunities.find(
        (o) => o.employee_slug === 'gbp-growth-manager'
      )
      expect(gbpOpp).toBeDefined()
      expect(gbpOpp?.workflow_name).not.toContain('Real Estate')
      expect(gbpOpp?.workflow_name).not.toContain('Site Visit')

      // 2. Deployment handoff must assign Clinic Receptionist
      expect(result.deployment_handoff.primary_employee_slug).toBe('clinic-receptionist')
      expect(result.deployment_handoff.assigned_workflow_id).toBe('wf-002')

      // 3. CTA must be booking-oriented, never "Get Instant Estimate"
      expect(result.strategy.primary_cta.label).toBe('Book Consultation')
      expect(result.strategy.primary_cta.action_type).toBe('booking')

      // 4. Strict Rejection of Real-Estate Domain Terminology
      const allText = [
        JSON.stringify(result.audit_findings),
        JSON.stringify(result.revenue_leaks),
        JSON.stringify(result.strategy),
        JSON.stringify(result.preview_plan),
      ]
        .join(' ')
        .toLowerCase()

      const strictlyForbiddenTerms = [
        'real estate',
        'site visit',
        'bhk',
        'property budget',
        'property type',
        'real estate lead',
        'get instant estimate',
        'get price estimate',
      ]

      strictlyForbiddenTerms.forEach((term) => {
        expect(allText.includes(term.toLowerCase())).toBe(false)
      })
    })
  })

  // ─── 12. HEALTHCARE CLINICAL SAFETY & ADMINISTRATIVE SCOPE PASS ─────────────
  describe('12. Healthcare Clinical Safety & Administrative Scope Enforcement', () => {
    const dentalInput: WebsiteUpgradeInput = {
      business_name: 'Dharmas Dental Care',
      industry: 'Healthcare & Dental',
      url: 'https://dharmasdental.com/',
      current_description:
        'Dharmas Dental provides comprehensive dental care and routine preventive checkups.',
      current_services: ['Teeth Cleaning', 'Cavity Filling', 'Root Canal Consultation', 'Orthodontic Assessment'],
      known_problems: [
        'Patients message asking about toothache symptoms and severe gum swelling at night',
        'Front desk delayed in responding to emergency pain questions',
      ],
      location: 'Bengaluru, Karnataka',
    }

    const upgradeResult = analyzeWebsiteForUpgrade(dentalInput)

    const allRecommendations = [
      ...upgradeResult.audit_findings.map((f) => f.recommendation),
      ...upgradeResult.revenue_leaks.map((l) => l.recommended_fix),
      ...upgradeResult.revenue_leaks.map((l) => l.impact_language),
      ...upgradeResult.strategy.ai_employee_opportunities.map((o) => o.matched_need),
      ...upgradeResult.strategy.ai_employee_opportunities.map((o) => o.workflow_name),
      upgradeResult.strategy.customer_intent,
      upgradeResult.strategy.primary_website_objective,
      upgradeResult.strategy.value_proposition.headline,
      upgradeResult.strategy.value_proposition.subheadline,
      ...upgradeResult.preview_plan.copy_manifest.map((c) => c.content),
    ].filter(Boolean) as string[]
    const concatenatedCopy = allRecommendations.join(' ')

    it('confirms no medical diagnostic recommendation is generated', () => {
      expect(concatenatedCopy).not.toMatch(/\bdiagnos(e|ing|is)\b/i)
      expect(concatenatedCopy).not.toMatch(/\bmedical diagnosis\b/i)
      expect(concatenatedCopy).not.toMatch(/\bdiagnose symptoms\b/i)
    })

    it('confirms no treatment recommendation or prescribing language is generated', () => {
      expect(concatenatedCopy).not.toMatch(/\brecommend(ing)?\s+treatment\b/i)
      expect(concatenatedCopy).not.toMatch(/\bprescribe\s+treatment\b/i)
      expect(concatenatedCopy).not.toMatch(/\btreatment\s+recommendation\b/i)
      expect(concatenatedCopy).not.toMatch(/\btreatment\s+suitability\b/i)
    })

    it('confirms no clinical triage or medical severity assessment language is generated', () => {
      expect(concatenatedCopy).not.toMatch(/\bclinical\s+triage\b/i)
      expect(concatenatedCopy).not.toMatch(/\bassess(ing)?\s+(medical\s+|clinical\s+)?severity\b/i)
      expect(concatenatedCopy).not.toMatch(/\bdetermine\s+clinical\s+urgency\b/i)
      expect(concatenatedCopy).not.toMatch(/\bmedical\s+eligibility\s+decision\b/i)
    })

    it('confirms administrative appointment coordination dimensions remain fully supported', () => {
      // Must contain administrative appointment coordination concepts
      const lower = concatenatedCopy.toLowerCase()
      expect(
        lower.includes('appointment purpose') ||
        lower.includes('preferred appointment timing') ||
        lower.includes('contact details') ||
        lower.includes('communication preference') ||
        lower.includes('clinic information')
      ).toBe(true)

      // Verified Clinic Receptionist deployment handoff
      expect(upgradeResult.deployment_handoff.primary_employee_slug).toBe('clinic-receptionist')
      expect(upgradeResult.deployment_handoff.assigned_workflow_id).toBe('wf-002')
    })

    it('confirms routing of clinical questions to qualified clinic staff when symptoms arise', () => {
      // Must recommend routing clinical questions to the clinic's qualified team
      const lower = concatenatedCopy.toLowerCase()
      expect(
        lower.includes("route clinical questions directly to the clinic's qualified team") ||
        lower.includes("route the clinical question to the clinic's qualified team") ||
        lower.includes("routes clinical questions to the clinic's qualified team")
      ).toBe(true)
    })

    it('passes the automated isHealthcareRecommendationSafe compliance validator', () => {
      allRecommendations.forEach((rec) => {
        const check = isHealthcareRecommendationSafe(rec)
        if (!check.isSafe) {
          console.error(`Safety violation in text: "${rec}" ->`, check.violations)
        }
        expect(check.isSafe).toBe(true)
      })
    })
  })
})

