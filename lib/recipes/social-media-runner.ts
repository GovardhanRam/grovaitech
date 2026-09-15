/**
 * Grovaitech AI Platform
 * lib/recipes/social-media-runner.ts
 *
 * Autonomous Recipe Execution Engine for:
 * "Social Media Marketing AI Employee" (social-media-marketing)
 *
 * Executes the 4 foundational AI stages:
 *   1. Research Synthesis (stage_1_research)
 *   2. Content Ideas (stage_2_content_ideas)
 *   3. Content Generation (stage_3_content_generation)
 *   4. Brand & Compliance QA (stage_4_brand_qa)
 *
 * Followed by bundling into a Structured Content Package ready for:
 *   Stage 6: Human Approval Seam (pending_approval)
 *
 * CRITICAL ARCHITECTURAL RULES:
 * - Real production execution only: NEVER silently returns mock/simulated content when credentials are missing.
 * - Grounded in Company/Brand Brain (client_knowledge_items).
 * - Sanitizes credentials and secrets in all execution logs and persistence records.
 * - Strict schema validation at every stage boundary.
 */

import { Gemini } from '@/lib/ai/gemini'
import {
  listClientKnowledge,
  isValidTenantId,
  type ClientKnowledgeItem,
} from '@/lib/knowledge'
import { getRecipeBySlug } from '@/lib/recipes/registry'
import {
  saveWorkflowExecution,
  type WorkflowExecutionResult,
  type WorkflowStepResult,
} from '@/lib/workflows/executor'

// ─── Stage Data Contracts ───────────────────────────────────────────────────

export interface ResearchStageInput {
  industry: string
  topics: string[]
  knowledgeSources?: string[]
  brandContext?: string
  targetAudience?: string
}

export interface ResearchStageOutput {
  trendingThemes: string[]
  audiencePainPoints: string[]
  researchNotes: string
}

export interface ContentAngle {
  hook: string
  format: 'thought_leadership' | 'case_study' | 'how_to' | 'contrarian_take' | 'story'
  coreConcept: string
  recommendedPlatforms: string[]
}

export interface IdeationStageInput {
  research: ResearchStageOutput
  brandVoice: string
  targetAudience: string
  contentPillars: string[]
}

export interface IdeationStageOutput {
  angles: ContentAngle[]
}

export interface GenerationStageInput {
  angles: ContentAngle[]
  brandVoice: string
  platforms: Array<'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube'>
  callToAction?: string
  brandContext?: string
}

export interface DraftPost {
  id: string
  platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube'
  content: string
  characterCount: number
  hashtags: string[]
  callToAction: string
  suggestedVisualBrief: string
}

export interface GenerationStageOutput {
  posts: DraftPost[]
}

export interface PostAuditResult {
  postId: string
  overallScore: number // 0-100
  passed: boolean // score >= 75
  rubricBreakdown: {
    toneConsistency: number // 0-25
    complianceSafety: number // 0-25
    factualGrounding: number // 0-25
    platformFormat: number // 0-25
  }
  violations: string[]
  refinementsApplied?: string
  finalContent: string
}

export interface BrandQaStageInput {
  posts: DraftPost[]
  brandVoice: string
  brandGuidelines?: string
  complianceRules?: string
  brandContext?: string
}

export interface BrandQaStageOutput {
  auditResults: PostAuditResult[]
  allPassed: boolean
  averageScore: number
}

export interface SocialMediaContentPackage {
  employeeSlug: 'social-media-marketing'
  executionId: string
  generatedAt: string
  research: ResearchStageOutput
  contentIdeas: IdeationStageOutput
  generatedContent: GenerationStageOutput
  qualityAssurance: BrandQaStageOutput
  approvalStatus: 'pending_approval'
}

export interface ExecuteSocialMediaRunnerOptions {
  clientId?: string
  config: Record<string, any>
  geminiClient?: Gemini // Optional injection for testing
  persistExecution?: boolean
  customKnowledgeItems?: ClientKnowledgeItem[] // Optional preloaded items for testing
}

export interface ExecuteSocialMediaRunnerResult {
  success: boolean
  contentPackage?: SocialMediaContentPackage
  workflowResult?: WorkflowExecutionResult
  error?: string
  failedStageId?: string
}

