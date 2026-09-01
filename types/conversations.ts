/**
 * Grovaitech AI Platform
 * types/conversations.ts
 *
 * Unified TypeScript interfaces for Conversation records, message threads,
 * and server actions across Web Chat, WhatsApp, and AI Employee interactions.
 */

export interface ConversationMessage {
  id: string
  chat_id?: string
  role: 'customer' | 'ai'
  content: string
  time: string
  created_at?: string
}

export type ConversationChannel = 'WhatsApp' | 'Website' | 'Phone' | 'AI Chat'
export type ConversationStatus = 'active' | 'resolved' | 'pending' | 'needs_attention'

export interface Conversation {
  id: string
  customerName: string
  customerInitials: string
  customerPhone?: string
  customerEmail?: string
  channel: ConversationChannel
  assignedEmployee: string
  status: ConversationStatus
  unread: number
  lastMessage: string
  lastTime: string
  leadStatus: string
  leadScore: number
  source: string
  messages: ConversationMessage[]
  tags: string[]
  location?: string
  created_at?: string
}

export interface GetConversationsResult {
  success: boolean
  conversations: Conversation[]
  isFallback: boolean
  error?: string
}
