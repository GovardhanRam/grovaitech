/**
 * Grovaitech AI Platform
 * lib/recipes/registry.ts
 *
 * Canonical Employee Recipe Registry.
 * Defines business-level AI Employee Recipes decoupled from raw execution engines.
 */

import type {
  EmployeeRecipe,
  EmployeeConfigurationSchema,
  WorkflowSpecification,
  WorkflowStage,
  ValidationResult,
} from './types'

// ─── Social Media Marketing Configuration Schema ──────────────────────────────

export const SOCIAL_MEDIA_CONFIG_SCHEMA: EmployeeConfigurationSchema = {
  version: '1.0.0',
  fields: [
    {
      name: 'businessName',
      label: 'Business Name',
      type: 'string',
      required: true,
      description: 'Official registered or trade name of the business.',
      placeholder: 'e.g. Apex Dynamics',
    },
    {
      name: 'industry',
      label: 'Industry',
      type: 'string',
      required: true,
      description: 'Primary market sector.',
      placeholder: 'e.g. B2B SaaS, Real Estate, Healthcare',
    },
    {
      name: 'targetAudience',
      label: 'Target Audience',
      type: 'string',
      required: true,
      description: 'Ideal customer profile and demographics.',
      placeholder: 'e.g. Founders, Marketing Directors, Home Buyers',
    },
    {
      name: 'brandVoice',
      label: 'Brand Voice',
      type: 'string',
      required: true,
      description: 'Tone and stylistic rules for generated content.',
      placeholder: 'e.g. Authoritative, witty, empathetic, institutional',
      defaultValue: 'Professional and authoritative',
    },
    {
      name: 'contentTopics',
      label: 'Content Topics & Themes',
      type: 'array',
      required: true,
      description: 'Core subject pillars the AI Employee should focus on.',
      placeholder: 'e.g. Industry trends, product tutorials, case studies',
      defaultValue: ['Industry Insights', 'Product Tips', 'Customer Success'],
    },
    {
      name: 'platforms',
      label: 'Target Platforms',
      type: 'multiselect',
      required: true,
      options: ['linkedin', 'instagram', 'facebook', 'youtube', 'x'],
      defaultValue: ['linkedin', 'x'],
      description: 'Social platforms where content will be prepared or scheduled.',
    },
    {
      name: 'postingFrequency',
      label: 'Posting Frequency',
      type: 'select',
      required: true,
      options: ['daily', '3_times_week', 'weekly', 'custom'],
      defaultValue: '3_times_week',
      description: 'Cadence of content delivery.',
    },
    {
      name: 'approvalMode',
      label: 'Approval Mode',
      type: 'select',
      required: true,
      options: ['human_approval', 'automatic'],
      defaultValue: 'human_approval',
      description: 'Whether posts require human sign-off before publishing.',
    },
    {
      name: 'callToAction',
      label: 'Primary Call To Action (CTA)',
      type: 'string',
      required: false,
      placeholder: 'e.g. Visit grovaitech.ai / Book a free audit',
    },
    {
      name: 'website',
      label: 'Business Website',
      type: 'string',
      required: false,
      placeholder: 'https://example.com',
    },
    {
      name: 'knowledgeSources',
      label: 'Knowledge Sources',
      type: 'array',
      required: false,
      description: 'Brand guides, whitepapers, or websites for grounding.',
      defaultValue: [],
    },
  ],
  validate(config: Record<string, any>): ValidationResult {
    const errors: string[] = []
    if (!config?.businessName || typeof config.businessName !== 'string' || !config.businessName.trim()) {
      errors.push("Field 'businessName' is required and must be a non-empty string.")
    }
    if (!config?.industry || typeof config.industry !== 'string' || !config.industry.trim()) {
      errors.push("Field 'industry' is required and must be a non-empty string.")
    }
    if (!config?.targetAudience || typeof config.targetAudience !== 'string' || !config.targetAudience.trim()) {
      errors.push("Field 'targetAudience' is required and must be a non-empty string.")
    }
    if (!config?.brandVoice || typeof config.brandVoice !== 'string' || !config.brandVoice.trim()) {
      errors.push("Field 'brandVoice' is required and must be a non-empty string.")
    }
    if (!config?.contentTopics || (!Array.isArray(config.contentTopics) && typeof config.contentTopics !== 'string')) {
      errors.push("Field 'contentTopics' is required.")
    }
    if (!config?.platforms || (Array.isArray(config.platforms) && config.platforms.length === 0)) {
      errors.push("At least one social platform must be selected in 'platforms'.")
    }
    if (!config?.postingFrequency) {
      errors.push("Field 'postingFrequency' is required.")
    }
    if (!config?.approvalMode) {
      errors.push("Field 'approvalMode' is required.")
    }
    return {
      valid: errors.length === 0,
      errors,
    }
  },
}

