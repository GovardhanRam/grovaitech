/**
 * Grovaitech AI Platform
 * tests/unit/content-hub.test.ts
 *
 * Unit tests for Social Media Content Hub:
 * - Data access & storage logic (packages, posts, calculations)
 * - Human approval lifecycle (approve, edit, reject, schedule)
 * - Tenant isolation & boundary guards
 * - Server action integrations & generation runner binding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  persistContentPackage,
  fetchContentHubData,
  updatePostStatus,
  updatePostContent,
  calculateOverview,
  resetInMemoryContentStore,
} from '@/lib/content/store'
import {
  approvePostAction,
  rejectPostAction,
  editPostAction,
  schedulePostAction,
  generateContentRunAction,
  getContentHubData,
} from '@/app/actions/content'
import * as recipesActionModule from '@/app/actions/recipes'
import type { SocialMediaContentPackage } from '@/lib/recipes/social-media-runner'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockGetUser, createMockFrom } = vi.hoisted(() => {
  const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'usr-test-123' } }, error: null })

  const createMockFrom = () => vi.fn((table: string) => {
    if (table === 'tenant_memberships') {
      const memBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, val: any) => ({
          eq: vi.fn().mockResolvedValue({
            data: val === 'usr-unassigned' ? [] : [
              { id: 'mem-1', tenant_id: 'client-apex-101', user_id: 'usr-test-123', role: 'owner', status: 'active' },
              { id: 'mem-2', tenant_id: 'client-real-tenant-xyz', user_id: 'usr-test-123', role: 'owner', status: 'active' },
            ],
            error: null,
          }),
        })),
      }
      return memBuilder
    }
    if (table === 'tenants') {
      const tenantBuilder = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'client-apex-101', name: 'Apex', slug: 'client-apex-101', type: 'customer', status: 'active' },
            { id: 'client-real-tenant-xyz', name: 'Real', slug: 'client-real-tenant-xyz', type: 'customer', status: 'active' },
          ],
          error: null,
        }),
      }
      return tenantBuilder
    }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  })

  return { mockGetUser, createMockFrom }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
    from: createMockFrom(),
  }),
  createAdminClient: vi.fn().mockResolvedValue({
    from: createMockFrom(),
  }),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_CONTENT_PACKAGE: SocialMediaContentPackage = {
  employeeSlug: 'social-media-marketing',
  executionId: 'exec-test-content-001',
  generatedAt: '2026-09-18T00:00:00.000Z',
  research: {
    trendingThemes: ['AI in Clinical Care', 'Patient Privacy'],
    audiencePainPoints: ['Documentation fatigue'],
    researchNotes: 'Clinics report 35% time savings.',
  },
  contentIdeas: {
    angles: [
      {
        hook: 'Most clinic front desks lose 3 hours daily.',
        format: 'thought_leadership',
        coreConcept: 'Automation reduces burnout.',
        recommendedPlatforms: ['linkedin', 'x'],
      },
    ],
  },
  generatedContent: {
    posts: [
      {
        id: 'post-test-li-1',
        platform: 'linkedin',
        content: 'Most clinic front desks lose 3 hours daily to paperwork.\n\nModern healthcare teams use AI employees.',
        characterCount: 95,
        hashtags: ['#HealthcareTech', '#ClinicAI'],
        callToAction: 'Book a demo at apexhealth.example.com',
        suggestedVisualBrief: 'Clean infographic showing clinician workflow.',
      },
      {
        id: 'post-test-x-1',
        platform: 'x',
        content: 'Clinics lose 3 hours daily on intake paperwork. Here is how modern doctors automate it: 🧵👇',
        characterCount: 88,
        hashtags: ['#HealthTech'],
        callToAction: 'Learn more at apexhealth.example.com',
        suggestedVisualBrief: 'Thread hook image.',
      },
    ],
  },
  qualityAssurance: {
    auditResults: [
      {
        postId: 'post-test-li-1',
        overallScore: 92,
        passed: true,
        rubricBreakdown: {
          toneConsistency: 24,
          complianceSafety: 25,
          factualGrounding: 22,
          platformFormat: 21,
        },
        violations: [],
        finalContent: 'Most clinic front desks lose 3 hours daily to paperwork.\n\nModern healthcare teams use AI employees.',
      },
      {
        postId: 'post-test-x-1',
        overallScore: 88,
        passed: true,
        rubricBreakdown: {
          toneConsistency: 22,
          complianceSafety: 24,
          factualGrounding: 21,
          platformFormat: 21,
        },
        violations: [],
        finalContent: 'Clinics lose 3 hours daily on intake paperwork. Here is how modern doctors automate it: 🧵👇',
      },
    ],
    allPassed: true,
    averageScore: 90,
  },
  approvalStatus: 'pending_approval',
}

describe('Grovaitech Social Media Content Hub & Human Approval Workspace', () => {
  beforeEach(() => {
    resetInMemoryContentStore()
    vi.clearAllMocks()
  })

  // ── 1. Data Access & Persistence ───────────────────────────────────────────
  describe('1. Data Access & Persistence Layer', () => {
    it('persists generated content packages and maps child posts with QA scores', async () => {
      const result = await persistContentPackage(
        MOCK_CONTENT_PACKAGE,
        { businessName: 'Apex Health' },
        'client-apex-101'
      )

      expect(result.package.id).toBe('exec-test-content-001')
      expect(result.package.clientId).toBe('client-apex-101')
      expect(result.package.status).toBe('pending_approval')
      expect(result.package.averageQaScore).toBe(90)

      expect(result.posts).toHaveLength(2)
      const liPost = result.posts.find((p) => p.platform === 'linkedin')
      expect(liPost).toBeDefined()
      expect(liPost?.qaScore).toBe(92)
      expect(liPost?.status).toBe('pending_approval')
      expect(liPost?.hook).toBe('Most clinic front desks lose 3 hours daily.')
      expect(liPost?.hashtags).toContain('#HealthcareTech')
    })

    it('calculates overview metrics correctly across diverse post statuses', () => {
      const posts = [
        { status: 'pending_approval', qaScore: 90 },
        { status: 'pending_approval', qaScore: 80 },
        { status: 'approved', qaScore: 95 },
        { status: 'scheduled', qaScore: 85 },
        { status: 'published', qaScore: 90 },
        { status: 'rejected', qaScore: 70 },
      ] as any[]

      const packages = [{ averageQaScore: 88, createdAt: '2026-09-18T00:00:00Z' }] as any[]

      const overview = calculateOverview(posts, packages)
      expect(overview.pendingCount).toBe(2)
      expect(overview.approvedCount).toBe(1)
      expect(overview.scheduledCount).toBe(1)
      expect(overview.publishedCount).toBe(1)
      expect(overview.rejectedCount).toBe(1)
      expect(overview.totalPostsCount).toBe(6)
      expect(overview.latestQaScore).toBe(88)
    })

    it('fetches Content Hub data combining live queries and cache', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const data = await fetchContentHubData('client-apex-101')
      expect(data.success).toBe(true)
      expect(data.posts.length).toBeGreaterThanOrEqual(2)
      expect(data.overview.pendingCount).toBeGreaterThanOrEqual(2)
    })
  })

  // ── 2. Approval Transitions (Stage 6) ───────────────────────────────────────
  describe('2. Human Approval Lifecycle', () => {
    it('approves a post and sets approved_at timestamp', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const res = await updatePostStatus('post-test-li-1', 'approved', {}, 'client-apex-101')
      expect(res.success).toBe(true)
      expect(res.post?.status).toBe('approved')
      expect(res.post?.approvedAt).toBeDefined()
      expect(res.post?.rejectionReason).toBeNull()
    })

    it('rejects a post with custom feedback reason and sets rejected_at', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const res = await updatePostStatus(
        'post-test-x-1',
        'rejected',
        { rejectionReason: 'Too informal for enterprise brand voice' },
        'client-apex-101'
      )
      expect(res.success).toBe(true)
      expect(res.post?.status).toBe('rejected')
      expect(res.post?.rejectionReason).toBe('Too informal for enterprise brand voice')
      expect(res.post?.rejectedAt).toBeDefined()
    })

    it('schedules a post for future delivery and records scheduled_at', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString()
      const res = await updatePostStatus(
        'post-test-li-1',
        'scheduled',
        { scheduledAt: futureDate },
        'client-apex-101'
      )
      expect(res.success).toBe(true)
      expect(res.post?.status).toBe('scheduled')
      expect(res.post?.scheduledAt).toBe(futureDate)
    })
  })

  // ── 3. Post Refinement & Copy Editing ──────────────────────────────────────
  describe('3. Copy Refinement & Preservation', () => {
    it('preserves the original AI copy while saving the edited version', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const originalText = 'Most clinic front desks lose 3 hours daily to paperwork.\n\nModern healthcare teams use AI employees.'
      const refinedText = 'Clinics save 15+ hours weekly by upgrading from manual clipboards to verified AI intake assistants.'

      const res = await updatePostContent('post-test-li-1', refinedText, 'client-apex-101')
      expect(res.success).toBe(true)
      expect(res.post?.originalContent).toBe(originalText)
      expect(res.post?.editedContent).toBe(refinedText)
      expect(res.post?.characterCount).toBe(refinedText.length)
    })

    it('rejects empty content edits', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const res = await updatePostContent('post-test-li-1', '   ', 'client-apex-101')
      expect(res.success).toBe(false)
      expect(res.error).toContain('cannot be empty')
    })
  })

  // ── 4. Tenant Isolation & Security Boundaries ──────────────────────────────
  describe('4. Tenant Isolation & Authorization', () => {
    it('prevents tenant A from updating or modifying posts belonging to tenant B', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-tenant-a')

      const attempt = await updatePostStatus(
        'post-test-li-1',
        'approved',
        {},
        'client-tenant-b' // Mismatched tenant
      )
      expect(attempt.success).toBe(false)
      expect(attempt.error).toContain('Unauthorized')
    })

    it('prevents cross-tenant copy edits', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-tenant-a')

      const attempt = await updatePostContent(
        'post-test-li-1',
        'Hacked content',
        'client-tenant-b' // Mismatched tenant
      )
      expect(attempt.success).toBe(false)
      expect(attempt.error).toContain('Unauthorized')
    })
  })

  // ── 5. Server Actions Suite ────────────────────────────────────────────────
  describe('5. Server Actions Suite', () => {
    it('approvePostAction succeeds for valid post', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const res = await approvePostAction({ postId: 'post-test-li-1' })
      expect(res.success).toBe(true)
      expect(res.post?.status).toBe('approved')
    })

    it('rejectPostAction requires valid post ID and persists feedback reason', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const res = await rejectPostAction({
        postId: 'post-test-x-1',
        rejectionReason: 'Needs clinical citations',
      })
      expect(res.success).toBe(true)
      expect(res.post?.status).toBe('rejected')
      expect(res.post?.rejectionReason).toBe('Needs clinical citations')
    })

    it('editPostAction rejects empty strings with structured error', async () => {
      const res = await editPostAction({
        postId: 'post-test-li-1',
        editedContent: '',
      })
      expect(res.success).toBe(false)
      expect(res.error).toContain('cannot be empty')
    })

    it('schedulePostAction validates future timestamp and rejects past dates', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      // Past date
      const pastDate = new Date(Date.now() - 3600000).toISOString()
      const pastRes = await schedulePostAction({
        postId: 'post-test-li-1',
        scheduledAt: pastDate,
      })
      expect(pastRes.success).toBe(false)
      expect(pastRes.error).toContain('must be in the future')

      // Future date
      const futureDate = new Date(Date.now() + 86400000 * 3).toISOString()
      const futureRes = await schedulePostAction({
        postId: 'post-test-li-1',
        scheduledAt: futureDate,
      })
      expect(futureRes.success).toBe(true)
      expect(futureRes.post?.status).toBe('scheduled')
    })

    it('generateContentRunAction calls executeSocialMediaRecipe and persists output package', async () => {
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe').mockResolvedValue({
        success: true,
        contentPackage: MOCK_CONTENT_PACKAGE,
        executionId: 'exec-test-content-001',
      })

      const res = await generateContentRunAction({
        config: {
          businessName: 'Apex Health',
          industry: 'Healthcare',
          brandVoice: 'Authoritative',
          contentTopics: ['Clinical AI'],
          platforms: ['linkedin', 'x'],
        },
        clientId: 'client-apex-101',
      })

      expect(spy).toHaveBeenCalledWith({
        recipeSlug: 'social-media-marketing',
        config: expect.any(Object),
        clientId: 'client-apex-101',
      })
      expect(res.success).toBe(true)
      expect(res.package?.id).toBe('exec-test-content-001')
      expect(res.posts).toHaveLength(2)

      spy.mockRestore()
    })

    it('generateContentRunAction handles recipe failure gracefully', async () => {
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe').mockResolvedValue({
        success: false,
        error: 'Rate limit on Gemini inference API',
      })

      const res = await generateContentRunAction({
        config: {},
        clientId: 'client-apex-101',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('Rate limit on Gemini inference API')

      spy.mockRestore()
    })

    it('getContentHubData loads workspace data safely', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-apex-101')

      const data = await getContentHubData('client-apex-101')
      expect(data.success).toBe(true)
      expect(data.overview.totalPostsCount).toBeGreaterThanOrEqual(2)
      expect(data.packages.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── 6. Tenant Resolution Security (Production Bug Fix) ──────────────────────
  describe('6. Tenant Resolution Security — client-default bug fix', () => {
    it('T1: "client-default" is never produced — no-context call is rejected, not silently assigned a tenant', async () => {
      // Mock: authenticated user found (usr-test-123), but no client record associated
      // (the default mock already returns data:[] for limit(1) on clients table)
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe')
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-unassigned' } }, error: null })

      const res = await generateContentRunAction({
        config: { businessName: 'Test Co' },
        // No clientId, no isDemoContext — should be rejected
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('Unauthorized')
      // Critically: executeSocialMediaRecipe must NOT have been called with 'client-default'
      expect(spy).not.toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-default' })
      )
      spy.mockRestore()
    })

    it('T2: explicit demo context resolves to the canonical permitted demo tenant "demo-default"', async () => {
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe').mockResolvedValue({
        success: true,
        contentPackage: MOCK_CONTENT_PACKAGE,
        executionId: 'exec-demo-001',
      })

      const res = await generateContentRunAction({
        config: { businessName: 'Demo Co' },
        isDemoContext: true,
        // No clientId provided
      })

      expect(res.success).toBe(true)
      // Must have been called with exactly 'demo-default', not 'client-default' or any invented ID
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'demo-default' })
      )
      // Persisted package must carry the demo tenant ID, not an invented one
      expect(res.package?.clientId).toBe('demo-default')

      spy.mockRestore()
    })

    it('T3: authenticated user with a supplied clientId resolves to their actual client', async () => {
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe').mockResolvedValue({
        success: true,
        contentPackage: MOCK_CONTENT_PACKAGE,
        executionId: 'exec-real-client-001',
      })

      const res = await generateContentRunAction({
        config: { businessName: 'Real Corp' },
        clientId: 'client-real-tenant-xyz',
      })

      expect(res.success).toBe(true)
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-real-tenant-xyz' })
      )
      expect(res.package?.clientId).toBe('client-real-tenant-xyz')

      spy.mockRestore()
    })

    it('T4: no valid client and no isDemoContext → authorization error, no generation attempted', async () => {
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe')
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'usr-unassigned' } }, error: null })

      const res = await generateContentRunAction({
        config: { businessName: 'Ghost Corp' },
        // Deliberately omit clientId and isDemoContext
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('Unauthorized')
      // Generation must never be attempted for an unresolved tenant
      expect(spy).not.toHaveBeenCalled()

      spy.mockRestore()
    })

    it('T5: cross-tenant mutation protection — tenant B cannot modify posts belonging to tenant A', async () => {
      await persistContentPackage(MOCK_CONTENT_PACKAGE, {}, 'client-tenant-secure-a')

      const attemptStatus = await updatePostStatus(
        'post-test-li-1',
        'approved',
        {},
        'client-tenant-secure-b'
      )
      expect(attemptStatus.success).toBe(false)
      expect(attemptStatus.error).toContain('Unauthorized')

      const attemptEdit = await updatePostContent(
        'post-test-li-1',
        'Injected content from tenant B',
        'client-tenant-secure-b'
      )
      expect(attemptEdit.success).toBe(false)
      expect(attemptEdit.error).toContain('Unauthorized')
    })

    it('T6: isDemoContext=true cannot elevate to a real customer tenant — demo resolves only to "demo-default"', async () => {
      const spy = vi.spyOn(recipesActionModule, 'executeSocialMediaRecipe').mockResolvedValue({
        success: true,
        contentPackage: MOCK_CONTENT_PACKAGE,
        executionId: 'exec-demo-isolation',
      })

      // isDemoContext=true with a real-looking clientId: the explicit clientId wins (Case A),
      // isDemoContext is only the fallback when no client resolves.
      const resWithClientId = await generateContentRunAction({
        config: {},
        clientId: 'client-real-tenant-xyz',
        isDemoContext: true,
      })
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-real-tenant-xyz' })
      )
      // Must NOT silently override a real clientId with demo-default
      expect(resWithClientId.package?.clientId).toBe('client-real-tenant-xyz')

      spy.mockRestore()
    })
  })
})
