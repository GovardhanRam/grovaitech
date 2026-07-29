import { createServerClient as createClient } from '@supabase/ssr'
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

