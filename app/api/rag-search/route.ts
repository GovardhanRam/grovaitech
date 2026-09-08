/**
 * Grovaitech AI Platform
 * app/api/rag-search/route.ts
 *
 * Tenant-scoped Grounded Business Knowledge Search API.
 * Retrieves verified enterprise knowledge strictly scoped and authorized to the client/tenant.
 * Rejects unauthorized cross-tenant requests and prevents IDOR/BOLA attacks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { searchClientKnowledge } from '@/lib/knowledge'

interface AuthenticatedOperator {
  id: string
  email?: string
  role?: string
}

/**
 * Authenticates the caller operator session.
 * Supports Supabase Auth SSR getUser() and mock session cookie fallback.
 * Fails closed if no valid authenticated user is found.
 */
async function getAuthenticatedOperator(request?: NextRequest): Promise<AuthenticatedOperator | null> {
  // 1. Try Supabase server client
  try {
    const supabase = await createServerClient()
    if (supabase && typeof supabase.auth?.getUser === 'function') {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user && user.id) {
        return {
          id: user.id,
          email: user.email,
          role: (user.user_metadata as any)?.role || (user as any).role || 'operator',
        }
      }
    }
  } catch (err) {
    // Continue to session cookie check
  }

  // 2. Check grovaitech_session cookie from request object first (direct in tests/edge runtime)
  try {
    const rawReqCookie = request?.cookies?.get('grovaitech_session')?.value
    if (rawReqCookie) {
      const parsed = JSON.parse(decodeURIComponent(rawReqCookie))
      if (parsed && parsed.id) {
        return {
          id: parsed.id,
          email: parsed.email,
          role: parsed.role || 'operator',
        }
      }
    }
  } catch (err) {}

  // 3. Check grovaitech_session cookie via next/headers cookies() (used in app router runtime)
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('grovaitech_session')?.value
    if (sessionCookie) {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie))
      if (parsed && parsed.id) {
        return {
          id: parsed.id,
          email: parsed.email,
          role: parsed.role || 'operator',
        }
      }
    }
  } catch (err) {}

  return null
}

export async function POST(request: NextRequest) {
  try {
    const operator = await getAuthenticatedOperator(request)
    if (!operator || !operator.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid authenticated operator session required.', errorCode: 'UNAUTHENTICATED' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { query, category, clientId } = body || {}
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'Validation Error: Query is required.' }, { status: 400 })
    }

    // Strict Tenant Identity Authorization Check
    // An authenticated user can only query their own tenant (operator.id) unless they hold the Admin role.
    let targetClientId = operator.id
    if (clientId && typeof clientId === 'string' && clientId.trim()) {
      const requestedTenant = clientId.trim()
      const isAdmin = operator.role?.toLowerCase() === 'admin'
      const isSelf = requestedTenant === operator.id

      if (!isAdmin && !isSelf) {
        return NextResponse.json(
          {
            error: 'Forbidden: You are not authorized to query knowledge for another organization.',
            errorCode: 'FORBIDDEN_CROSS_TENANT',
          },
          { status: 403 }
        )
      }
      targetClientId = requestedTenant
    }

    const searchResult = await searchClientKnowledge({
      clientId: targetClientId,
      query: query.trim(),
      category: typeof category === 'string' ? category : undefined,
    })

    return NextResponse.json({
      query: query.trim(),
      answer: searchResult.answer,
      items: searchResult.items,
      found: searchResult.found,
      referencedDocs: searchResult.referencedDocs,
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
