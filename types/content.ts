/**
 * Grovaitech AI Platform
 * types/content.ts
 *
 * Unified TypeScript types for the Social Media Content Hub & Human Approval Workspace.
 */

export type SocialPostStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'scheduled'
  | 'published'

export type SocialPackageStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'partially_approved'
  | 'scheduled'
  | 'published'

export type SocialPlatform =
  | 'linkedin'
  | 'x'
  | 'instagram'
  | 'facebook'
  | 'youtube'

export interface PostRubricBreakdown {
  toneConsistency: number
  complianceSafety: number
  factualGrounding: number
  platformFormat: number
}

export interface ContentPostItem {
  id: string
  packageId: string
  clientId: string
  deploymentId?: string | null
  platform: SocialPlatform
  originalContent: string
  editedContent?: string | null
  characterCount: number
  hashtags: string[]
  callToAction?: string | null
  suggestedVisualBrief?: string | null
  hook?: string | null
  format?: string | null
  qaScore: number
  qaBreakdown?: PostRubricBreakdown | null
  qaViolations?: string[]
  status: SocialPostStatus
  rejectionReason?: string | null
  rejectedAt?: string | null
  approvedAt?: string | null
  scheduledAt?: string | null
  publishedAt?: string | null
  publishedUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface ContentPackageItem {
  id: string
  clientId: string
  deploymentId?: string | null
  workflowExecutionId?: string | null
  employeeSlug: string
  status: SocialPackageStatus
  researchSummary: {
    trendingThemes?: string[]
    audiencePainPoints?: string[]
    researchNotes?: string
  }
  contentIdeas: {
    angles?: Array<{
      hook: string
      format: string
      coreConcept: string
      recommendedPlatforms: string[]
    }>
  }
  qaSummary: {
    averageScore: number
    allPassed: boolean
    auditsCount: number
  }
  averageQaScore: number
  config: Record<string, any>
  createdAt: string
  updatedAt: string
  posts?: ContentPostItem[]
}

export interface ContentHubOverview {
  pendingCount: number
  approvedCount: number
  scheduledCount: number
  publishedCount: number
  rejectedCount: number
  totalPostsCount: number
  latestQaScore: number
  latestRunAt?: string | null
}

export interface GetContentHubDataResult {
  success: boolean
  overview: ContentHubOverview
  packages: ContentPackageItem[]
  posts: ContentPostItem[]
  isFallback?: boolean
  error?: string
}

export interface ApprovePostParams {
  postId: string
  clientId?: string
}

export interface RejectPostParams {
  postId: string
  rejectionReason?: string
  clientId?: string
}

export interface EditPostParams {
  postId: string
  editedContent: string
  clientId?: string
}

export interface SchedulePostParams {
  postId: string
  scheduledAt: string // ISO string
  clientId?: string
}

export interface MutationActionResult {
  success: boolean
  post?: ContentPostItem
  error?: string
}
