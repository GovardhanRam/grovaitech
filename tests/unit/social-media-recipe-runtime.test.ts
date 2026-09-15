import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  executeSocialMediaRunner,
  executeResearchStage,
  executeIdeationStage,
  executeGenerationStage,
  executeBrandQaStage,
  parseStageJsonResponse,
  type SocialMediaContentPackage,
} from '@/lib/recipes/social-media-runner'
import { executeSocialMediaRecipe } from '@/app/actions/recipes'
import { Gemini } from '@/lib/ai/gemini'
import { saveWorkflowExecution } from '@/lib/workflows/executor'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/workflows/executor', async () => {
  const actual = await vi.importActual<any>('@/lib/workflows/executor')
  return {
    ...actual,
    saveWorkflowExecution: vi.fn().mockResolvedValue(undefined),
  }
})

// ─── Mock Fixtures ───────────────────────────────────────────────────────────

const VALID_CONFIG = {
  businessName: 'Apex Health Systems',
  industry: 'Healthcare',
  targetAudience: 'Clinic directors, healthcare administrators, and patients',
  brandVoice: 'Empathetic, authoritative, professional, and reassuring',
  platforms: ['linkedin', 'x', 'instagram'],
  postingFrequency: '3_times_week',
  contentTopics: ['AI in Clinical Workflow', 'Patient Privacy in Telehealth', 'Reducing Waiting Times'],
  contentPillars: ['Clinical Innovation', 'Patient Trust', 'Healthcare Efficiency'],
  brandGuidelines: 'Never make ungrounded medical diagnosis claims. Emphasize patient dignity and data protection.',
  complianceRules: 'Zero unauthorized medical promises. Do not mention specific drug dosages. Ensure HIPAA compliance.',
  callToAction: 'Book a discovery demo at apexhealth.example.com',
  approvalMode: 'human_approval',
}

const MOCK_RESEARCH_JSON = JSON.stringify({
  trendingThemes: [
    'AI adoption in outpatient specialty clinics',
    'Patient wait time reduction through automated intake',
    'Telehealth data sovereignty and compliance standards',
  ],
  audiencePainPoints: [
    'Clinicians experiencing administrative burnout from manual documentation',
    'Patients frustrated by 45-minute average front-desk waiting times',
  ],
  researchNotes:
    'Clinics adopting verified automation report 38% reduction in front-desk bottleneck while maintaining compliance.',
})

const MOCK_IDEATION_JSON = JSON.stringify({
  angles: [
    {
      hook: 'Most clinic front desks lose 3 hours every day to repetitive intake questions.',
      format: 'thought_leadership',
      coreConcept: 'Automating standard intake frees nursing staff for high-touch patient care.',
      recommendedPlatforms: ['linkedin', 'x'],
    },
    {
      hook: 'Why clinical automation is about patient dignity, not just operational speed.',
      format: 'case_study',
      coreConcept: 'Dignified healthcare begins when patients are not treated like paperwork queues.',
      recommendedPlatforms: ['linkedin', 'instagram'],
    },
    {
      hook: 'How top outpatient centers eliminated the 40-minute waiting room wait.',
      format: 'how_to',
      coreConcept: 'Three operational shifts that modernized clinical patient flow.',
      recommendedPlatforms: ['linkedin', 'x', 'instagram'],
    },
  ],
})

