/**
 * Grovaitech AI Platform
 * lib/knowledge/index.ts
 *
 * Tenant-scoped Grounded Business Knowledge Service.
 * Provides deterministic, verified knowledge retrieval for AI Employees
 * with strict multi-tenant isolation, eliminating hallucination.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface ClientKnowledgeItem {
  id?: string
  client_id: string
  category: string
  question_or_topic: string
  verified_content: string
  created_at?: string
  updated_at?: string
}

export interface SearchKnowledgeParams {
  clientId?: string | null
  query: string
  category?: string | null
  maxResults?: number
  client?: any
}

export interface SearchKnowledgeResult {
  found: boolean
  answer: string
  items: ClientKnowledgeItem[]
  referencedDocs: string
}

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'could',
  'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'if',
  'in', 'is', 'it', 'me', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'please',
  'so', 'tell', 'that', 'the', 'their', 'then', 'there', 'this', 'to', 'us',
  'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with',
  'would', 'you', 'your'
])

/**
 * Validates that a tenant identifier is a non-empty, safe string matching canonical identifier format.
 * Prevents SQL/regex/path injection and rejects malformed tenant IDs.
 */
export function isValidTenantId(clientId: unknown): boolean {
  if (typeof clientId !== 'string') return false
  const trimmed = clientId.trim()
  if (!trimmed || trimmed.length > 128) return false
  return /^[a-zA-Z0-9_\-\.:]+$/.test(trimmed)
}

/**
 * Deterministically searches verified knowledge items strictly scoped to a tenant (clientId).
 * Returns matching verified facts or an explicit "no verified knowledge found" response.
 * Completely eliminates model hallucination by never fabricating answers.
 */
export async function searchClientKnowledge(
  params: SearchKnowledgeParams
): Promise<SearchKnowledgeResult> {
  const rawClientId = params.clientId
  const cleanClientId = typeof rawClientId === 'string' ? rawClientId.trim() : ''

  // Fail-closed tenant isolation guard: reject queries with missing, blank, or malformed clientId
  if (!cleanClientId || !isValidTenantId(cleanClientId)) {
    return {
      found: false,
      answer: 'No verified knowledge found for this organization.',
      items: [],
      referencedDocs: '',
    }
  }

  const rawQuery = params.query
  const cleanQuery = typeof rawQuery === 'string' ? rawQuery.trim().toLowerCase() : ''
  if (!cleanQuery) {
    return {
      found: false,
      answer: 'No verified knowledge found for an empty query.',
      items: [],
      referencedDocs: '',
    }
  }

  const maxResults = typeof params.maxResults === 'number' && params.maxResults > 0
    ? Math.min(params.maxResults, 10)
    : 3

  // Use provided client or initialize server administrative client
  let supabase = params.client
  if (!supabase) {
    try {
      supabase = await createAdminClient()
    } catch (err) {
      console.warn('[Knowledge Service] Admin client initialization warning:', err)
      return {
        found: false,
        answer: 'No verified knowledge found for the requested query.',
        items: [],
        referencedDocs: '',
      }
    }
  }

  // Fetch all verified knowledge records for the tenant
  let dbItems: ClientKnowledgeItem[] = []
  try {
    const { data, error } = await supabase
      .from('client_knowledge_items')
      .select('*')
      .eq('client_id', cleanClientId)

    if (error) {
      console.warn('[Knowledge Service] Database retrieval notice:', error)
      return {
        found: false,
        answer: 'No verified knowledge found for the requested query.',
        items: [],
        referencedDocs: '',
      }
    }

    if (Array.isArray(data)) {
      dbItems = data
    }
  } catch (dbErr) {
    console.warn('[Knowledge Service] Database exception:', dbErr)
    return {
      found: false,
      answer: 'No verified knowledge found for the requested query.',
      items: [],
      referencedDocs: '',
    }
  }

  if (dbItems.length === 0) {
    return {
      found: false,
      answer: 'No verified knowledge found for the requested query.',
      items: [],
      referencedDocs: '',
    }
  }

  // Tokenize query for deterministic relevance matching
  const rawTokens = cleanQuery.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean)
  const meaningfulTokens = rawTokens.filter(t => !STOP_WORDS.has(t) && t.length > 1)
  const searchTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens

  const categoryFilter = params.category && typeof params.category === 'string'
    ? params.category.trim().toLowerCase()
    : null

  // Score candidate records deterministically
  const scoredItems: Array<{ item: ClientKnowledgeItem; score: number }> = []

  for (const item of dbItems) {
    const topic = (item.question_or_topic || '').toLowerCase()
    const content = (item.verified_content || '').toLowerCase()
    const itemCat = (item.category || '').toLowerCase()

    let score = 0

    // 1. Exact phrase containment in topic or content
    if (cleanQuery.length >= 3) {
      if (topic.includes(cleanQuery)) score += 50
      if (content.includes(cleanQuery)) score += 30
    }

    // 2. Token overlap
    for (const token of searchTokens) {
      if (topic.includes(token)) {
        score += 15
        const topicWords = topic.replace(/[^\w\s]/g, ' ').split(/\s+/)
        if (topicWords.includes(token)) {
          score += 10
        }
      }

      if (content.includes(token)) {
        score += 8
        const contentWords = content.replace(/[^\w\s]/g, ' ').split(/\s+/)
        if (contentWords.includes(token)) {
          score += 5
        }
      }

      if (itemCat.includes(token)) {
        score += 10
      }
    }

    // 3. Category alignment boost
    if (categoryFilter && categoryFilter !== 'general' && categoryFilter !== 'all') {
      if (itemCat === categoryFilter || itemCat.includes(categoryFilter)) {
        score += 15
      }
    }

    if (score > 0) {
      scoredItems.push({ item, score })
    }
  }

  if (scoredItems.length === 0) {
    return {
      found: false,
      answer: 'No verified knowledge found for the requested query.',
      items: [],
      referencedDocs: '',
    }
  }

  // Sort by score descending
  scoredItems.sort((a, b) => b.score - a.score)

  const matchedItems = scoredItems
    .slice(0, maxResults)
    .map(entry => entry.item)

  const answer = matchedItems
    .map(item => `${item.question_or_topic}: ${item.verified_content}`)
    .join('\n\n')

  const referencedDocs = matchedItems
    .map(item => item.question_or_topic)
    .join(', ')

  return {
    found: true,
    answer,
    items: matchedItems,
    referencedDocs,
  }
}

