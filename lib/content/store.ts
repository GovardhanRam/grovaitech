/**
 * Grovaitech AI Platform
 * lib/content/store.ts
 *
 * Data Access Layer for Social Media Content Hub.
 * Manages persistence, retrieval, and state transitions for content packages and individual drafts.
 * Supports Supabase tables with resilient in-memory fallback for offline/test environments.
 */

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type {
  ContentPackageItem,
  ContentPostItem,
  ContentHubOverview,
  GetContentHubDataResult,
  SocialPostStatus,
  SocialPlatform,
} from '@/types/content'
import type { SocialMediaContentPackage } from '@/lib/recipes/social-media-runner'

// ─── In-Memory Cache (for testing & offline resilience) ──────────────────────
const inMemoryPackages = new Map<string, ContentPackageItem>()
const inMemoryPosts = new Map<string, ContentPostItem>()

/**
 * Resets the in-memory cache. Used in unit tests.
 */
export function resetInMemoryContentStore(): void {
  inMemoryPackages.clear()
  inMemoryPosts.clear()
}

/**
 * Computes overview metrics from a list of posts and packages.
 */
export function calculateOverview(
  posts: ContentPostItem[],
  packages: ContentPackageItem[]
): ContentHubOverview {
  let pendingCount = 0
  let approvedCount = 0
  let scheduledCount = 0
  let publishedCount = 0
  let rejectedCount = 0

  for (const post of posts) {
    switch (post.status) {
      case 'pending_approval':
        pendingCount++
        break
      case 'approved':
        approvedCount++
        break
      case 'scheduled':
        scheduledCount++
        break
      case 'published':
        publishedCount++
        break
      case 'rejected':
        rejectedCount++
        break
    }
  }

  const latestPackage = packages[0]
  const latestQaScore = latestPackage
    ? Math.round(latestPackage.averageQaScore)
    : posts.length > 0
    ? Math.round(posts.reduce((acc, p) => acc + p.qaScore, 0) / posts.length)
    : 0

  return {
    pendingCount,
    approvedCount,
    scheduledCount,
    publishedCount,
    rejectedCount,
    totalPostsCount: posts.length,
    latestQaScore,
    latestRunAt: latestPackage ? latestPackage.createdAt : null,
  }
}

/**
 * Converts a database row or raw object to ContentPackageItem.
 */
function mapPackageRow(row: any): ContentPackageItem {
  return {
    id: String(row.id),
    clientId: String(row.client_id || row.clientId || 'default-client'),
    deploymentId: row.deployment_id || row.deploymentId || null,
    workflowExecutionId: row.workflow_execution_id || row.workflowExecutionId || null,
    employeeSlug: row.employee_slug || row.employeeSlug || 'social-media-marketing',
    status: row.status || 'pending_approval',
    researchSummary: row.research_summary || row.researchSummary || {},
    contentIdeas: row.content_ideas || row.contentIdeas || {},
    qaSummary: row.qa_summary || row.qaSummary || { averageScore: 0, allPassed: false, auditsCount: 0 },
    averageQaScore: Number(row.average_qa_score ?? row.averageQaScore ?? 0),
    config: row.config || {},
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  }
}

/**
 * Converts a database row or raw object to ContentPostItem.
 */
function mapPostRow(row: any): ContentPostItem {
  return {
    id: String(row.id),
    packageId: String(row.package_id || row.packageId),
    clientId: String(row.client_id || row.clientId || 'default-client'),
    deploymentId: row.deployment_id || row.deploymentId || null,
    platform: (row.platform || 'linkedin') as SocialPlatform,
    originalContent: String(row.original_content || row.originalContent || ''),
    editedContent: row.edited_content || row.editedContent || null,
    characterCount: Number(row.character_count ?? row.characterCount ?? 0),
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    callToAction: row.call_to_action || row.callToAction || null,
    suggestedVisualBrief: row.suggested_visual_brief || row.suggestedVisualBrief || null,
    hook: row.hook || null,
    format: row.format || null,
    qaScore: Number(row.qa_score ?? row.qaScore ?? 0),
    qaBreakdown: row.qa_breakdown || row.qaBreakdown || null,
    qaViolations: Array.isArray(row.qa_violations) ? row.qa_violations : Array.isArray(row.qaViolations) ? row.qaViolations : [],
    status: (row.status || 'pending_approval') as SocialPostStatus,
    rejectionReason: row.rejection_reason || row.rejectionReason || null,
    rejectedAt: row.rejected_at || row.rejectedAt || null,
    approvedAt: row.approved_at || row.approvedAt || null,
    scheduledAt: row.scheduled_at || row.scheduledAt || null,
    publishedAt: row.published_at || row.publishedAt || null,
    publishedUrl: row.published_url || row.publishedUrl || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  }
}

