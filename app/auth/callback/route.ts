/**
 * Grovaitech AI Platform
 * app/auth/callback/route.ts
 *
 * OAuth Server-Side Callback Route Handler.
 * Exchanges the OAuth authorization code for a Supabase session,
 * resolves the authenticated user server-side, verifies active tenant
 * membership directly from public.tenant_memberships, and safely routes:
 *   - Active tenant member -> /dashboard
 *   - Unassigned user (no active tenant membership) -> /onboarding
 *   - Exchange / Auth failure -> /login?error=...
 *
 * Security:
 *   - Strictly ignores client-supplied tenant IDs or redirect targets
 *   - Does NOT trust user_metadata.client_id or app_metadata.client_id
 *   - All redirects are strictly anchored to the verified request origin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  const origin = requestUrl.origin

  // 1. Handle upstream OAuth provider error parameters
  if (errorParam || errorDescription) {
    const message = errorDescription || errorParam || 'Authentication failed'
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`)
  }

  // 2. Validate authorization code presence
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Missing authorization code from OAuth provider')}`
    )
  }

  try {
    const supabase = await createServerClient()

    // 3. Exchange authorization code for authenticated session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('[Auth Callback] Code exchange failed:', exchangeError.message)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    // 4. Retrieve authenticated user strictly server-side
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Auth Callback] Failed to resolve user after exchange:', userError?.message)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Failed to resolve authenticated user profile')}`
      )
    }

    // 5. Query active workspace membership from public.tenant_memberships
    // SECURITY:
    // - Must query the canonical database entity directly
    // - Never trust user_metadata, app_metadata, or request query/body parameters
    // - Use adminClient to read authoritative memberships across default-deny RLS
    let dbClient = supabase
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = await createAdminClient()
      }
    } catch (adminErr) {
      console.warn('[Auth Callback] createAdminClient fallback to serverClient:', adminErr)
    }

    const { data: memberships, error: membershipError } = await dbClient
      .from('tenant_memberships')
      .select('id, tenant_id, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)

    if (membershipError) {
      console.error('[Auth Callback] Database membership lookup failed:', membershipError)
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Failed to verify workspace membership')}`
      )
    }

    // 6. Authoritative Routing
    if (memberships && memberships.length > 0) {
      // Authenticated user has at least one active workspace membership
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    // Authenticated user has zero active memberships -> Route to Onboarding
    return NextResponse.redirect(`${origin}/onboarding`)
  } catch (err: any) {
    console.error('[Auth Callback] Unexpected error during OAuth flow:', err)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(err?.message || 'An unexpected error occurred during authentication')}`
    )
  }
}