const MOCK_GENERATION_JSON = JSON.stringify({
  posts: [
    {
      id: 'post-linkedin-1',
      platform: 'linkedin',
      content:
        'Most clinic front desks lose 3 hours every day to repetitive intake questions.\n\nWhen administrators spend their morning fielding "What documents do I need?" inquiries, high-touch patient care inevitably suffers.\n\nModern clinics are shifting to verified AI intake assistants that handle routine scheduling while keeping doctors in control.\n\nDiscover how Apex Health Systems modernizes clinic workflows: Book a discovery demo at apexhealth.example.com\n\n#HealthcareInnovation #ClinicalEfficiency #HealthTech',
      characterCount: 462,
      hashtags: ['#HealthcareInnovation', '#ClinicalEfficiency', '#HealthTech'],
      callToAction: 'Book a discovery demo at apexhealth.example.com',
      suggestedVisualBrief: 'Clean infographic showing clinician time allocation before and after automated intake.',
    },
    {
      id: 'post-x-1',
      platform: 'x',
      content:
        'A 45-minute waiting room delay isn’t just an inconvenience—it degrades patient trust before the consultation even begins.\n\nAutomated front-desk intake changes that.\n\nLearn more: apexhealth.example.com #HealthTech',
      characterCount: 208,
      hashtags: ['#HealthTech'],
      callToAction: 'Learn more: apexhealth.example.com',
      suggestedVisualBrief: 'Minimalist quote card on clinical operational excellence.',
    },
    {
      id: 'post-instagram-1',
      platform: 'instagram',
      content:
        'Healthcare begins the moment a patient reaches out—not when they sit in the exam room.\n\nWhen clinic teams are freed from manual intake queues, they can focus on what matters most: human compassion and patient reassurance.\n\n🔗 Link in bio to see how Apex Health Systems elevates patient intake.\n\n#PatientCare #ModernClinic #HealthcareLeadership',
      characterCount: 341,
      hashtags: ['#PatientCare', '#ModernClinic', '#HealthcareLeadership'],
      callToAction: 'Link in bio to see how Apex Health Systems elevates patient intake.',
      suggestedVisualBrief: 'Warm photograph of a friendly clinic front desk team greeting a patient.',
    },
  ],
})

const MOCK_QA_AUDIT_PASSED_JSON = JSON.stringify({
  auditResults: [
    {
      postId: 'post-linkedin-1',
      overallScore: 92,
      passed: true,
      rubricBreakdown: {
        toneConsistency: 23,
        complianceSafety: 24,
        factualGrounding: 22,
        platformFormat: 23,
      },
      violations: [],
      refinementsApplied: undefined,
      finalContent:
        'Most clinic front desks lose 3 hours every day to repetitive intake questions.\n\nWhen administrators spend their morning fielding "What documents do I need?" inquiries, high-touch patient care inevitably suffers.\n\nModern clinics are shifting to verified AI intake assistants that handle routine scheduling while keeping doctors in control.\n\nDiscover how Apex Health Systems modernizes clinic workflows: Book a discovery demo at apexhealth.example.com\n\n#HealthcareInnovation #ClinicalEfficiency #HealthTech',
    },
    {
      postId: 'post-x-1',
      overallScore: 90,
      passed: true,
      rubricBreakdown: {
        toneConsistency: 23,
        complianceSafety: 23,
        factualGrounding: 22,
        platformFormat: 22,
      },
      violations: [],
      refinementsApplied: undefined,
      finalContent:
        'A 45-minute waiting room delay isn’t just an inconvenience—it degrades patient trust before the consultation even begins.\n\nAutomated front-desk intake changes that.\n\nLearn more: apexhealth.example.com #HealthTech',
    },
    {
      postId: 'post-instagram-1',
      overallScore: 88,
      passed: true,
      rubricBreakdown: {
        toneConsistency: 22,
        complianceSafety: 23,
        factualGrounding: 21,
        platformFormat: 22,
      },
      violations: [],
      refinementsApplied: undefined,
      finalContent:
        'Healthcare begins the moment a patient reaches out—not when they sit in the exam room.\n\nWhen clinic teams are freed from manual intake queues, they can focus on what matters most: human compassion and patient reassurance.\n\n🔗 Link in bio to see how Apex Health Systems elevates patient intake.\n\n#PatientCare #ModernClinic #HealthcareLeadership',
    },
  ],
})

