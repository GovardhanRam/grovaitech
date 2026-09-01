import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getConversations,
  getConversationMessages,
} from '@/app/actions/conversations'
import {
  formatRelativeTime,
  formatMessageTime,
  DEMO_CONVERSATIONS,
} from '@/lib/conversations/utils'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('app/actions/conversations - Data Access Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Formatting Helpers ──────────────────────────────────────────────────
  describe('Time Formatting Helpers', () => {
    it('formats relative times correctly', () => {
      const now = new Date().toISOString()
      expect(formatRelativeTime(now)).toBe('Just now')

      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      expect(formatRelativeTime(tenMinsAgo)).toBe('10m ago')

      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')

      const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(yesterday)).toBe('Yesterday')

      expect(formatRelativeTime(undefined)).toBe('Recently')
      expect(formatRelativeTime('invalid-date')).toBe('Recently')
    })

    it('formats message timestamps gracefully', () => {
      const iso = '2026-09-01T10:30:00.000Z'
      const formatted = formatMessageTime(iso)
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(0)

      expect(formatMessageTime(undefined)).toBe('Now')
      expect(formatMessageTime('invalid-date')).toBe('Now')
    })
  })

  // ─── 2. Real Data & Thread Resolution ───────────────────────────────────────
  describe('Live Supabase Data Resolution', () => {
    it('fetches chats, messages, and correctly associates threads in chronological order', async () => {
      const mockChats = [
        {
          id: 'chat-001',
          title: 'Inquiry: Luxury Villa in Tirupati',
          user_id: 'user-1',
          created_at: '2026-09-01T09:00:00Z',
        },
      ]

      const mockMessages = [
        {
          id: 'msg-1',
          chat_id: 'chat-001',
          role: 'user',
          content: 'Hi, is the 3BHK villa available?',
          created_at: '2026-09-01T09:01:00Z',
        },
        {
          id: 'msg-2',
          chat_id: 'chat-001',
          role: 'assistant',
          content: 'Yes! It is available at ₹95 Lakhs.',
          created_at: '2026-09-01T09:02:00Z',
        },
      ]

      const mockLeads = [
        {
          id: 'lead-1',
          name: 'Luxury Villa in Tirupati',
          phone: '+919876543210',
          email: 'buyer@example.com',
          location: 'Tirupati',
          property_type: 'villa',
          lead_score: 'hot',
          lead_status: 'qualified',
          source: 'ai_demo',
          created_at: '2026-09-01T09:02:00Z',
        },
      ]

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'chats') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockChats, error: null }),
              }),
            }
          }
          if (table === 'messages') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
              }),
            }
          }
          if (table === 'real_estate_leads') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const result = await getConversations()

      expect(result.success).toBe(true)
      expect(result.isFallback).toBe(false)
      expect(result.conversations).toHaveLength(1)

      const conv = result.conversations[0]
      expect(conv.id).toBe('chat-001')
      expect(conv.customerName).toBe('Luxury Villa in Tirupati')
      expect(conv.customerInitials).toBe('LV')
      expect(conv.messages).toHaveLength(2)
      expect(conv.messages[0].role).toBe('customer')
      expect(conv.messages[1].role).toBe('ai')
      expect(conv.lastMessage).toBe('Yes! It is available at ₹95 Lakhs.')
      expect(conv.leadScore).toBe(90) // hot -> 90
      expect(conv.leadStatus).toBe('Qualified')
      expect(conv.tags).toContain('villa')
    })

    it('synthesizes WhatsApp channel sessions from messages without explicit chats table rows', async () => {
      const mockChats: any[] = []

      const mockMessages = [
        {
          id: 'msg-wa-1',
          chat_id: 'whatsapp_+919440012345',
          role: 'user',
          content: 'Hello, looking for a plot in Renigunta.',
          created_at: '2026-09-01T08:30:00Z',
        },
        {
          id: 'msg-wa-2',
          chat_id: 'whatsapp_+919440012345',
          role: 'assistant',
          content: 'Hello! We have verified plots available near Renigunta Airport Road.',
          created_at: '2026-09-01T08:31:00Z',
        },
      ]

      const mockLeads = [
        {
          id: 'lead-wa',
          name: 'Nagarjuna Rao',
          phone: '+919440012345',
          email: 'nagarjuna@gmail.com',
          location: 'Renigunta',
          property_type: 'plot',
          lead_score: 'warm',
          lead_status: 'new',
          source: 'whatsapp',
          created_at: '2026-09-01T08:31:00Z',
        },
      ]

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'chats') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockChats, error: null }),
              }),
            }
          }
          if (table === 'messages') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
              }),
            }
          }
          if (table === 'real_estate_leads') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
              }),
            }
          }
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const result = await getConversations()

      expect(result.success).toBe(true)
      expect(result.isFallback).toBe(false)
      expect(result.conversations).toHaveLength(1)

      const conv = result.conversations[0]
      expect(conv.id).toBe('whatsapp_+919440012345')
      expect(conv.channel).toBe('WhatsApp')
      expect(conv.customerName).toBe('Nagarjuna Rao')
      expect(conv.customerPhone).toBe('+919440012345')
      expect(conv.customerEmail).toBe('nagarjuna@gmail.com')
      expect(conv.location).toBe('Renigunta')
      expect(conv.leadScore).toBe(70) // warm -> 70
      expect(conv.tags).toContain('WhatsApp')
      expect(conv.tags).toContain('plot')
    })
  })

  // ─── 3. Fallback & Error Resilience ─────────────────────────────────────────
  describe('Fallback & Isolated Mock Handling', () => {
    it('falls back to DEMO_CONVERSATIONS when Supabase tables are completely empty', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        })),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const result = await getConversations()

      expect(result.success).toBe(true)
      expect(result.isFallback).toBe(true)
      expect(result.conversations).toEqual(DEMO_CONVERSATIONS)
      expect(result.conversations.length).toBeGreaterThan(0)
    })

    it('falls back safely to DEMO_CONVERSATIONS when Supabase throws an exception or query error', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database connection timeout' } }),
          }),
        })),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const result = await getConversations()

      expect(result.success).toBe(true)
      expect(result.isFallback).toBe(true)
      expect(result.conversations).toEqual(DEMO_CONVERSATIONS)
      expect(result.error).toBe('Database connection timeout')
    })

    it('getConversationMessages returns messages for a specific chat ID', async () => {
      const mockMessages = [
        {
          id: 'msg-direct-1',
          chat_id: 'chat-xyz',
          role: 'user',
          content: 'Hello doctor',
          created_at: '2026-09-01T10:00:00Z',
        },
      ]

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
            }),
          }),
        })),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const msgs = await getConversationMessages('chat-xyz')
      expect(msgs).toHaveLength(1)
      expect(msgs[0].content).toBe('Hello doctor')
      expect(msgs[0].role).toBe('customer')
    })
  })
})
