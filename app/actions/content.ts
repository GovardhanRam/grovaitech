'use server'

/**
 * Grovaitech AI Platform
 * app/actions/content.ts
 *
 * Server Actions for the Social Media Content Hub & Human Approval Workspace.
 * Reuses existing executeSocialMediaRecipe() for generation, enforces tenant boundaries,
 * and handles post approval, refinement, rejection, and scheduling.
 */

import { createServerClient } from '@/lib/supabase/server'
import { isValidTenantId } from '@/lib/knowledge'
import { executeSocialMediaRecipe } from '@/app/actions/recipes'
import {
  fetchContentHubData,
  persistContentPackage,
  updatePostStatus,
  updatePostContent,
} from '@/lib/content/store'
import type {
  GetContentHubDataResult,
  ApprovePostParams,
  RejectPostParams,
  EditPostParams,
  SchedulePostParams,
  MutationActionResult,
  ContentPackageItem,
  ContentPostItem,
} from '@/types/content'

import { resolveAuthorizedTenant } from '@/lib/auth'

export interface ResolvedTenantContext {
  success: boolean
  tenantId?: string
  error?: string
}

/**
 * Resolves and validates authenticated user context and tenant identifier.
 * Authoritatively validates tenant access via database-backed resolveAuthorizedTenant().
 * Caller-supplied tenant IDs are strictly verified against the user's active memberships.
 */
async function resolveTenantContext(
  rawClientId?: string,
  allowDemo: boolean = false
): Promise<ResolvedTenantContext> {
  try {
    const cleanId = rawClientId?.trim()

    // Explicit demo context bypass only when explicitly permitted
    if (allowDemo && (!cleanId || cleanId === DEMO_TENANT_ID || cleanId.startsWith('demo-') || cleanId.startsWith('client-demo-'))) {
      return { success: true, tenantId: cleanId || DEMO_TENANT_ID }
    }

    if (cleanId && !isValidTenantId(cleanId)) {
      return {
        success: false,
        error: 'Invalid client tenant identifier format.',
      }
    }

    const auth = await resolveAuthorizedTenant({ requestedTenantId: cleanId })
    if (!auth.success) {
      return {
        success: false,
        error: auth.error || 'Forbidden: You do not have permission to access this workspace.',
      }
    }

    return {
      success: true,
      tenantId: auth.tenantId,
    }
  } catch (err: any) {
    console.warn('[Content Action] Tenant resolution notice:', err?.message || err)
    return {
      success: false,
      error: 'Failed to verify tenant authorization.',
    }
  }
}

/**
 * The canonical demo tenant identifier permitted by executeSocialMediaRecipe().
 * Satisfies the `startsWith('demo-')` check in app/actions/recipes.ts.
 * Used ONLY when the caller explicitly signals demo/mock context via isDemoContext.
 */
const DEMO_TENANT_ID = 'demo-default'

/**
 * Server action to fetch initial Content Hub data (packages, posts, overview KPIs).
 */
export async function getContentHubData(clientId?: string): Promise<GetContentHubDataResult> {
  const tenantRes = await resolveTenantContext(clientId, true)
  if (!tenantRes.success || !tenantRes.tenantId) {
    return {
      success: false,
      error: tenantRes.error || 'Unauthorized tenant access.',
      packages: [],
      posts: [],
      overview: {
        pendingCount: 0,
        approvedCount: 0,
        scheduledCount: 0,
        publishedCount: 0,
        rejectedCount: 0,
        totalPostsCount: 0,
        latestQaScore: 0,
        latestRunAt: null,
      },
    }
  }
  return fetchContentHubData(tenantRes.tenantId)
}

export interface GenerateContentRunParams {
  config: Record<string, any>
  clientId?: string
  deploymentId?: string
  /**
   * Set to true ONLY for explicit demo/mock sessions (e.g. the public AI Employee demo page).
   * When true and no real authenticated client is found, resolves to DEMO_TENANT_ID ('demo-default').
   * Never set this flag based on an unauthenticated user reaching a real customer's workspace.
   */
  isDemoContext?: boolean
}

export interface GenerateContentRunResult {
  success: boolean
  package?: ContentPackageItem
  posts?: ContentPostItem[]
  executionId?: string
  error?: string
}

/**
 * Server action to trigger a new Social Media Generation Run.
 * Strictly reuses the canonical executeSocialMediaRecipe() server action,
 * then durably persists the generated package and platform-specific drafts.
 *
 * Tenant resolution order:
 *   1. Caller-supplied clientId validated by resolveTenantContext()
 *   2. Authenticated user's associated client from tenant_memberships
 *   3. Explicit demo context (isDemoContext=true) -> DEMO_TENANT_ID ('demo-default')
 *   4. No valid tenant -> authorization error (never invents or selects a tenant)
 */
