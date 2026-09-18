import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/auth/callback/route'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

describe('Phase 5A: Google-Only Authentication & Tenant Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('1. Upstream OAuth Error & Missing Parameters', () => {
    it('redirects to /login with error message when provider returns error_description', async () => {
      const req = new NextRequest(
        'http://localhost:3000/auth/callback?error=access_denied&error_description=User+denied+access'
      )
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toContain('http://localhost:3000/login?error=User%20denied%20access')
    })

    it('redirects to /login when authorization code is missing', async () => {
      const req = new NextRequest('http://localhost:3000/auth/callback')
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toContain('http://localhost:3000/login?error=')
      expect(location).toContain('Missing%20authorization%20code')
    })
  })

  describe('2. Code Exchange & User Profile Resolution', () => {
    it('redirects to /login when code exchange fails', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            error: { message: 'Invalid or expired auth code' },
          }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const req = new NextRequest('http://localhost:3000/auth/callback?code=bad-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toContain('http://localhost:3000/login?error=Invalid%20or%20expired%20auth%20code')
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('bad-code')
    })

    it('redirects to /login when getUser fails after successful code exchange', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'User session not found' },
          }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const req = new NextRequest('http://localhost:3000/auth/callback?code=valid-code')
      const res = await GET(req)

      expect(res.status).toBe(307)
      const location = res.headers.get('location')
      expect(location).toContain('http://localhost:3000/login?error=')
    })
  })

  describe('3. Authoritative Workspace Membership Routing', () => {
    it('redirects active tenant member to /dashboard', async () => {
      const userId = '11111111-2222-3333-4444-555555555555'
      const mockUser = {
        id: userId,
        email: 'founder@example.com',
      }

      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((field: string, val: string) => {
              if (field === 'user_id') {
                expect(val).toBe(userId)
              }
              if (field === 'status') {
                expect(val).toBe('active')
              }
              return {
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'mem-1', tenant_id: 'client-test-synthetic-01', role: 'owner', status: 'active' }],
                    error: null,
                  }),
                }),
              }
            }),
          }),
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const req = new NextRequest('http://localhost:3000/auth/callback?code=auth-code-123')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
    })

    it('redirects unassigned user (zero memberships) to /onboarding', async () => {
      const userId = '99999999-8888-7777-6666-555555555555'
      const mockUser = {
        id: userId,
        email: 'unassigned@example.com',
      }

      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const req = new NextRequest('http://localhost:3000/auth/callback?code=auth-code-456')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding')
    })

    it('uses createAdminClient when SUPABASE_SERVICE_ROLE_KEY is present to query memberships across RLS', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
      const userId = '11111111-2222-3333-4444-555555555555'

      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
        },
      }
      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'mem-admin', tenant_id: 'client-test-synthetic-01', status: 'active' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
      vi.mocked(createAdminClient).mockResolvedValue(mockAdmin as any)

      const req = new NextRequest('http://localhost:3000/auth/callback?code=auth-code-admin')
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard')
      expect(mockAdmin.from).toHaveBeenCalledWith('tenant_memberships')
    })
  })

  describe('4. Security Boundaries & Tamper Resistance', () => {
    it('refuses to honor spoofed client-supplied tenant_id or client_id in URL params', async () => {
      const userId = '55555555-5555-5555-5555-555555555555'
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: userId,
                user_metadata: { client_id: 'client-spoofed-admin' },
                app_metadata: { client_id: 'client-spoofed-super' },
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const req = new NextRequest(
        'http://localhost:3000/auth/callback?code=valid-code&tenant_id=client-spoofed-admin&client_id=client-spoofed-admin&role=super_admin'
      )
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/onboarding')
    })

    it('prevents open-redirect attacks and binds redirects strictly to request origin', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'mem-1', tenant_id: 'tenant-1' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const req = new NextRequest(
        'https://grovaitech.com/auth/callback?code=valid-code&next=https://malicious-phishing.com'
      )
      const res = await GET(req)

      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('https://grovaitech.com/dashboard')
    })
  })
})