/**
 * Persists a generated SocialMediaContentPackage into database & in-memory cache.
 */
export async function persistContentPackage(
  pkg: SocialMediaContentPackage,
  config: Record<string, any>,
  clientId: string = 'client-default',
  deploymentId?: string
): Promise<{ package: ContentPackageItem; posts: ContentPostItem[] }> {
  const packageId = pkg.executionId || `pkg-${Date.now()}`
  const nowIso = new Date().toISOString()

  // 1. Construct Package Item
  const packageItem: ContentPackageItem = {
    id: packageId,
    clientId,
    deploymentId: deploymentId || null,
    workflowExecutionId: pkg.executionId,
    employeeSlug: 'social-media-marketing',
    status: 'pending_approval',
    researchSummary: pkg.research || {},
    contentIdeas: pkg.contentIdeas || {},
    qaSummary: {
      averageScore: pkg.qualityAssurance?.averageScore || 0,
      allPassed: pkg.qualityAssurance?.allPassed || false,
      auditsCount: pkg.qualityAssurance?.auditResults?.length || 0,
    },
    averageQaScore: pkg.qualityAssurance?.averageScore || 0,
    config: config || {},
    createdAt: pkg.generatedAt || nowIso,
    updatedAt: nowIso,
  }

  // 2. Construct Child Post Items
  const auditMap = new Map<string, any>()
  if (pkg.qualityAssurance?.auditResults) {
    for (const a of pkg.qualityAssurance.auditResults) {
      auditMap.set(a.postId, a)
    }
  }

  const angleMap = new Map<string, any>()
  if (pkg.contentIdeas?.angles) {
    for (const ang of pkg.contentIdeas.angles) {
      if (Array.isArray(ang.recommendedPlatforms)) {
        for (const p of ang.recommendedPlatforms) {
          angleMap.set(p.toLowerCase(), ang)
        }
      }
    }
  }

  const posts: ContentPostItem[] = []
  if (pkg.generatedContent?.posts) {
    for (const p of pkg.generatedContent.posts) {
      const audit = auditMap.get(p.id)
      const angle = angleMap.get(p.platform.toLowerCase()) || pkg.contentIdeas?.angles?.[0]
      const finalContent = audit?.finalContent || p.content

      const postItem: ContentPostItem = {
        id: p.id || `post-${p.platform}-${Date.now()}`,
        packageId,
        clientId,
        deploymentId: deploymentId || null,
        platform: p.platform as SocialPlatform,
        originalContent: finalContent,
        editedContent: null,
        characterCount: finalContent.length,
        hashtags: p.hashtags || [],
        callToAction: p.callToAction || null,
        suggestedVisualBrief: p.suggestedVisualBrief || null,
        hook: angle?.hook || null,
        format: angle?.format || null,
        qaScore: audit?.overallScore ?? 85,
        qaBreakdown: audit?.rubricBreakdown || null,
        qaViolations: audit?.violations || [],
        status: 'pending_approval',
        rejectionReason: null,
        rejectedAt: null,
        approvedAt: null,
        scheduledAt: null,
        publishedAt: null,
        publishedUrl: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      }

      posts.push(postItem)
    }
  }

  // 3. Save to In-Memory Cache first (guaranteed resilience)
  inMemoryPackages.set(packageId, packageItem)
  for (const post of posts) {
    inMemoryPosts.set(post.id, post)
  }

  // 4. Persist to Supabase if accessible
  try {
    const supabase = await createServerClient()
    const pkgRecord = {
      id: packageItem.id,
      client_id: packageItem.clientId,
      deployment_id: packageItem.deploymentId,
      workflow_execution_id: packageItem.workflowExecutionId,
      employee_slug: packageItem.employeeSlug,
      status: packageItem.status,
      research_summary: packageItem.researchSummary,
      content_ideas: packageItem.contentIdeas,
      qa_summary: packageItem.qaSummary,
      average_qa_score: packageItem.averageQaScore,
      config: packageItem.config,
      created_at: packageItem.createdAt,
      updated_at: packageItem.updatedAt,
    }

    const { error: pkgErr } = await supabase.from('social_content_packages').insert(pkgRecord)
    if (pkgErr) {
      console.warn('[Content Store] Supabase social_content_packages insert notice:', pkgErr.message)
    } else if (posts.length > 0) {
      const postRecords = posts.map((p) => ({
        id: p.id,
        package_id: p.packageId,
        client_id: p.clientId,
        deployment_id: p.deploymentId,
        platform: p.platform,
        original_content: p.originalContent,
        edited_content: p.editedContent,
        character_count: p.characterCount,
        hashtags: p.hashtags,
        call_to_action: p.callToAction,
        suggested_visual_brief: p.suggestedVisualBrief,
        hook: p.hook,
        format: p.format,
        qa_score: p.qaScore,
        qa_breakdown: p.qaBreakdown,
        qa_violations: p.qaViolations,
        status: p.status,
        rejection_reason: p.rejectionReason,
        rejected_at: p.rejectedAt,
        approved_at: p.approvedAt,
        scheduled_at: p.scheduledAt,
        published_at: p.publishedAt,
        published_url: p.publishedUrl,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }))

      const { error: postErr } = await supabase.from('social_posts').insert(postRecords)
      if (postErr) {
        console.warn('[Content Store] Supabase social_posts insert notice:', postErr.message)
      }
    }
  } catch (err: any) {
    console.warn('[Content Store] Supabase persistence exception (operating in fallback):', err?.message || err)
  }

  return {
    package: packageItem,
    posts,
  }
}