export async function generateContentRunAction(
  params: GenerateContentRunParams
): Promise<GenerateContentRunResult> {
  try {
    const { config, clientId: rawClientId, deploymentId, isDemoContext } = params || {}
    const tenantRes = await resolveTenantContext(rawClientId, isDemoContext === true)

    if (!tenantRes.success || !tenantRes.tenantId) {
      return {
        success: false,
        error:
          tenantRes.error
            ? (tenantRes.error.startsWith('Unauthorized') ? tenantRes.error : `Unauthorized: ${tenantRes.error}`)
            : 'Unauthorized: No valid client context found. Please sign in or provide a valid client identifier.',
      }
    }

    const verifiedClientId = tenantRes.tenantId

    // 1. Invoke canonical Social Media Recipe runner
    const recipeResult = await executeSocialMediaRecipe({
      recipeSlug: 'social-media-marketing',
      config: config || {},
      clientId: verifiedClientId,
    })

    if (!recipeResult.success || !recipeResult.contentPackage) {
      return {
        success: false,
        error: recipeResult.error || 'Content generation failed during AI pipeline execution.',
      }
    }

    // 2. Persist the generated package & individual drafts into Content Hub store
    const persisted = await persistContentPackage(
      recipeResult.contentPackage,
      config || {},
      verifiedClientId,
      deploymentId
    )

    return {
      success: true,
      package: persisted.package,
      posts: persisted.posts,
      executionId: recipeResult.executionId,
    }
  } catch (err: any) {
    console.error('[Content Action Error] generateContentRunAction failed:', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during content generation.',
    }
  }
}

/**
 * Server action to approve a draft post.
 */
export async function approvePostAction(
  params: ApprovePostParams
): Promise<MutationActionResult> {
  const { postId, clientId: rawClientId } = params || {}
  if (!postId || typeof postId !== 'string') {
    return { success: false, error: 'Post ID is required.' }
  }

  let verifiedClientId: string | undefined = undefined
  if (rawClientId) {
    const tenantRes = await resolveTenantContext(rawClientId, true)
    if (!tenantRes.success || !tenantRes.tenantId) {
      return { success: false, error: tenantRes.error || 'Unauthorized workspace access.' }
    }
    verifiedClientId = tenantRes.tenantId
  } else {
    const tenantRes = await resolveTenantContext(undefined, false)
    if (tenantRes.success) {
      verifiedClientId = tenantRes.tenantId
    }
  }

  return updatePostStatus(postId, 'approved', { approvedAt: new Date().toISOString() }, verifiedClientId)
}

/**
 * Server action to reject a draft post with an optional reason.
 */
export async function rejectPostAction(
  params: RejectPostParams
): Promise<MutationActionResult> {
  const { postId, rejectionReason, clientId: rawClientId } = params || {}
  if (!postId || typeof postId !== 'string') {
    return { success: false, error: 'Post ID is required.' }
  }

  let verifiedClientId: string | undefined = undefined
  if (rawClientId) {
    const tenantRes = await resolveTenantContext(rawClientId, true)
    if (!tenantRes.success || !tenantRes.tenantId) {
      return { success: false, error: tenantRes.error || 'Unauthorized workspace access.' }
    }
    verifiedClientId = tenantRes.tenantId
  } else {
    const tenantRes = await resolveTenantContext(undefined, false)
    if (tenantRes.success) {
      verifiedClientId = tenantRes.tenantId
    }
  }

  return updatePostStatus(postId, 'rejected', { rejectionReason }, verifiedClientId)
}

/**
 * Server action to edit/refine a draft post's copy.
 * Preserves the original content while storing the refined version.
 */
export async function editPostAction(
  params: EditPostParams
): Promise<MutationActionResult> {
  const { postId, editedContent, clientId: rawClientId } = params || {}
  if (!postId || typeof postId !== 'string') {
    return { success: false, error: 'Post ID is required.' }
  }
  if (!editedContent || typeof editedContent !== 'string' || !editedContent.trim()) {
    return { success: false, error: 'Refined post content cannot be empty.' }
  }

  let verifiedClientId: string | undefined = undefined
  if (rawClientId) {
    const tenantRes = await resolveTenantContext(rawClientId, true)
    if (!tenantRes.success || !tenantRes.tenantId) {
      return { success: false, error: tenantRes.error || 'Unauthorized workspace access.' }
    }
    verifiedClientId = tenantRes.tenantId
  } else {
    const tenantRes = await resolveTenantContext(undefined, false)
    if (tenantRes.success) {
      verifiedClientId = tenantRes.tenantId
    }
  }

  return updatePostContent(postId, editedContent, verifiedClientId)
}

/**
 * Server action to schedule a post for future delivery.
 * Validates that the provided scheduledAt is a valid timestamp.
 */
export async function schedulePostAction(
  params: SchedulePostParams
): Promise<MutationActionResult> {
  const { postId, scheduledAt, clientId: rawClientId } = params || {}
  if (!postId || typeof postId !== 'string') {
    return { success: false, error: 'Post ID is required.' }
  }
  if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
    return { success: false, error: 'A valid future date and time are required for scheduling.' }
  }

  const targetDate = new Date(scheduledAt)
  // Ensure not in the past
  if (targetDate.getTime() < Date.now() - 60000) {
    return { success: false, error: 'Scheduled time must be in the future.' }
  }

  let verifiedClientId: string | undefined = undefined
  if (rawClientId) {
    const tenantRes = await resolveTenantContext(rawClientId, true)
    if (!tenantRes.success || !tenantRes.tenantId) {
      return { success: false, error: tenantRes.error || 'Unauthorized workspace access.' }
    }
    verifiedClientId = tenantRes.tenantId
  } else {
    const tenantRes = await resolveTenantContext(undefined, false)
    if (tenantRes.success) {
      verifiedClientId = tenantRes.tenantId
    }
  }

  return updatePostStatus(postId, 'scheduled', { scheduledAt: targetDate.toISOString() }, verifiedClientId)
}
