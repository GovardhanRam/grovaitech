import { createServerClient as createClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createMockServerClient } from './mockServer'

export const createServerClient = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('placeholder') || url === '') {
    return createMockServerClient() as any
  }

  const cookieStore = await cookies()

  return createClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component call - can be ignored
          }
        },
      },
    }
  )
}

/**
 * Dedicated server-only administrative Supabase client using the service-role key.
 * Bypasses RLS for server-side operations, credential storage, and idempotency tracking.
 * Never expose this client or its key to browser/client bundles.
 */
export const createAdminClient = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url.includes('placeholder') || url === '') {
    return createMockServerClient() as any
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as any
}