// ─── Helpers: JSON Sanitization & Parsing ────────────────────────────────────

/**
 * Extracts and parses clean JSON from Gemini response, stripping markdown codeblocks if present.
 */
export function parseStageJsonResponse<T>(rawText: string, stageName: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error(`[Stage Validation Error] Stage '${stageName}' returned empty output.`)
  }

  let cleaned = rawText.trim()

  // Strip markdown code fences (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    const firstLineEnd = cleaned.indexOf('\n')
    if (firstLineEnd !== -1) {
      cleaned = cleaned.substring(firstLineEnd + 1)
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3)
    }
    cleaned = cleaned.trim()
  }

  try {
    return JSON.parse(cleaned) as T
  } catch (err: any) {
    throw new Error(
      `[Stage Validation Error] Stage '${stageName}' returned malformed JSON: ${err?.message || 'Invalid syntax'}`
    )
  }
}

/**
 * Masks any potential leaked credentials or tokens in log strings.
 */
function sanitizeLog(text: string): string {
  if (!text) return ''
  return text
    .replace(/(?:AIza[0-9A-Za-z-_]{20,})/g, '[REDACTED_API_KEY]')
    .replace(/(?:Bearer\s+[A-Za-z0-9._~+/-]+=*)/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(?:ghp_[0-9A-Za-z]{20,})/g, '[REDACTED_TOKEN]')
    .replace(/(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/g, '[REDACTED_JWT]')
    .slice(0, 300)
}

// ─── Stage 1: Research Synthesis ─────────────────────────────────────────────

export async function executeResearchStage(
  input: ResearchStageInput,
  gemini: Gemini
): Promise<ResearchStageOutput> {
  const systemInstruction = `You are GrovAI Research Synthesis Engine for Grovaitech AI Workforce OS.
Your objective is to synthesize market discussions, audience themes, and industry pain points for content planning.

CRITICAL ACCURACY & GROUNDING RULES:
1. Ground your synthesis strictly in the provided company profile, industry, and brand facts.
2. Clearly distinguish supplied brand knowledge from general model synthesis.
3. Do NOT fabricate statistics, specific studies, current events, or external live web research.
4. Output valid JSON only conforming to the requested schema.`

  const prompt = `Perform Research Synthesis for the following marketing profile:

Industry: ${input.industry}
Target Audience: ${input.targetAudience || 'General audience'}
Focus Topics: ${input.topics.join(', ')}
${input.knowledgeSources && input.knowledgeSources.length > 0 ? `Knowledge Sources: ${input.knowledgeSources.join(', ')}` : ''}
${input.brandContext ? `Company Verified Context: ${input.brandContext}` : ''}

Output valid JSON only with this schema:
{
  "trendingThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "audiencePainPoints": ["Pain Point 1", "Pain Point 2", "Pain Point 3"],
  "researchNotes": "Summary of research synthesis and strategic implications."
}`

  const response = await gemini.generateText({
    prompt,
    systemInstruction,
    temperature: 0.3,
    responseMimeType: 'application/json',
    throwOnError: true,
  })

  const output = parseStageJsonResponse<ResearchStageOutput>(response.text, 'stage_1_research')

  // Validation
  if (!Array.isArray(output.trendingThemes) || output.trendingThemes.length === 0) {
    throw new Error("[Stage Validation Error] Stage 1 (Research Synthesis) must produce at least one trending theme.")
  }
  if (!Array.isArray(output.audiencePainPoints) || output.audiencePainPoints.length === 0) {
    throw new Error("[Stage Validation Error] Stage 1 (Research Synthesis) must produce at least one audience pain point.")
  }
  if (!output.researchNotes || typeof output.researchNotes !== 'string') {
    throw new Error("[Stage Validation Error] Stage 1 (Research Synthesis) must provide research notes.")
  }

  return {
    trendingThemes: output.trendingThemes.map((t) => String(t).trim()).filter(Boolean),
    audiencePainPoints: output.audiencePainPoints.map((p) => String(p).trim()).filter(Boolean),
    researchNotes: String(output.researchNotes).trim(),
  }
}

// ─── Stage 2: Content Ideas ──────────────────────────────────────────────────

export async function executeIdeationStage(
  input: IdeationStageInput,
  gemini: Gemini
): Promise<IdeationStageOutput> {
  const systemInstruction = `You are GrovAI Content Ideation Specialist for Grovaitech AI Workforce OS.
Your objective is to transform research themes and audience pain points into 3-5 structured, differentiated content angles and high-performing hooks.

RULES:
1. Generate specific, compelling hooks.
2. Avoid generic clichés (such as "5 tips for success" or "Are you ready?") unless strictly justified.
3. Align with the requested brand voice: "${input.brandVoice}".
4. Output valid JSON only conforming to the requested schema.`

  const prompt = `Synthesize content angles based on the following research:

Research Themes: ${input.research.trendingThemes.join(' | ')}
Audience Pain Points: ${input.research.audiencePainPoints.join(' | ')}
Brand Voice: ${input.brandVoice}
Target Audience: ${input.targetAudience}
Content Pillars: ${input.contentPillars.join(', ')}

Output valid JSON only with this schema:
{
  "angles": [
    {
      "hook": "Compelling opening hook sentence",
      "format": "thought_leadership" | "case_study" | "how_to" | "contrarian_take" | "story",
      "coreConcept": "Core premise and value provided in the post",
      "recommendedPlatforms": ["linkedin", "x", "instagram"]
    }
  ]
}`

  const response = await gemini.generateText({
    prompt,
    systemInstruction,
    temperature: 0.5,
    responseMimeType: 'application/json',
    throwOnError: true,
  })

  const output = parseStageJsonResponse<IdeationStageOutput>(response.text, 'stage_2_content_ideas')

  // Validation
  if (!Array.isArray(output.angles) || output.angles.length === 0) {
    throw new Error("[Stage Validation Error] Stage 2 (Ideation) must produce at least one content angle.")
  }

  const validFormats = new Set(['thought_leadership', 'case_study', 'how_to', 'contrarian_take', 'story'])

  const validatedAngles: ContentAngle[] = output.angles.map((a, idx) => {
    if (!a.hook || typeof a.hook !== 'string') {
      throw new Error(`[Stage Validation Error] Content angle at index ${idx} is missing a hook.`)
    }
    const format = validFormats.has(a.format) ? a.format : 'thought_leadership'
    return {
      hook: String(a.hook).trim(),
      format: format as ContentAngle['format'],
      coreConcept: String(a.coreConcept || a.hook).trim(),
      recommendedPlatforms: Array.isArray(a.recommendedPlatforms)
        ? a.recommendedPlatforms.map((p) => String(p).toLowerCase().trim())
        : ['linkedin', 'x'],
    }
  })

  return { angles: validatedAngles }
}

// ─── Stage 3: Content Generation ─────────────────────────────────────────────

export async function executeGenerationStage(
  input: GenerationStageInput,
  gemini: Gemini
): Promise<GenerationStageOutput> {
  const systemInstruction = `You are GrovAI Content Generation Specialist for Grovaitech AI Workforce OS.
Your objective is to craft platform-tailored social media posts for the requested platforms using the approved angles.

PLATFORM GUIDELINES:
- linkedin: Professional, structured paragraphs, strong hook, whitespace, 3-5 hashtags, clear business call to action.
- x: Punchy, high-signal, under 280 characters if single post, minimal hashtags (1-2).
- instagram: Engaging storytelling, clean formatting with line breaks, visual prompt directive, relevant community hashtags.
- facebook: Friendly, community-oriented, open-ended question.
- youtube: Community feed announcement format.

CRITICAL INTEGRITY RULE:
Do NOT claim that content has been published.
Output valid JSON only conforming to the schema.`

  const anglesSummary = input.angles
    .map((a, i) => `Angle ${i + 1} (${a.format}): "${a.hook}" -> ${a.coreConcept}`)
    .join('\n')

  const prompt = `Generate platform-specific social posts for the following specifications:

Brand Voice: ${input.brandVoice}
Requested Platforms: ${input.platforms.join(', ')}
${input.callToAction ? `Call To Action: ${input.callToAction}` : ''}
${input.brandContext ? `Brand Guidelines Context: ${input.brandContext}` : ''}

Selected Content Angles:
${anglesSummary}

For each requested platform, draft at least one high-converting post adhering to platform character limits.

Output valid JSON only with this schema:
{
  "posts": [
    {
      "id": "post-platform-1",
      "platform": "linkedin" | "x" | "instagram" | "facebook" | "youtube",
      "content": "Full post text including formatting",
      "characterCount": 120,
      "hashtags": ["#Tag1", "#Tag2"],
      "callToAction": "Call to action text",
      "suggestedVisualBrief": "Description of suggested image or graphic card"
    }
  ]
}`

  const response = await gemini.generateText({
    prompt,
    systemInstruction,
    temperature: 0.6,
    responseMimeType: 'application/json',
    throwOnError: true,
  })

  const output = parseStageJsonResponse<GenerationStageOutput>(response.text, 'stage_3_content_generation')

  if (!Array.isArray(output.posts) || output.posts.length === 0) {
    throw new Error("[Stage Validation Error] Stage 3 (Generation) must produce at least one draft post.")
  }

  const validPlatforms = new Set(['linkedin', 'x', 'instagram', 'facebook', 'youtube'])

  const validatedPosts: DraftPost[] = output.posts.map((p, idx) => {
    if (!p.content || typeof p.content !== 'string' || !p.content.trim()) {
      throw new Error(`[Stage Validation Error] Post at index ${idx} contains empty content.`)
    }
    const cleanContent = p.content.trim()
    const platform = validPlatforms.has(p.platform?.toLowerCase())
      ? (p.platform.toLowerCase() as DraftPost['platform'])
      : input.platforms[0] || 'linkedin'

    return {
      id: p.id || `post-${platform}-${idx + 1}`,
      platform,
      content: cleanContent,
      characterCount: cleanContent.length,
      hashtags: Array.isArray(p.hashtags)
        ? p.hashtags.map((h) => String(h).trim()).filter(Boolean)
        : [],
      callToAction: String(p.callToAction || input.callToAction || '').trim(),
      suggestedVisualBrief: String(
        p.suggestedVisualBrief || `Visual concept supporting ${platform} post on ${p.hashtags?.[0] || 'topic'}`
      ).trim(),
    }
  })

  return { posts: validatedPosts }
}

// ─── Stage 4: Brand + Compliance QA ──────────────────────────────────────────

export async function executeBrandQaStage(
  input: BrandQaStageInput,
  gemini: Gemini
): Promise<BrandQaStageOutput> {
  const systemInstruction = `You are GrovAI Brand & Compliance QA Inspector for Grovaitech AI Workforce OS.
Your objective is to evaluate drafted social media posts against brand guidelines, compliance rules, and factual grounding.

SCORING RUBRIC (Each 0 - 25, Overall = Sum 0 - 100, Pass Threshold >= 75):
1. toneConsistency (0-25): Does the tone accurately match "${input.brandVoice}"?
2. complianceSafety (0-25): Does it respect compliance rules? (Deduct heavily for unauthorized financial/medical claims, ungrounded guarantees, offensive phrasing).
3. factualGrounding (0-25): Are facts verifiable? CRITICAL RULE: If content claims "Studies show...", fabricated statistics, or specific unverifiable facts NOT supported in supplied brand knowledge, flag it and penalize this score!
4. platformFormat (0-25): Does it obey character constraints, structure, and readability for the target platform?

Output valid JSON only conforming to the schema.`

  const postsSummary = input.posts
    .map(
      (p) => `---
Post ID: ${p.id}
Platform: ${p.platform}
Length: ${p.characterCount} chars
Content:
${p.content}`
    )
    .join('\n\n')

  const prompt = `Audit the following draft posts:

Brand Voice Requirement: ${input.brandVoice}
${input.brandGuidelines ? `Brand Guidelines: ${input.brandGuidelines}` : ''}
${input.complianceRules ? `Compliance Rules: ${input.complianceRules}` : ''}
${input.brandContext ? `Supplied Company Truth / Verified Facts: ${input.brandContext}` : ''}

Draft Posts to Audit:
${postsSummary}

Audit every post individually.
Output valid JSON only with this schema:
{
  "auditResults": [
    {
      "postId": "post-id",
      "overallScore": 88,
      "passed": true,
      "rubricBreakdown": {
        "toneConsistency": 22,
        "complianceSafety": 23,
        "factualGrounding": 21,
        "platformFormat": 22
      },
      "violations": ["Specific violation description if any, otherwise empty array"],
      "refinementsApplied": "Optional note if small adjustments were made to improve compliance",
      "finalContent": "The finalized compliant post text"
    }
  ]
}`

  const response = await gemini.generateText({
    prompt,
    systemInstruction,
    temperature: 0.2,
    responseMimeType: 'application/json',
    throwOnError: true,
  })

  const output = parseStageJsonResponse<BrandQaStageOutput>(response.text, 'stage_4_brand_qa')

  if (!Array.isArray(output.auditResults) || output.auditResults.length === 0) {
    throw new Error("[Stage Validation Error] Stage 4 (Brand QA) must produce audit results for all posts.")
  }

  const validatedAudits: PostAuditResult[] = output.auditResults.map((audit) => {
    const tone = Math.min(25, Math.max(0, Number(audit.rubricBreakdown?.toneConsistency) || 20))
    const comp = Math.min(25, Math.max(0, Number(audit.rubricBreakdown?.complianceSafety) || 20))
    const fact = Math.min(25, Math.max(0, Number(audit.rubricBreakdown?.factualGrounding) || 20))
    const plat = Math.min(25, Math.max(0, Number(audit.rubricBreakdown?.platformFormat) || 20))
    const computedScore = tone + comp + fact + plat
    const passed = computedScore >= 75

    // Match matching original post for fallback text
    const originalPost = input.posts.find((p) => p.id === audit.postId) || input.posts[0]

    return {
      postId: audit.postId || originalPost.id,
      overallScore: computedScore,
      passed,
      rubricBreakdown: {
        toneConsistency: tone,
        complianceSafety: comp,
        factualGrounding: fact,
        platformFormat: plat,
      },
      violations: Array.isArray(audit.violations)
        ? audit.violations.map((v) => String(v).trim()).filter(Boolean)
        : [],
      refinementsApplied: audit.refinementsApplied ? String(audit.refinementsApplied).trim() : undefined,
      finalContent: audit.finalContent ? String(audit.finalContent).trim() : originalPost.content,
    }
  })

  const allPassed = validatedAudits.every((a) => a.passed)
  const averageScore = Math.round(
    validatedAudits.reduce((acc, a) => acc + a.overallScore, 0) / validatedAudits.length
  )

  return {
    auditResults: validatedAudits,
    allPassed,
    averageScore,
  }
}

// ─── Main Orchestrator: Social Media Recipe Runner ───────────────────────────

/**
 * Runs the end-to-end 4-stage autonomous content pipeline for the Social Media Marketing Employee.
 */
export async function executeSocialMediaRunner(
  options: ExecuteSocialMediaRunnerOptions
): Promise<ExecuteSocialMediaRunnerResult> {
  const {
    clientId,
    config,
    geminiClient,
    persistExecution = true,
    customKnowledgeItems,
  } = options

  const executionId = `exec-smm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  const startedAt = new Date().toISOString()
  const stepResults: WorkflowStepResult[] = []

  // 1. Validate Recipe Configuration
  const recipe = getRecipeBySlug('social-media-marketing')
  if (!recipe) {
    return {
      success: false,
      error: "Social Media Marketing AI Employee recipe is not registered in workforce catalog.",
    }
  }

  const validation = recipe.configurationSchema.validate(config)
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid recipe configuration: ${validation.errors.join(', ')}`,
      failedStageId: 'config_validation',
    }
  }

  // 2. Validate Gemini Provider Credentials
  const gemini = geminiClient || new Gemini()
  if (!gemini.isAvailable()) {
    return {
      success: false,
      error: 'Gemini API credentials unavailable: GEMINI_API_KEY is not configured. Real AI execution requires active Gemini credentials.',
      failedStageId: 'provider_check',
    }
  }

  // 3. Resolve Company / Brand Brain Context
  let brandContextSnippets: string[] = []

  // Extract from recipe configuration
  if (config.businessName) brandContextSnippets.push(`Business Name: ${config.businessName}`)
  if (config.industry) brandContextSnippets.push(`Industry: ${config.industry}`)
  if (config.brandVoice) brandContextSnippets.push(`Brand Voice: ${config.brandVoice}`)
  if (config.targetAudience) brandContextSnippets.push(`Target Audience: ${config.targetAudience}`)
  if (config.brandGuidelines) brandContextSnippets.push(`Brand Guidelines: ${config.brandGuidelines}`)
  if (config.complianceRules) brandContextSnippets.push(`Compliance Rules: ${config.complianceRules}`)
  if (config.website) brandContextSnippets.push(`Website: ${config.website}`)

  // Retrieve tenant-scoped knowledge items from database if clientId is provided
  if (clientId && isValidTenantId(clientId)) {
    try {
      const dbItems = customKnowledgeItems || (await listClientKnowledge(clientId))
      if (Array.isArray(dbItems) && dbItems.length > 0) {
        const knowledgeText = dbItems
          .map((k) => `[Verified ${k.category.toUpperCase()}]: ${k.question_or_topic} - ${k.verified_content}`)
          .join('\n')
        brandContextSnippets.push(`Tenant Verified Knowledge:\n${knowledgeText}`)
      }
    } catch (err: any) {
      console.warn('[Social Media Runner] Notice loading tenant brand knowledge:', sanitizeLog(err?.message))
    }
  } else if (customKnowledgeItems && Array.isArray(customKnowledgeItems)) {
    const knowledgeText = customKnowledgeItems
      .map((k) => `[Verified ${k.category.toUpperCase()}]: ${k.question_or_topic} - ${k.verified_content}`)
      .join('\n')
    brandContextSnippets.push(`Supplied Verified Knowledge:\n${knowledgeText}`)
  }

  const consolidatedBrandContext = brandContextSnippets.join('\n\n')

  try {
    // ── STAGE 1: Research Synthesis ──────────────────────────────────────────
    const stage1Start = Date.now()
    const topics = Array.isArray(config.contentTopics) && config.contentTopics.length > 0
      ? config.contentTopics
      : Array.isArray(config.contentPillars) && config.contentPillars.length > 0
      ? config.contentPillars
      : [config.industry || 'Industry News']

    const knowledgeSources = Array.isArray(config.knowledgeSources) ? config.knowledgeSources : []

    const researchOutput = await executeResearchStage(
      {
        industry: config.industry,
        topics,
        knowledgeSources,
        brandContext: consolidatedBrandContext,
        targetAudience: config.targetAudience,
      },
      gemini
    )

    stepResults.push({
      stepId: 'stage_1_research',
      stepName: 'Research Synthesis',
      type: 'ai_research',
      status: 'success',
      target: 'gemini',
      durationMs: Date.now() - stage1Start,
      detail: `Synthesized ${researchOutput.trendingThemes.length} trending themes and ${researchOutput.audiencePainPoints.length} pain points.`,
      payload: {
        trendingThemes: researchOutput.trendingThemes,
        audiencePainPoints: researchOutput.audiencePainPoints,
      },
    })

    // ── STAGE 2: Content Ideas ───────────────────────────────────────────────
    const stage2Start = Date.now()
    const contentPillars = Array.isArray(config.contentPillars) && config.contentPillars.length > 0
      ? config.contentPillars
      : topics

    const ideationOutput = await executeIdeationStage(
      {
        research: researchOutput,
        brandVoice: config.brandVoice,
        targetAudience: config.targetAudience,
        contentPillars,
      },
      gemini
    )

    stepResults.push({
      stepId: 'stage_2_content_ideas',
      stepName: 'Content Ideas',
      type: 'ai_ideation',
      status: 'success',
      target: 'gemini',
      durationMs: Date.now() - stage2Start,
      detail: `Generated ${ideationOutput.angles.length} content angles across ${contentPillars.length} content pillars.`,
      payload: { anglesCount: ideationOutput.angles.length },
    })

    // ── STAGE 3: Content Generation ──────────────────────────────────────────
    const stage3Start = Date.now()
    const platforms = Array.isArray(config.platforms) && config.platforms.length > 0
      ? config.platforms
      : ['linkedin', 'x']

    const generationOutput = await executeGenerationStage(
      {
        angles: ideationOutput.angles,
        brandVoice: config.brandVoice,
        platforms,
        callToAction: config.callToAction,
        brandContext: consolidatedBrandContext,
      },
      gemini
    )

    stepResults.push({
      stepId: 'stage_3_content_generation',
      stepName: 'Content Generation',
      type: 'ai_generation',
      status: 'success',
      target: 'gemini',
      durationMs: Date.now() - stage3Start,
      detail: `Drafted ${generationOutput.posts.length} platform-tailored posts for ${platforms.join(', ')}.`,
      payload: { postCount: generationOutput.posts.length },
    })

    // ── STAGE 4: Brand + Compliance QA ───────────────────────────────────────
    const stage4Start = Date.now()
    const qaOutput = await executeBrandQaStage(
      {
        posts: generationOutput.posts,
        brandVoice: config.brandVoice,
        brandGuidelines: config.brandGuidelines,
        complianceRules: config.complianceRules,
        brandContext: consolidatedBrandContext,
      },
      gemini
    )

    stepResults.push({
      stepId: 'stage_4_brand_qa',
      stepName: 'Brand & Compliance QA',
      type: 'ai_qa_audit',
      status: qaOutput.allPassed ? 'success' : 'simulated',
      target: 'gemini',
      durationMs: Date.now() - stage4Start,
      detail: `QA Audit completed. Average Score: ${qaOutput.averageScore}/100. Status: ${qaOutput.allPassed ? 'PASSED' : 'REFINEMENTS_NEEDED'}.`,
      payload: {
        averageScore: qaOutput.averageScore,
        allPassed: qaOutput.allPassed,
        auditsCount: qaOutput.auditResults.length,
      },
    })

    // ── BUNDLE STRUCTURED CONTENT PACKAGE ────────────────────────────────────
    const contentPackage: SocialMediaContentPackage = {
      employeeSlug: 'social-media-marketing',
      executionId,
      generatedAt: new Date().toISOString(),
      research: researchOutput,
      contentIdeas: ideationOutput,
      generatedContent: generationOutput,
      qualityAssurance: qaOutput,
      approvalStatus: 'pending_approval',
    }

    // ── PERSIST WORKFLOW EXECUTION ───────────────────────────────────────────
    const workflowResult: WorkflowExecutionResult = {
      executionId,
      workflowId: 'spec_social_media_marketing_v1',
      workflowName: 'Social Media Marketing Workflow Specification',
      leadId: clientId || '',
      conversationId: '',
      triggerEvent: 'Social Media Autonomous Generation Run',
      overallStatus: qaOutput.allPassed ? 'success' : 'partial',
      hasSimulatedSteps: !qaOutput.allPassed,
      failedStepIds: [],
      customerConfirmationAllowed: false, // Human approval required before publishing
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
      steps: stepResults,
      n8nResult: { status: 'not_configured' },
    }

    if (persistExecution) {
      await saveWorkflowExecution(workflowResult, config.businessName || 'Social Media Client')
    }

    return {
      success: true,
      contentPackage,
      workflowResult,
    }
  } catch (err: any) {
    const errorMessage = sanitizeLog(err?.message || 'Execution error')

    // Construct failure audit step
    stepResults.push({
      stepId: 'stage_execution_error',
      stepName: 'Execution Failure',
      type: 'error',
      status: 'failed',
      target: 'gemini',
      durationMs: 0,
      detail: errorMessage,
    })

    const failedWorkflowResult: WorkflowExecutionResult = {
      executionId,
      workflowId: 'spec_social_media_marketing_v1',
      workflowName: 'Social Media Marketing Workflow Specification',
      leadId: clientId || '',
      conversationId: '',
      triggerEvent: 'Social Media Autonomous Generation Run',
      overallStatus: 'failed',
      hasSimulatedSteps: false,
      failedStepIds: ['stage_execution_error'],
      customerConfirmationAllowed: false,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
      steps: stepResults,
      n8nResult: { status: 'failed' },
    }

    if (persistExecution) {
      await saveWorkflowExecution(failedWorkflowResult, config.businessName || 'Social Media Client')
    }

    return {
      success: false,
      error: `Stage execution failed: ${errorMessage}`,
      workflowResult: failedWorkflowResult,
    }
  }
}