// ─── Social Media Marketing Workflow Specification ───────────────────────────

export const SOCIAL_MEDIA_WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'stage_1_research',
    name: 'Research Synthesis',
    description: 'Synthesizes industry topics, audience pain points, and supplied brand knowledge to discover high-affinity content themes.',
    order: 1,
    requiredCapability: 'content research',
    inputs: ['contentTopics', 'industry', 'knowledgeSources'],
    outputs: ['trendingTopics', 'researchSummaries', 'referenceLinks'],
    isImplemented: true,
    implementationStatus: 'implemented',
    providerSupport: ['native', 'n8n'],
    notes: 'Synthesizes verified Brand Brain knowledge, recipe configuration, and LLM domain knowledge without live web scraping.',
  },
  {
    id: 'stage_2_content_ideas',
    name: 'Content Ideas',
    description: 'Synthesizes research into 5-10 structured post angles, hooks, and content formats.',
    order: 2,
    requiredCapability: 'content ideation',
    inputs: ['trendingTopics', 'brandVoice', 'targetAudience'],
    outputs: ['contentHooks', 'selectedAngles', 'formatRecommendations'],
    isImplemented: true,
    implementationStatus: 'implemented',
    providerSupport: ['native', 'n8n'],
  },
  {
    id: 'stage_3_content_generation',
    name: 'Content Generation',
    description: 'Drafts platform-tailored copy (LinkedIn posts, X threads, Instagram captions) adhering to character constraints.',
    order: 3,
    requiredCapability: 'social media content generation',
    inputs: ['selectedAngles', 'brandVoice', 'platforms', 'callToAction'],
    outputs: ['draftPosts', 'hashtags', 'ctaVariations'],
    isImplemented: true,
    implementationStatus: 'implemented',
    providerSupport: ['native', 'n8n'],
    notes: 'Native Gemini generative runtime supported.',
  },
  {
    id: 'stage_4_brand_qa',
    name: 'Brand QA',
    description: 'Rigorously audits drafted content against brand compliance rules, forbidden claims, tone consistency, and accuracy.',
    order: 4,
    requiredCapability: 'brand QA',
    inputs: ['draftPosts', 'brandVoice', 'complianceGuidelines'],
    outputs: ['qaScore', 'brandViolations', 'refinedDraftPosts'],
    isImplemented: true,
    implementationStatus: 'implemented',
    providerSupport: ['native', 'n8n'],
    notes: 'Reuses AI QA Inspector rubric evaluation engine.',
  },
  {
    id: 'stage_5_media_generation',
    name: 'Image / Media Generation',
    description: 'Generates brand-aligned visual prompts, infographics briefs, or AI images matching the post content.',
    order: 5,
    requiredCapability: 'media generation',
    inputs: ['refinedDraftPosts', 'brandGuidelines'],
    outputs: ['mediaAssets', 'imagePrompts', 'layoutDirectives'],
    isImplemented: false,
    implementationStatus: 'planned',
    providerSupport: ['native', 'n8n'],
    notes: 'Planned integration with image generation providers.',
  },
  {
    id: 'stage_6_human_approval',
    name: 'Human Approval',
    description: 'Routes vetted drafts to human managers via dashboard or Slack/WhatsApp notification for one-click sign-off.',
    order: 6,
    requiredCapability: 'human approval',
    inputs: ['refinedDraftPosts', 'mediaAssets', 'approvalMode'],
    outputs: ['approvalStatus', 'rejectionNotes', 'approvedPosts'],
    isImplemented: true,
    implementationStatus: 'implemented',
    providerSupport: ['native'],
    notes: 'Enforces human-in-the-loop governance.',
  },
  {
    id: 'stage_7_publishing',
    name: 'Publishing',
    description: 'Dispatches approved content to verified external social platforms via native APIs or connected n8n pipelines.',
    order: 7,
    requiredCapability: 'social publishing',
    inputs: ['approvedPosts', 'platforms', 'scheduledPublishTime'],
    outputs: ['postUrls', 'platformPostIds', 'publishTimestamps'],
    isImplemented: false,
    implementationStatus: 'requires_integration',
    providerSupport: ['n8n', 'native'],
    notes: 'Requires verified social platform credentials (LinkedIn API, Meta Graph API, etc.).',
  },
  {
    id: 'stage_8_analytics',
    name: 'Analytics',
    description: 'Measures post engagement, impressions, clicks, and conversion attribution, feeding data back into research.',
    order: 8,
    requiredCapability: 'performance analytics',
    inputs: ['platformPostIds'],
    outputs: ['impressions', 'engagements', 'ctr', 'optimizationInsights'],
    isImplemented: false,
    implementationStatus: 'requires_integration',
    providerSupport: ['n8n', 'native'],
    notes: 'Planned analytics reporting loop.',
  },
]