/**
 * Inserts or updates a verified knowledge item for a client.
 */
export async function upsertClientKnowledgeItem(
  item: Partial<ClientKnowledgeItem> & {
    client_id: string
    question_or_topic: string
    verified_content: string
  },
  customClient?: any
): Promise<ClientKnowledgeItem> {
  const cleanClientId = item.client_id?.trim()
  if (!cleanClientId || !isValidTenantId(cleanClientId)) {
    throw new Error('Valid client_id is required to upsert knowledge item.')
  }
  if (!item.question_or_topic?.trim()) {
    throw new Error('question_or_topic is required.')
  }
  if (!item.verified_content?.trim()) {
    throw new Error('verified_content is required.')
  }

  const supabase = customClient || (await createAdminClient())
  const payload = {
    id: item.id || `k-${cleanClientId}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    client_id: cleanClientId,
    category: item.category?.trim() || 'general',
    question_or_topic: item.question_or_topic.trim(),
    verified_content: item.verified_content.trim(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('client_knowledge_items')
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to upsert client knowledge item: ${error.message || JSON.stringify(error)}`)
  }

  return data as ClientKnowledgeItem
}

/**
 * Lists all verified knowledge items for a client, optionally filtered by category.
 */
export async function listClientKnowledge(
  clientId: string,
  category?: string,
  customClient?: any
): Promise<ClientKnowledgeItem[]> {
  const cleanClientId = clientId?.trim()
  if (!cleanClientId || !isValidTenantId(cleanClientId)) {
    return []
  }

  const supabase = customClient || (await createAdminClient())
  let query = supabase
    .from('client_knowledge_items')
    .select('*')
    .eq('client_id', cleanClientId)

  if (category && category !== 'general' && category !== 'all') {
    query = query.eq('category', category.trim())
  }

  const { data, error } = await query
  if (error || !Array.isArray(data)) {
    return []
  }

  return data as ClientKnowledgeItem[]
}

/**
 * Deletes a verified knowledge item by ID, scoped to clientId.
 */
export async function deleteClientKnowledgeItem(
  id: string,
  clientId: string,
  customClient?: any
): Promise<boolean> {
  const cleanId = id?.trim()
  const cleanClientId = clientId?.trim()
  if (!cleanId || !cleanClientId || !isValidTenantId(cleanClientId)) {
    return false
  }

  const supabase = customClient || (await createAdminClient())
  const { error } = await supabase
    .from('client_knowledge_items')
    .delete()
    .eq('id', cleanId)
    .eq('client_id', cleanClientId)

  return !error
}