/**
 * Fetches all Content Hub packages and posts for a given client (or all if omitted).
 */
export async function fetchContentHubData(clientId?: string): Promise<GetContentHubDataResult> {
  let livePackages: ContentPackageItem[] = []
  let livePosts: ContentPostItem[] = []
  let isFallback = false

  try {
    const supabase = await createServerClient()

    let pkgQuery = supabase
      .from('social_content_packages')
      .select('*')
      .order('created_at', { ascending: false })

    let postQuery = supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) {
      pkgQuery = pkgQuery.eq('client_id', clientId)
      postQuery = postQuery.eq('client_id', clientId)
    }

    const [pkgRes, postRes] = await Promise.allSettled([pkgQuery, postQuery])

    const dbPackages = pkgRes.status === 'fulfilled' && !pkgRes.value.error ? pkgRes.value.data || [] : null
    const dbPosts = postRes.status === 'fulfilled' && !postRes.value.error ? postRes.value.data || [] : null

    if (dbPackages && dbPosts) {
      livePackages = dbPackages.map(mapPackageRow)
      livePosts = dbPosts.map(mapPostRow)
    } else {
      isFallback = true
    }
  } catch (err: any) {
    console.warn('[Content Store] Failed live query, switching to cache:', err?.message || err)
    isFallback = true
  }

  // Merge in-memory cache items (for recently generated packages in the current session or test environment)
  const mergedPackages = [...livePackages]
  const packageIds = new Set(livePackages.map((p) => p.id))
  for (const [id, pkg] of inMemoryPackages.entries()) {
    if (!packageIds.has(id)) {
      if (!clientId || pkg.clientId === clientId) {
        mergedPackages.push(pkg)
      }
    }
  }

  const mergedPosts = [...livePosts]
  const postIds = new Set(livePosts.map((p) => p.id))
  for (const [id, post] of inMemoryPosts.entries()) {
    if (!postIds.has(id)) {
      if (!clientId || post.clientId === clientId) {
        mergedPosts.push(post)
      }
    }
  }

  // Sort descending by created_at
  mergedPackages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  mergedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const overview = calculateOverview(mergedPosts, mergedPackages)

  return {
    success: true,
    overview,
    packages: mergedPackages,
    posts: mergedPosts,
    isFallback,
  }
}