export const SOCIAL_MEDIA_WORKFLOW_SPEC: WorkflowSpecification = {
  id: 'spec_social_media_marketing_v1',
  name: 'Social Media Marketing Workflow Specification',
  description: 'Eight-stage content lifecycle from research and generation through brand QA, human approval, and publishing.',
  stages: SOCIAL_MEDIA_WORKFLOW_STAGES,
  defaultProvider: 'native',
  blueprint: {
    id: 'bp_social_media_native_v1',
    name: 'Social Media Marketing Native Blueprint',
    version: '1.0.0',
    source: 'manual_definition',
    state: 'validated',
    notes: 'Native Grovaitech orchestrator specification. Production deployable with human-in-the-loop guardrails.',
  },
}

// ─── Social Media Marketing Employee Recipe ───────────────────────────────────

export const SOCIAL_MEDIA_MARKETING_RECIPE: EmployeeRecipe = {
  id: 'social_media_marketing',
  slug: 'social-media-marketing',
  employeeId: 'social_media_marketing',
  displayName: 'Social Media Marketing AI Employee',
  category: 'Marketing',
  version: '1.0.0',
  description:
    'Researches industry trends, ideates high-converting content, drafts multi-platform social posts, enforces brand guidelines, and manages human review and scheduling.',
  capabilities: [
    'content research',
    'content ideation',
    'social media content generation',
    'content repurposing',
    'brand voice enforcement',
    'brand QA',
    'media generation',
    'publishing',
    'analytics',
  ],
  workflowSpec: SOCIAL_MEDIA_WORKFLOW_SPEC,
  configurationSchema: SOCIAL_MEDIA_CONFIG_SCHEMA,
  executionAdapter: {
    provider: 'native',
    async executeStage(stageId: string, input: any) {
      // Clean provider-neutral execution seam
      const stage = SOCIAL_MEDIA_WORKFLOW_STAGES.find((s) => s.id === stageId)
      if (!stage) {
        return {
          stageId,
          success: false,
          error: `Unknown stage: ${stageId}`,
        }
      }

      if (!stage.isImplemented) {
        return {
          stageId,
          success: true,
          isSimulated: true,
          result: {
            status: stage.implementationStatus,
            message: `Stage '${stage.name}' is registered as '${stage.implementationStatus}'. No live network side-effect was performed.`,
          },
        }
      }

      return {
        stageId,
        success: true,
        result: {
          status: 'completed',
          stage: stage.name,
          inputsReceived: Object.keys(input || {}),
        },
      }
    },
  },
  createdAt: '2026-09-15T00:00:00Z',
  updatedAt: '2026-09-15T00:00:00Z',
}

// ─── Recipe Registry Catalog ──────────────────────────────────────────────────

export const CANONICAL_RECIPES: EmployeeRecipe[] = [SOCIAL_MEDIA_MARKETING_RECIPE]

const RECIPES_BY_ID = new Map<string, EmployeeRecipe>(
  CANONICAL_RECIPES.map((r) => [r.id.toLowerCase(), r])
)

const RECIPES_BY_SLUG = new Map<string, EmployeeRecipe>(
  CANONICAL_RECIPES.map((r) => [r.slug.toLowerCase(), r])
)

export function getAllRecipes(): EmployeeRecipe[] {
  return [...CANONICAL_RECIPES]
}

export function getRecipeById(id: string): EmployeeRecipe | undefined {
  if (!id) return undefined
  return RECIPES_BY_ID.get(id.trim().toLowerCase())
}

export function getRecipeBySlug(slug: string): EmployeeRecipe | undefined {
  if (!slug) return undefined
  return RECIPES_BY_SLUG.get(slug.trim().toLowerCase())
}
