/**
 * Grovaitech AI Platform
 * tests/unit/gbp-dispatcher.test.ts
 *
 * Unit Test Suite for GBP AI Employee Dispatcher Handlers:
 * - audit_gbp_profile
 * - draft_review_reply
 * - create_gbp_post
 *
 * Verifies sandbox execution, parameter validation, string sanitization,
 * draft-only isolation, and strict tenant security boundaries.
 */

import { describe, it, expect } from 'vitest'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { TOOL_NAMES } from '@/lib/ai/tools'

describe('GBP AI Employee Dispatcher Handlers (Sandbox Execution)', () => {
  // ─── 1. audit_gbp_profile ──────────────────────────────────────────────────

  describe('audit_gbp_profile', () => {
    it('1.1 successfully audits valid GBP profile snapshot in sandbox mode', async () => {
      const res = await dispatchToolCall(
        TOOL_NAMES.AUDIT_GBP_PROFILE,
        {
          business_name: 'Apex Dental Care',
          category: 'Dental Clinic',
          address_nap: '123 Main St, Salem, TN 636001, +91 9876543210',
          phone: '+91 9876543210',
          website: 'https://apexdental.example.com',
          hours: 'Mon-Sat 9AM-6PM',
          rating_info: '4.8 stars, 150 reviews',
          services_products: 'Teeth Cleaning, Root Canal, Braces',
          attributes: 'Wheelchair Accessible, Wi-Fi',
          photos_media_info: 'Cover photo present, 15 interior photos',
        },
        { executionMode: 'sandbox' }
      )

      expect(res.success).toBe(true)
      expect(res.toolName).toBe('audit_gbp_profile')
      expect(res.result).toBeDefined()
      expect(res.result.business_name).toBe('Apex Dental Care')
      expect(res.result.category).toBe('Dental Clinic')
      expect(res.result.completeness_score).toBe(100)
      expect(res.result.isSimulated).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.executionMode).toBe('sandbox')
      expect(res.result.disclaimer).toContain('SANDBOX AUDIT DEMO')
      expect(res.result.prioritized_recommendations).toBeDefined()
      expect(Array.isArray(res.result.prioritized_recommendations)).toBe(true)
    })

    it('1.2 rejects execution when business_name is missing or empty', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.AUDIT_GBP_PROFILE, {
        category: 'Dental Clinic',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'business_name' is required")
    })

    it('1.3 rejects malformed business_name below minLength', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.AUDIT_GBP_PROFILE, {
        business_name: 'A',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'business_name' must be at least 2 characters.")
    })

    it('1.4 sanitizes string inputs and handles partial profile missing sections', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.AUDIT_GBP_PROFILE, {
        business_name: '   Apex Dental Care   \n',
        category: '   Dental Clinic   ',
      })

      expect(res.success).toBe(true)
      expect(res.result.business_name).toBe('Apex Dental Care')
      expect(res.result.category).toBe('Dental Clinic')
      expect(res.result.completeness_score).toBe(45)
      expect(res.result.missing_sections).toContain('NAP / Contact phone & address details incomplete')
      expect(res.result.missing_sections).toContain('Website URL not linked to GBP profile')
    })

    it('1.5 confirms sandbox isolation and makes no live Google API calls', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.AUDIT_GBP_PROFILE, {
        business_name: 'Local Business Test',
      })

      expect(res.success).toBe(true)
      expect(res.result.isSimulated).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('No live Google Business Profile API calls or account modifications were executed.')
    })

    it('1.6 enforces tenant security boundary against unauthorized client_id override', async () => {
      const res = await dispatchToolCall(
        TOOL_NAMES.AUDIT_GBP_PROFILE,
        {
          business_name: 'Tenant Business',
          client_id: 'malicious-tenant-999',
        },
        { authorizedClientId: 'valid-tenant-100' }
      )

      expect(res.success).toBe(false)
      expect(res.error).toContain('Security Violation')
      expect(res.error).toContain('does not match authorized tenant')
    })
  })

  // ─── 2. draft_review_reply ────────────────────────────────────────────────

  describe('draft_review_reply', () => {
    it('2.1 drafts a respectful, empathetic response for a 1-star negative review', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        review_text: 'Had to wait 45 minutes past my appointment time and doctor was rude.',
        rating: 1,
        business_name: 'Salem Dental Care',
        reviewer_name: 'Rahul V.',
      })

      expect(res.success).toBe(true)
      expect(res.result.business_name).toBe('Salem Dental Care')
      expect(res.result.reviewer_name).toBe('Rahul V.')
      expect(res.result.rating).toBe(1)
      expect(res.result.desired_tone).toBe('apologetic')
      expect(res.result.draft_reply).toContain('Dear Rahul V.')
      expect(res.result.draft_reply).toContain('sincerely sorry')
      expect(res.result.draft_reply).toContain('reach out to our management team directly')
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('The response has NOT been published to Google Business Profile.')
    })

    it('2.2 drafts an enthusiastic, warm response for a 5-star positive review', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        review_text: 'Excellent service! The AC repair team arrived on time and fixed everything quickly.',
        rating: 5,
        business_name: 'CoolAir HVAC Solutions',
        reviewer_name: 'Priya Sharma',
      })

      expect(res.success).toBe(true)
      expect(res.result.business_name).toBe('CoolAir HVAC Solutions')
      expect(res.result.reviewer_name).toBe('Priya Sharma')
      expect(res.result.rating).toBe(5)
      expect(res.result.desired_tone).toBe('grateful')
      expect(res.result.draft_reply).toContain('Hi Priya Sharma!')
      expect(res.result.draft_reply).toContain('5-star review')
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
    })

    it('2.3 rejects rating below 1 (e.g., rating = 0)', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        review_text: 'Poor service.',
        rating: 0,
        business_name: 'Test Business',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'rating' must be an integer between 1 and 5.")
    })

    it('2.4 rejects rating above 5 (e.g., rating = 6)', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        review_text: 'Awesome service!',
        rating: 6,
        business_name: 'Test Business',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'rating' must be an integer between 1 and 5.")
    })

    it('2.5 rejects missing required fields (e.g. missing review_text)', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        rating: 5,
        business_name: 'Test Business',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'review_text' is required")
    })

    it('2.6 sanitizes inputs and handles anonymous/unspecified reviewer name', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        review_text: '  Great work!  \n',
        rating: 4,
        business_name: '  Grovaitech Test  ',
      })

      expect(res.success).toBe(true)
      expect(res.result.business_name).toBe('Grovaitech Test')
      expect(res.result.reviewer_name).toBe('Valued Customer')
      expect(res.result.draft_reply).toContain('Valued Customer')
    })

    it('2.7 verifies draft-only behavior and confirms no live Google publishing occurs', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        review_text: 'Friendly staff and reasonable prices.',
        rating: 5,
        business_name: 'Local Store',
      })

      expect(res.success).toBe(true)
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('SANDBOX DRAFT DEMO')
    })
  })

  // ─── 3. create_gbp_post ────────────────────────────────────────────────────

  describe('create_gbp_post', () => {
    it('3.1 drafts a valid GBP promotional post with custom call to action', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.CREATE_GBP_POST, {
        business_name: 'CoolAir HVAC Solutions',
        post_topic: 'Summer AC Maintenance Special',
        offer_event_details: 'Get 20% off full AC servicing and gas refill this week only!',
        call_to_action: 'book',
        target_audience: 'Homeowners in Salem',
        keywords: '#HVAC #ACRepair #SalemDeals',
        validity_date_info: 'Valid until June 30',
      })

      expect(res.success).toBe(true)
      expect(res.result.business_name).toBe('CoolAir HVAC Solutions')
      expect(res.result.post_topic).toBe('Summer AC Maintenance Special')
      expect(res.result.call_to_action).toBe('book')
      expect(res.result.cta_button).toBe('Book Now')
      expect(res.result.draft_post_content).toContain('Summer AC Maintenance Special')
      expect(res.result.draft_post_content).toContain('20% off full AC servicing')
      expect(res.result.draft_post_content).toContain('Click "Book Now" to get started!')
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('SANDBOX DRAFT DEMO')
    })

    it('3.2 rejects missing required fields (missing post_topic)', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.CREATE_GBP_POST, {
        business_name: 'CoolAir HVAC',
        offer_event_details: 'Free inspection',
        call_to_action: 'call_now',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'post_topic' is required")
    })

    it('3.3 rejects invalid call_to_action option', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.CREATE_GBP_POST, {
        business_name: 'CoolAir HVAC',
        post_topic: 'Special Offer',
        offer_event_details: 'Free inspection',
        call_to_action: 'invalid_cta_button' as any,
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain("Validation Error: 'call_to_action' must be one of: book, order_online, buy, learn_more, sign_up, call_now.")
    })

    it('3.4 sanitizes string parameters properly', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.CREATE_GBP_POST, {
        business_name: '   CoolAir HVAC   ',
        post_topic: '   Seasonal Tune-Up   ',
        offer_event_details: '   Complete diagnostic for ₹499   ',
        call_to_action: 'learn_more',
      })

      expect(res.success).toBe(true)
      expect(res.result.business_name).toBe('CoolAir HVAC')
      expect(res.result.post_topic).toBe('Seasonal Tune-Up')
      expect(res.result.cta_button).toBe('Learn More')
    })

    it('3.5 verifies draft-only behavior and confirms no live Google post publishing occurs', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.CREATE_GBP_POST, {
        business_name: 'Apex Dental',
        post_topic: 'Free Dental Checkup Camp',
        offer_event_details: 'Free dental consultation this Saturday.',
        call_to_action: 'sign_up',
      })

      expect(res.success).toBe(true)
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('The post has NOT been published to Google.')
    })
  })
})