/**
 * Updates the approval status of an individual post.
 */
export async function updatePostStatus(
  postId: string,
  status: SocialPostStatus,
  meta?: {
    rejectionReason?: string
    scheduledAt?: string
    approvedAt?: string
  },
  clientId?: string
): Promise<{ success: boolean; post?: ContentPostItem; error?: string }> {
  const cleanPostId = postId.trim()
  const nowIso = new Date().toISOString()

  // 1. Update In-Memory Cache first
  const memPost = inMemoryPosts.get(cleanPostId)
  if (memPost) {
    if (clientId && memPost.clientId !== clientId) {
      return { success: false, error: 'Unauthorized: Post does not belong to the requested tenant.' }
    }
    memPost.status = status
    memPost.updatedAt = nowIso
    if (status === 'approved') {
      memPost.approvedAt = meta?.approvedAt || nowIso
      memPost.rejectionReason = null
      memPost.rejectedAt = null
    } else if (status === 'rejected') {
      memPost.rejectionReason = meta?.rejectionReason || null
      memPost.rejectedAt = nowIso
      memPost.approvedAt = null
    } else if (status === 'scheduled') {
      memPost.scheduledAt = meta?.scheduledAt || null
    }
  }

  // 2. Persist to Supabase if accessible
  try {
    const supabase = await createServerClient()
    const updatePayload: Record<string, any> = {
      status,
      updated_at: nowIso,
    }

    if (status === 'approved') {
      updatePayload.approved_at = meta?.approvedAt || nowIso
      updatePayload.rejection_reason = null
      updatePayload.rejected_at = null
    } else if (status === 'rejected') {
      updatePayload.rejection_reason = meta?.rejectionReason || null
      updatePayload.rejected_at = nowIso
      updatePayload.approved_at = null
    } else if (status === 'scheduled') {
      updatePayload.scheduled_at = meta?.scheduledAt || null
    }

    let query = supabase.from('social_posts').update(updatePayload).eq('id', cleanPostId)
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query.select().single()
    if (!error && data) {
      const updatedPost = mapPostRow(data)
      inMemoryPosts.set(cleanPostId, updatedPost)
      return { success: true, post: updatedPost }
    }
  } catch (err: any) {
    console.warn('[Content Store] Supabase update notice:', err?.message || err)
  }

  if (memPost) {
    return { success: true, post: memPost }
  }

  return { success: false, error: `Post with ID "${cleanPostId}" not found.` }
}

/**
 * Updates the content of a post (preserving the original content).
 */
export async function updatePostContent(
  postId: string,
  editedContent: string,
  clientId?: string
): Promise<{ success: boolean; post?: ContentPostItem; error?: string }> {
  const cleanPostId = postId.trim()
  const cleanContent = editedContent.trim()
  const nowIso = new Date().toISOString()

  if (!cleanContent) {
    return { success: false, error: 'Post content cannot be empty.' }
  }

  // 1. Update In-Memory Cache
  const memPost = inMemoryPosts.get(cleanPostId)
  if (memPost) {
    if (clientId && memPost.clientId !== clientId) {
      return { success: false, error: 'Unauthorized: Post does not belong to the requested tenant.' }
    }
    memPost.editedContent = cleanContent
    memPost.characterCount = cleanContent.length
    memPost.updatedAt = nowIso
  }

  // 2. Persist to Supabase if accessible
  try {
    const supabase = await createServerClient()
    const updatePayload = {
      edited_content: cleanContent,
      character_count: cleanContent.length,
      updated_at: nowIso,
    }

    let query = supabase.from('social_posts').update(updatePayload).eq('id', cleanPostId)
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query.select().single()
    if (!error && data) {
      const updatedPost = mapPostRow(data)
      inMemoryPosts.set(cleanPostId, updatedPost)
      return { success: true, post: updatedPost }
    }
  } catch (err: any) {
    console.warn('[Content Store] Supabase content edit notice:', err?.message || err)
  }

  if (memPost) {
    return { success: true, post: memPost }
  }

  return { success: false, error: `Post with ID "${cleanPostId}" not found.` }
}
