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

/**
 * Resolves and validates authenticated user context and tenant identifier.
 */
async function resolveTenantContext(rawClientId?: string): Promise<string | undefined> {
  try {
    const supabase = await createServerClient()
    let user: any = null
    try {
      const { data: authData } = await supabase.auth.getUser()
      user = authData?.user || null
    } catch {
      user = null
    }

    if (rawClientId && typeof rawClientId === 'string') {
      const clean = rawClientId.trim()
      if (isValidTenantId(clean)) {
        return clean
      }
      return undefined
    }

    if (user) {
      const { data: userClients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (Array.isArray(userClients) && userClients.length > 0) {
        return userClients[0].id
      }
    }
  } catch (err) {
    console.warn('[Content Action] Tenant resolution notice:', err)
  }

  return undefined
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
  const verifiedClientId = await resolveTenantContext(clientId)
  return fetchContentHubData(verifiedClientId)
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
 *   2. Authenticated user's associated client from the 'clients' table
 *   3. Explicit demo context (isDemoContext=true) → DEMO_TENANT_ID ('demo-default')
 *   4. No valid tenant → authorization error (never invents or selects a tenant)
 */
export async function generateContentRunAction(
  params: GenerateContentRunParams
): Promise<GenerateContentRunResult> {
  try {
    const { config, clientId: rawClientId, deploymentId, isDemoContext } = params || {}
    const resolvedClientId = await resolveTenantContext(rawClientId)

    let verifiedClientId: string

    if (resolvedClientId) {
      // Case A: Authenticated user with a real client, or valid caller-supplied ID
      verifiedClientId = resolvedClientId
    } else if (isDemoContext === true) {
      // Case B: Explicit demo/mock session — use canonical permitted demo tenant
      verifiedClientId = DEMO_TENANT_ID
    } else {
      // Case C: No valid authenticated client and no explicit demo context — reject
      return {
        success: false,
        error:
          'Unauthorized: No valid client context found. Please sign in or provide a valid client identifier.',
      }
    }

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

  const verifiedClientId = await resolveTenantContext(rawClientId)
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

  const verifiedClientId = await resolveTenantContext(rawClientId)
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

  const verifiedClientId = await resolveTenantContext(rawClientId)
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

  const verifiedClientId = await resolveTenantContext(rawClientId)
  return updatePostStatus(postId, 'scheduled', { scheduledAt: targetDate.toISOString() }, verifiedClientId)
}
