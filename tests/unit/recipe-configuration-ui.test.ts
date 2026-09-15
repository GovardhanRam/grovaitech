/**
 * Grovaitech AI Platform
 * tests/unit/recipe-configuration-ui.test.ts
 *
 * Phase 2A Unit Tests:
 * Validates the real configuration UI logic, schema validation,
 * required vs optional field boundaries, and deployment hand-off contracts
 * for the "Social Media Marketing AI Employee" recipe.
 */

import { describe, it, expect } from 'vitest'
import {
  getRecipeBySlug,
  SOCIAL_MEDIA_MARKETING_RECIPE,
  SOCIAL_MEDIA_CONFIG_SCHEMA,
} from '@/lib/recipes'
import { validateRecipeConfiguration } from '@/app/actions/recipes'

describe('Phase 2A: Recipe Configuration & Schema Validation', () => {
  // ── 1. Canonical Schema Integrity ─────────────────────────────────────────
  describe('1. Schema Definition & Field Classifications', () => {
    it('uses the single canonical SOCIAL_MEDIA_CONFIG_SCHEMA', () => {
      const recipe = getRecipeBySlug('social-media-marketing')
      expect(recipe).toBeDefined()
      expect(recipe?.configurationSchema).toBe(SOCIAL_MEDIA_CONFIG_SCHEMA)
      expect(recipe?.configurationSchema.version).toBe('1.0.0')
    })

    it('defines exactly 11 configuration fields', () => {
      expect(SOCIAL_MEDIA_CONFIG_SCHEMA.fields).toHaveLength(11)
    })

    it('clearly distinguishes required vs optional fields', () => {
      const requiredFields = SOCIAL_MEDIA_CONFIG_SCHEMA.fields
        .filter((f) => f.required)
        .map((f) => f.name)
      const optionalFields = SOCIAL_MEDIA_CONFIG_SCHEMA.fields
        .filter((f) => !f.required)
        .map((f) => f.name)

      expect(requiredFields).toEqual([
        'businessName',
        'industry',
        'targetAudience',
        'brandVoice',
        'contentTopics',
        'platforms',
        'postingFrequency',
        'approvalMode',
      ])

      expect(optionalFields).toEqual([
        'callToAction',
        'website',
        'knowledgeSources',
      ])
    })

    it('specifies appropriate defaults for operational fields', () => {
      const brandVoiceField = SOCIAL_MEDIA_CONFIG_SCHEMA.fields.find(
        (f) => f.name === 'brandVoice'
      )
      const contentTopicsField = SOCIAL_MEDIA_CONFIG_SCHEMA.fields.find(
        (f) => f.name === 'contentTopics'
      )
      const platformsField = SOCIAL_MEDIA_CONFIG_SCHEMA.fields.find(
        (f) => f.name === 'platforms'
      )
      const frequencyField = SOCIAL_MEDIA_CONFIG_SCHEMA.fields.find(
        (f) => f.name === 'postingFrequency'
      )
      const approvalField = SOCIAL_MEDIA_CONFIG_SCHEMA.fields.find(
        (f) => f.name === 'approvalMode'
      )

      expect(brandVoiceField?.defaultValue).toBe('Professional and authoritative')
      expect(contentTopicsField?.defaultValue).toEqual([
        'Industry Insights',
        'Product Tips',
        'Customer Success',
      ])
      expect(platformsField?.defaultValue).toEqual(['linkedin', 'x'])
      expect(frequencyField?.defaultValue).toBe('3_times_week')
      expect(approvalField?.defaultValue).toBe('human_approval')
    })
  })

  // ── 2. Validation Logic ───────────────────────────────────────────────────
  describe('2. Schema Validation Engine', () => {
    const validConfig = {
      businessName: 'Apex Cloud Solutions',
      industry: 'Enterprise Software',
      targetAudience: 'CTOs & VP of Engineering',
      brandVoice: 'Authoritative, technical, clear',
      contentTopics: ['Cloud Architecture', 'DevOps Best Practices'],
      platforms: ['linkedin', 'x'],
      postingFrequency: '3_times_week',
      approvalMode: 'human_approval',
      callToAction: 'Book a technical architecture review',
      website: 'https://apexcloud.example.com',
      knowledgeSources: ['Cloud Whitepaper 2026'],
    }

    it('passes validation when all required fields are provided', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate(validConfig)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects missing or empty businessName', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        businessName: '   ',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('businessName'))).toBe(true)
    })

    it('rejects missing industry', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        industry: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('industry'))).toBe(true)
    })

    it('rejects missing targetAudience', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        targetAudience: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('targetAudience'))).toBe(true)
    })

    it('rejects missing brandVoice', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        brandVoice: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('brandVoice'))).toBe(true)
    })

    it('rejects empty platforms list', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        platforms: [],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('platforms'))).toBe(true)
    })

    it('rejects missing postingFrequency', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        postingFrequency: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('postingFrequency'))).toBe(true)
    })

    it('rejects missing approvalMode', () => {
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate({
        ...validConfig,
        approvalMode: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('approvalMode'))).toBe(true)
    })

    it('accepts config without optional fields', () => {
      const minimalConfig = {
        businessName: 'Apex Cloud Solutions',
        industry: 'Enterprise Software',
        targetAudience: 'CTOs',
        brandVoice: 'Authoritative',
        contentTopics: ['Tech'],
        platforms: ['linkedin'],
        postingFrequency: 'daily',
        approvalMode: 'automatic',
      }
      const result = SOCIAL_MEDIA_CONFIG_SCHEMA.validate(minimalConfig)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  // ── 3. Server Action Validation Contract ───────────────────────────────────
  describe('3. Server Action (validateRecipeConfiguration)', () => {
    it('returns success: false for non-existent recipe slug', async () => {
      const res = await validateRecipeConfiguration('non-existent-slug', {})
      expect(res.success).toBe(false)
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toContain('No canonical recipe found')
    })

    it('returns valid: false with errors when required fields are missing', async () => {
      const res = await validateRecipeConfiguration('social-media-marketing', {
        businessName: '',
      })
      expect(res.success).toBe(true)
      expect(res.valid).toBe(false)
      expect(res.errors.length).toBeGreaterThan(0)
    })

    it('returns valid: true and sanitizedConfig on valid payload', async () => {
      const validPayload = {
        businessName: 'Apex Cloud Solutions',
        industry: 'Enterprise Software',
        targetAudience: 'CTOs',
        brandVoice: 'Authoritative',
        contentTopics: ['Cloud'],
        platforms: ['linkedin', 'x'],
        postingFrequency: '3_times_week',
        approvalMode: 'human_approval',
      }
      const res = await validateRecipeConfiguration('social-media-marketing', validPayload)
      expect(res.success).toBe(true)
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
      expect(res.sanitizedConfig?.businessName).toBe('Apex Cloud Solutions')
    })
  })
})