const MOCK_QA_AUDIT_FLAGGED_JSON = JSON.stringify({
  auditResults: [
    {
      postId: 'post-linkedin-1',
      overallScore: 58,
      passed: false,
      rubricBreakdown: {
        toneConsistency: 18,
        complianceSafety: 12,
        factualGrounding: 10,
        platformFormat: 18,
      },
      violations: [
        'Fabricated claim: "Clinical trials prove 100% cure rate". Not supported in brand knowledge base.',
        'Compliance violation: Guaranteed clinical outcomes without medical disclaimers.',
      ],
      refinementsApplied: 'Stripped ungrounded cure claim and restored compliant intake focus.',
      finalContent:
        'Apex Health Systems supports modern clinics with verified intake automation.\n\nBook a demo: apexhealth.example.com',
    },
  ],
})

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Social Media Marketing AI Employee Runtime (Phase 2B)', () => {
  let mockSupabase: any
  let mockGenerateText: any
  let mockGeminiClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-marketing-manager-001', email: 'manager@apexhealth.example.com' } },
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        let filterVal: string | null = null
        const builder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            filterVal = val
            return builder
          }),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(async () => {
            if (table === 'clients') {
              if (filterVal && filterVal.includes('unauthorized')) {
                return { data: null, error: { message: 'Row not found' } }
              }
              return { data: { id: filterVal || 'client-apex-101', name: 'Apex Health Systems', status: 'Active' }, error: null }
            }
            return { data: null, error: null }
          }),
        }
        return builder
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    mockGenerateText = vi.fn()
    mockGeminiClient = {
      isAvailable: vi.fn().mockReturnValue(true),
      generateText: mockGenerateText,
    } as unknown as Gemini
  })

  // ─── 1. Valid Configuration Acceptance ─────────────────────────────────────
  it('1. accepts valid configuration and proceeds through execution pipeline', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: MOCK_RESEARCH_JSON })
      .mockResolvedValueOnce({ text: MOCK_IDEATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_GENERATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_QA_AUDIT_PASSED_JSON })

    const result = await executeSocialMediaRunner({
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      persistExecution: false,
    })

    expect(result.success).toBe(true)
    expect(result.contentPackage).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  // ─── 2. Invalid Configuration Rejection ────────────────────────────────────
  it('2. rejects invalid configuration missing required fields and halts before AI calls', async () => {
    const invalidConfig = {
      ...VALID_CONFIG,
      businessName: '', // Required field missing
    }

    const result = await executeSocialMediaRunner({
      config: invalidConfig,
      geminiClient: mockGeminiClient,
    })

    expect(result.success).toBe(false)
    expect(result.failedStageId).toBe('config_validation')
    expect(result.error).toContain("Field 'businessName' is required")
    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  // ─── 3. Tenant-Scoped Brand Brain Retrieval ────────────────────────────────
  it('3. retrieves tenant-scoped Brand Brain items and passes verified context to Gemini', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: MOCK_RESEARCH_JSON })
      .mockResolvedValueOnce({ text: MOCK_IDEATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_GENERATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_QA_AUDIT_PASSED_JSON })

    const mockKnowledgeItems = [
      {
        id: 'k-1',
        client_id: 'client-apex-101',
        category: 'compliance',
        question_or_topic: 'HIPAA Compliance Policy',
        verified_content: 'All patient intake data must be encrypted in transit and at rest with zero data retention on unverified nodes.',
      },
    ]

    const result = await executeSocialMediaRunner({
      clientId: 'client-apex-101',
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      customKnowledgeItems: mockKnowledgeItems,
      persistExecution: false,
    })

    expect(result.success).toBe(true)
    // Verify Stage 1 prompt received the verified knowledge
    const stage1Call = mockGenerateText.mock.calls[0][0]
    expect(stage1Call.prompt).toContain('HIPAA Compliance Policy')
    expect(stage1Call.prompt).toContain('All patient intake data must be encrypted')
  })

  // ─── 4. Stage 1: Research Synthesis ────────────────────────────────────────
  it('4. executes Research Synthesis stage and validates output contract', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: MOCK_RESEARCH_JSON })

    const output = await executeResearchStage(
      {
        industry: 'Healthcare',
        topics: ['AI in Medicine'],
        targetAudience: 'Doctors',
      },
      mockGeminiClient
    )

    expect(output.trendingThemes).toHaveLength(3)
    expect(output.audiencePainPoints).toHaveLength(2)
    expect(output.researchNotes).toContain('bottleneck')
  })

  // ─── 5. Stage 2: Content Ideas ─────────────────────────────────────────────
  it('5. executes Content Ideas stage and validates output angles and formats', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: MOCK_IDEATION_JSON })

    const researchOutput = JSON.parse(MOCK_RESEARCH_JSON)
    const output = await executeIdeationStage(
      {
        research: researchOutput,
        brandVoice: 'Professional',
        targetAudience: 'Clinicians',
        contentPillars: ['Efficiency', 'Care'],
      },
      mockGeminiClient
    )

    expect(output.angles).toHaveLength(3)
    expect(output.angles[0].hook).toContain('Most clinic front desks')
    expect(output.angles[0].format).toBe('thought_leadership')
    expect(output.angles[0].recommendedPlatforms).toContain('linkedin')
  })

  // ─── 6. Stage 3: Content Generation ────────────────────────────────────────
  it('6. executes Content Generation stage and validates platform-specific copy', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: MOCK_GENERATION_JSON })

    const ideationOutput = JSON.parse(MOCK_IDEATION_JSON)
    const output = await executeGenerationStage(
      {
        angles: ideationOutput.angles,
        brandVoice: 'Authoritative',
        platforms: ['linkedin', 'x', 'instagram'],
        callToAction: 'Book a demo',
      },
      mockGeminiClient
    )

    expect(output.posts).toHaveLength(3)
    const linkedinPost = output.posts.find((p) => p.platform === 'linkedin')
    expect(linkedinPost).toBeDefined()
    expect(linkedinPost?.hashtags).toContain('#HealthcareInnovation')
    expect(linkedinPost?.characterCount).toBeGreaterThan(100)
    expect(linkedinPost?.suggestedVisualBrief).toBeDefined()
  })

  // ─── 7. Stage 4: Brand & Compliance QA ─────────────────────────────────────
  it('7. audits content with 4-dimension rubric and correctly detects ungrounded claims', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: MOCK_QA_AUDIT_FLAGGED_JSON })

    const generationOutput = JSON.parse(MOCK_GENERATION_JSON)
    const output = await executeBrandQaStage(
      {
        posts: generationOutput.posts.slice(0, 1),
        brandVoice: 'Authoritative',
        complianceRules: 'Zero unauthorized promises',
      },
      mockGeminiClient
    )

    expect(output.auditResults).toHaveLength(1)
    const audit = output.auditResults[0]
    expect(audit.overallScore).toBe(58)
    expect(audit.passed).toBe(false)
    expect(audit.violations.length).toBeGreaterThan(0)
    expect(audit.violations[0]).toContain('Fabricated claim')
    expect(audit.rubricBreakdown.factualGrounding).toBeLessThan(15)
    expect(output.allPassed).toBe(false)
  })

  // ─── 8. Structured Output Validation ───────────────────────────────────────
  it('8. cleanly parses markdown-wrapped JSON codeblocks from model responses', () => {
    const wrappedJson = '```json\n{"trendingThemes": ["AI in Healthcare"], "audiencePainPoints": ["Burnout"], "researchNotes": "Summary"}\n```'
    const parsed = parseStageJsonResponse<{ trendingThemes: string[] }>(wrappedJson, 'test_stage')
    expect(parsed.trendingThemes).toEqual(['AI in Healthcare'])
  })

  // ─── 9. Malformed JSON / Output Handling ───────────────────────────────────
  it('9. fails safely with explicit validation error when Gemini returns malformed output', async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'This is plain unparseable text instead of JSON.' })

    await expect(
      executeResearchStage(
        {
          industry: 'Healthcare',
          topics: ['AI'],
        },
        mockGeminiClient
      )
    ).rejects.toThrow(/Stage 'stage_1_research' returned malformed JSON/)
  })

  // ─── 10. Gemini Provider Failure ───────────────────────────────────────────
  it('10. handles Gemini provider network/API failure cleanly without crashing', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('Google Generative AI 503: Service Unavailable'))

    const result = await executeSocialMediaRunner({
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      persistExecution: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Google Generative AI 503')
  })

  // ─── 11. Missing Gemini Configuration ──────────────────────────────────────
  it('11. returns explicit error when Gemini credentials are missing without faking execution', async () => {
    const unconfiguredGemini = {
      isAvailable: vi.fn().mockReturnValue(false),
    } as unknown as Gemini

    const result = await executeSocialMediaRunner({
      config: VALID_CONFIG,
      geminiClient: unconfiguredGemini,
      persistExecution: false,
    })

    expect(result.success).toBe(false)
    expect(result.failedStageId).toBe('provider_check')
    expect(result.error).toContain('Gemini API credentials unavailable')
    expect(result.contentPackage).toBeUndefined()
  })

  // ─── 12. Tenant Authorization & Scoping ────────────────────────────────────
  it('12. server action rejects unauthorized or unverified tenant IDs', async () => {
    const result = await executeSocialMediaRecipe({
      recipeSlug: 'social-media-marketing',
      config: VALID_CONFIG,
      clientId: 'unauthorized-tenant-rogue-999',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unauthorized or unverified tenant identifier')
  })

  // ─── 13. Execution Persistence ─────────────────────────────────────────────
  it('13. records workflow steps and execution audit trail into workflow_executions', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: MOCK_RESEARCH_JSON })
      .mockResolvedValueOnce({ text: MOCK_IDEATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_GENERATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_QA_AUDIT_PASSED_JSON })

    const result = await executeSocialMediaRunner({
      clientId: 'client-apex-101',
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      persistExecution: true,
    })

    expect(result.success).toBe(true)
    expect(saveWorkflowExecution).toHaveBeenCalledTimes(1)
    const savedRecord = vi.mocked(saveWorkflowExecution).mock.calls[0][0]
    expect(savedRecord.workflowId).toBe('spec_social_media_marketing_v1')
    expect(savedRecord.steps).toHaveLength(4)
    expect(savedRecord.steps[0].stepId).toBe('stage_1_research')
    expect(savedRecord.steps[1].stepId).toBe('stage_2_content_ideas')
    expect(savedRecord.steps[2].stepId).toBe('stage_3_content_generation')
    expect(savedRecord.steps[3].stepId).toBe('stage_4_brand_qa')
  })

  // ─── 14. Pending Approval State ────────────────────────────────────────────
  it('14. sets content package approval status to pending_approval for human sign-off seam', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: MOCK_RESEARCH_JSON })
      .mockResolvedValueOnce({ text: MOCK_IDEATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_GENERATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_QA_AUDIT_PASSED_JSON })

    const result = await executeSocialMediaRunner({
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      persistExecution: false,
    })

    expect(result.success).toBe(true)
    expect(result.contentPackage?.approvalStatus).toBe('pending_approval')
  })

  // ─── 15. Complete End-to-End Four-Stage Pipeline ───────────────────────────
  it('15. executes all 4 stages sequentially into a complete structured content package', async () => {
    mockGenerateText
      .mockResolvedValueOnce({ text: MOCK_RESEARCH_JSON })
      .mockResolvedValueOnce({ text: MOCK_IDEATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_GENERATION_JSON })
      .mockResolvedValueOnce({ text: MOCK_QA_AUDIT_PASSED_JSON })

    const result = await executeSocialMediaRunner({
      clientId: 'client-apex-101',
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      persistExecution: false,
    })

    expect(result.success).toBe(true)
    const pkg = result.contentPackage as SocialMediaContentPackage
    expect(pkg.employeeSlug).toBe('social-media-marketing')
    expect(pkg.executionId).toMatch(/^exec-smm-/)
    expect(pkg.research.trendingThemes).toHaveLength(3)
    expect(pkg.contentIdeas.angles).toHaveLength(3)
    expect(pkg.generatedContent.posts).toHaveLength(3)
    expect(pkg.qualityAssurance.allPassed).toBe(true)
    expect(pkg.qualityAssurance.averageScore).toBe(90)
    expect(pkg.approvalStatus).toBe('pending_approval')
  })

  // ─── 16. Sensitive Information Protection ──────────────────────────────────
  it('16. ensures API keys, tokens, and credentials are redacted from logs and errors', async () => {
    mockGenerateText.mockRejectedValueOnce(
      new Error('Failed request with AIzaSyD982347829384729384729348234 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0')
    )

    const result = await executeSocialMediaRunner({
      config: VALID_CONFIG,
      geminiClient: mockGeminiClient,
      persistExecution: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).not.toContain('AIzaSyD982347829384729384729348234')
    expect(result.error).toContain('[REDACTED_API_KEY]')
  })
})