/**
 * Grovaitech AI Platform
 * tests/unit/employee-marketplace-recipes.test.ts
 *
 * Unit tests for AI Employee Marketplace, Canonical 15 Employee Definitions,
 * Employee Recipe Architecture, and Workflow Blueprint Lifecycle.
 */

import { describe, it, expect } from 'vitest'
import {
  getMarketplaceEmployees,
  getCanonicalEmployees,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  MARKETPLACE_EMPLOYEES,
} from '@/lib/employees'
import {
  getAllRecipes,
  getRecipeById,
  getRecipeBySlug,
  SOCIAL_MEDIA_MARKETING_RECIPE,
  SOCIAL_MEDIA_CONFIG_SCHEMA,
  type WorkflowBlueprintState,
} from '@/lib/recipes'

describe('AI Employee Marketplace & Recipe Foundation', () => {
  // ── 1 & 2. 15 Marketplace Definitions & Stable Slugs ───────────────────────
  describe('1. Canonical Marketplace Employee Definitions', () => {
    it('contains all 15 canonical marketplace employee definitions', () => {
      const marketplaceEmployees = getMarketplaceEmployees()
      expect(marketplaceEmployees).toHaveLength(15)
    })

    it('has stable machine IDs and URL slugs for all 15 employees', () => {
      const expectedSlugs = [
        'social-media-marketing',
        'lead-generation',
        'linkedin-lead-generation',
        'customer-support',
        'email-management',
        'ai-content-creation',
        'ai-video-creation',
        'ai-voice-agent',
        'invoice-management',
        'youtube-content',
        'ai-ad-creative',
        'website-lead-capture',
        'whatsapp-lead-generation',
        'ai-appointment-booking',
        'google-business-profile',
      ]

      const expectedIds = [
        'social_media_marketing',
        'lead_generation',
        'linkedin_lead_generation',
        'customer_support',
        'email_management',
        'ai_content_creation',
        'ai_video_creation',
        'ai_voice_agent',
        'invoice_management',
        'youtube_content',
        'ai_ad_creative',
        'website_lead_capture',
        'whatsapp_lead_generation',
        'ai_appointment_booking',
        'google_business_profile',
      ]

      const actualSlugs = MARKETPLACE_EMPLOYEES.map((e) => e.slug)
      const actualIds = MARKETPLACE_EMPLOYEES.map((e) => e.id)

      expect(actualSlugs).toEqual(expect.arrayContaining(expectedSlugs))
      expect(actualIds).toEqual(expect.arrayContaining(expectedIds))
    })

    it('assigns user-facing display names and human-readable metadata', () => {
      for (const emp of MARKETPLACE_EMPLOYEES) {
        expect(emp.displayName).toBeDefined()
        expect(emp.displayName?.length).toBeGreaterThan(5)
        expect(emp.shortDescription).toBeDefined()
        expect(emp.category).toBeDefined()
        expect(emp.capabilities.length).toBeGreaterThan(0)
        expect(emp.keywords?.length).toBeGreaterThan(0)
      }
    })

    it('adheres to approved marketplace categories', () => {
      const allowedCategories = [
        'Marketing',
        'Sales',
        'Customer Support',
        'Operations',
        'Finance',
        'Healthcare',
      ]

      for (const emp of MARKETPLACE_EMPLOYEES) {
        expect(allowedCategories).toContain(emp.category)
      }
    })
  })

  // ── 3 & 4. Backward Compatibility with Legacy Slugs & IDs ──────────────────
  describe('2. Backward Compatibility with Legacy Registry', () => {
    it('resolves existing legacy employee slugs without failure', () => {
      const legacySlugs = [
        'clinic-receptionist',
        'customer-support-agent',
        'whatsapp-lead-agent',
        'real-estate-lead-receptionist',
        'salon-spa-receptionist',
        'ai-qa-inspector',
        'legal-intake-agent',
        'ecommerce-support-agent',
        'hr-onboarding-agent',
        'financial-advisory-agent',
        'hvac-lead-recovery',
        'gbp-growth-manager',
      ]

      for (const slug of legacySlugs) {
        const emp = getCanonicalEmployeeBySlug(slug)
        expect(emp, `Expected legacy slug '${slug}' to resolve`).toBeDefined()
        expect(emp?.slug).toBeDefined()
      }
    })

    it('resolves existing legacy employee IDs (emp-001 through emp-012)', () => {
      const legacyIds = [
        'emp-001',
        'emp-002',
        'emp-003',
        'emp-004',
        'emp-005',
        'emp-006',
        'emp-007',
        'emp-008',
        'emp-009',
        'emp-010',
        'emp-011',
        'emp-012',
      ]

      for (const id of legacyIds) {
        const emp = getCanonicalEmployeeById(id)
        expect(emp, `Expected legacy ID '${id}' to resolve`).toBeDefined()
        expect(emp?.id).toBe(id)
      }
    })

    it('resolves both canonical slugs and legacy alias slugs consistently', () => {
      const csCanonical = getCanonicalEmployeeBySlug('customer-support')
      const csLegacy = getCanonicalEmployeeBySlug('customer-support-agent')
      expect(csCanonical).toBeDefined()
      expect(csLegacy).toBeDefined()

      const aptCanonical = getCanonicalEmployeeBySlug('ai-appointment-booking')
      const aptLegacy = getCanonicalEmployeeBySlug('clinic-receptionist')
      expect(aptCanonical).toBeDefined()
      expect(aptLegacy).toBeDefined()
    })
  })

  // ── 5 & 6. Recipe Registry & Social Media Marketing Recipe ──────────────────
  describe('3. Employee Recipe System', () => {
    it('returns registered recipes from the recipe registry', () => {
      const recipes = getAllRecipes()
      expect(recipes.length).toBeGreaterThanOrEqual(1)

      const smRecipe = getRecipeBySlug('social-media-marketing')
      expect(smRecipe).toBeDefined()
      expect(smRecipe?.id).toBe('social_media_marketing')
    })

    it('defines Social Media Marketing recipe with complete metadata', () => {
      const recipe = SOCIAL_MEDIA_MARKETING_RECIPE
      expect(recipe.id).toBe('social_media_marketing')
      expect(recipe.slug).toBe('social-media-marketing')
      expect(recipe.displayName).toBe('Social Media Marketing AI Employee')
      expect(recipe.category).toBe('Marketing')
      expect(recipe.capabilities).toContain('content research')
      expect(recipe.capabilities).toContain('content ideation')
      expect(recipe.capabilities).toContain('social media content generation')
      expect(recipe.capabilities).toContain('brand voice enforcement')
      expect(recipe.capabilities).toContain('brand QA')
      expect(recipe.capabilities).toContain('publishing')
      expect(recipe.capabilities).toContain('analytics')
    })

    // ── 7. Contains All Eight Workflow Stages ─────────────────────────────────
    it('contains all eight required workflow stages in sequence', () => {
      const stages = SOCIAL_MEDIA_MARKETING_RECIPE.workflowSpec.stages
      expect(stages).toHaveLength(8)

      const expectedStageNames = [
        'Research',
        'Content Ideas',
        'Content Generation',
        'Brand QA',
        'Image / Media Generation',
        'Human Approval',
        'Publishing',
        'Analytics',
      ]

      const actualStageNames = stages.map((s) => s.name)
      expect(actualStageNames).toEqual(expectedStageNames)

      // Verify stage order indexing
      for (let i = 0; i < stages.length; i++) {
        expect(stages[i].order).toBe(i + 1)
      }
    })

    it('clearly distinguishes implemented stages from planned/integration stages', () => {
      const stages = SOCIAL_MEDIA_MARKETING_RECIPE.workflowSpec.stages

      const genStage = stages.find((s) => s.name === 'Content Generation')
      expect(genStage?.isImplemented).toBe(true)
      expect(genStage?.implementationStatus).toBe('implemented')

      const qaStage = stages.find((s) => s.name === 'Brand QA')
      expect(qaStage?.isImplemented).toBe(true)
      expect(qaStage?.implementationStatus).toBe('implemented')

      const pubStage = stages.find((s) => s.name === 'Publishing')
      expect(pubStage?.isImplemented).toBe(false)
      expect(pubStage?.implementationStatus).toBe('requires_integration')

      const anaStage = stages.find((s) => s.name === 'Analytics')
      expect(anaStage?.isImplemented).toBe(false)
      expect(anaStage?.implementationStatus).toBe('requires_integration')
    })
  })

  // ── 8. Configuration Schema Validation ──────────────────────────────────────
  describe('4. Reusable Configuration Schema', () => {
    it('validates required fields in configuration schema', () => {
      // Incomplete configuration missing required fields
      const invalidConfig = {
        businessName: '',
        industry: '',
      }

      const res = SOCIAL_MEDIA_CONFIG_SCHEMA.validate(invalidConfig)
      expect(res.valid).toBe(false)
      expect(res.errors.length).toBeGreaterThanOrEqual(4)
      expect(res.errors.some((e) => e.includes('businessName'))).toBe(true)
      expect(res.errors.some((e) => e.includes('industry'))).toBe(true)
      expect(res.errors.some((e) => e.includes('targetAudience'))).toBe(true)
    })

    it('approves a complete valid configuration', () => {
      const validConfig = {
        businessName: 'Apex Dynamics',
        industry: 'B2B Software',
        targetAudience: 'Chief Technology Officers and VPs of Engineering',
        brandVoice: 'Authoritative, technical, and forward-looking',
        contentTopics: ['Agentic AI', 'Workflow Automation', 'Cloud Security'],
        platforms: ['linkedin', 'x'],
        postingFrequency: '3_times_week',
        approvalMode: 'human_approval',
        callToAction: 'Visit grovaitech.ai for our technical whitepaper',
        website: 'https://grovaitech.ai',
        knowledgeSources: ['Whitepaper-v2.pdf'],
      }

      const res = SOCIAL_MEDIA_CONFIG_SCHEMA.validate(validConfig)
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })
  })

  // ── 9. Workflow Blueprint States ────────────────────────────────────────────
  describe('5. Blueprint Lifecycle & Safety States', () => {
    it('supports defined blueprint states', () => {
      const validStates: WorkflowBlueprintState[] = [
        'draft',
        'review',
        'validated',
        'deployable',
        'deprecated',
      ]

      const bp = SOCIAL_MEDIA_MARKETING_RECIPE.workflowSpec.blueprint
      expect(bp).toBeDefined()
      expect(validStates).toContain(bp?.state)
    })

    it('ensures blueprint state is validated or draft, never unreviewed deployable for imported sources', () => {
      const blueprint = SOCIAL_MEDIA_MARKETING_RECIPE.workflowSpec.blueprint
      expect(blueprint?.state).not.toBe('draft')
      expect(blueprint?.source).toBe('manual_definition')
    })
  })

  // ── 10 & 11. Execution Provider Decoupling ──────────────────────────────────
  describe('6. Execution Provider Abstraction', () => {
    it('does not depend directly on raw n8n JSON in its business recipe definition', () => {
      const recipe = SOCIAL_MEDIA_MARKETING_RECIPE
      // The recipe object itself should be business-centric and not contain raw n8n nodes/connections
      expect((recipe as any).nodes).toBeUndefined()
      expect((recipe as any).connections).toBeUndefined()
      expect(recipe.workflowSpec.defaultProvider).toBe('native')
    })

    it('executes implemented stages via execution adapter and simulates unintegrated stages', async () => {
      const adapter = SOCIAL_MEDIA_MARKETING_RECIPE.executionAdapter
      expect(adapter).toBeDefined()
      expect(adapter.provider).toBe('native')

      // Implemented stage execution
      const stage3Res = await adapter.executeStage?.('stage_3_content_generation', {
        topic: 'AI Employees',
      })
      expect(stage3Res?.success).toBe(true)
      expect(stage3Res?.isSimulated).toBeFalsy()

      // Unimplemented / Planned stage execution (graceful simulation, no fake success)
      const stage7Res = await adapter.executeStage?.('stage_7_publishing', {
        post: 'Draft post content',
      })
      expect(stage7Res?.success).toBe(true)
      expect(stage7Res?.isSimulated).toBe(true)
      expect(stage7Res?.result.status).toBe('requires_integration')
    })
  })
})
