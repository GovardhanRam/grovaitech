'use server'

/**
 * Grovaitech AI Platform
 * app/actions/conversations.ts
 *
 * Server-side Data Access Layer for Unified Conversations Inbox.
 * Fetches real conversation threads from Supabase `chats` and `messages`,
 * enriches threads with `real_estate_leads` metadata, and provides
 * isolated fallback handling when database tables are empty or unconfigured.
 */

import { createServerClient } from '@/lib/supabase/server'
import type {
  Conversation,
  ConversationMessage,
  ConversationChannel,
  ConversationStatus,
  GetConversationsResult,
} from '@/types/conversations'
import {
  getInitials,
  formatRelativeTime,
  formatMessageTime,
  DEMO_CONVERSATIONS,
} from '@/lib/conversations/utils'

// ─── Primary Server Action: getConversations() ───────────────────────────────

export async function getConversations(): Promise<GetConversationsResult> {
  try {
    const supabase = await createServerClient()

    // 1. Fetch chats ordered by latest activity / creation
    const { data: rawChats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false })

    if (chatsError) {
      console.warn('[getConversations] Chats fetch notice, applying demo fallback:', chatsError.message)
      return {
        success: true,
        conversations: DEMO_CONVERSATIONS,
        isFallback: true,
        error: chatsError.message,
      }
    }

    // 2. Fetch messages ordered chronologically
    const { data: rawMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.warn('[getConversations] Messages fetch notice:', messagesError.message)
    }

    const allMessages: any[] = rawMessages || []
    const allChats: any[] = rawChats || []

    // 3. Fetch real estate leads for customer metadata enrichment
    let leadsByPhone: Map<string, any> = new Map()
    let leadsByName: Map<string, any> = new Map()

    try {
      const { data: rawLeads } = await supabase
        .from('real_estate_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (rawLeads && Array.isArray(rawLeads)) {
        for (const lead of rawLeads) {
          if (lead.phone) {
            const cleanPhone = lead.phone.replace(/[^\d+]/g, '')
            leadsByPhone.set(cleanPhone, lead)
            // Also store suffix 10 digits for matching
            const last10 = cleanPhone.slice(-10)
            if (last10.length === 10) leadsByPhone.set(last10, lead)
          }
          if (lead.name) {
            leadsByName.set(lead.name.toLowerCase().trim(), lead)
          }
        }
      }
    } catch (leadErr) {
      console.warn('[getConversations] Lead enrichment notice:', leadErr)
    }

    // 4. Group messages by chat_id
    const messagesByChatId = new Map<string, any[]>()
    for (const msg of allMessages) {
      if (!msg.chat_id) continue
      const list = messagesByChatId.get(msg.chat_id) || []
      list.push(msg)
      messagesByChatId.set(msg.chat_id, list)
    }

    // 5. Detect all distinct chat IDs (from chats table + orphaned message chat_ids e.g. whatsapp_+91...)
    const chatMap = new Map<string, any>()
    for (const chat of allChats) {
      if (chat.id) chatMap.set(chat.id, chat)
    }

    for (const chatId of messagesByChatId.keys()) {
      if (!chatMap.has(chatId)) {
        // Synthesize chat entry for WhatsApp or direct channel sessions
        const isWhatsApp = chatId.startsWith('whatsapp_')
        const phoneExtract = isWhatsApp ? chatId.replace('whatsapp_', '') : ''
        chatMap.set(chatId, {
          id: chatId,
          title: isWhatsApp ? `WhatsApp: ${phoneExtract || 'Inbound User'}` : `Chat: ${chatId.slice(0, 8)}`,
          created_at: messagesByChatId.get(chatId)?.[0]?.created_at || new Date().toISOString(),
          is_synthesized: true,
        })
      }
    }

    // If completely empty (no chats and no messages), return isolated demo fallback
    if (chatMap.size === 0) {
      return {
        success: true,
        conversations: DEMO_CONVERSATIONS,
        isFallback: true,
      }
    }

    // 6. Map into typed Conversation domain records
    const conversations: Conversation[] = []

    for (const [chatId, chatRecord] of chatMap.entries()) {
      const chatMsgs = messagesByChatId.get(chatId) || []

      // Format messages chronologically
      const formattedMessages: ConversationMessage[] = chatMsgs.map((m, idx) => ({
        id: m.id || `msg-${chatId}-${idx}`,
        chat_id: chatId,
        role: m.role === 'assistant' || m.role === 'model' ? 'ai' : 'customer',
        content: m.content || '',
        time: formatMessageTime(m.created_at),
        created_at: m.created_at,
      }))

      // Determine latest message & time
      const latestMsg = formattedMessages.length > 0
        ? formattedMessages[formattedMessages.length - 1]
        : null

      const lastMessageText = latestMsg ? latestMsg.content : (chatRecord.title || 'New conversation started')
      const lastTimeText = latestMsg ? formatRelativeTime(latestMsg.created_at) : formatRelativeTime(chatRecord.created_at)

      // Determine channel
      let channel: ConversationChannel = 'AI Chat'
      if (chatId.startsWith('whatsapp_')) {
        channel = 'WhatsApp'
      } else if (chatRecord.title?.toLowerCase().includes('website') || chatRecord.title?.toLowerCase().includes('clinic')) {
        channel = 'Website'
      } else if (chatRecord.title?.toLowerCase().includes('phone')) {
        channel = 'Phone'
      }

      // Try matching phone or customer name
      let customerPhone: string | undefined = undefined
      if (chatId.startsWith('whatsapp_')) {
        customerPhone = chatId.replace('whatsapp_', '')
      }

      let matchedLead: any = null
      if (customerPhone) {
        const cleanP = customerPhone.replace(/[^\d+]/g, '')
        matchedLead = leadsByPhone.get(cleanP) || leadsByPhone.get(cleanP.slice(-10))
      }

      if (!matchedLead && chatRecord.title) {
        const cleanTitle = chatRecord.title.replace(/^(WhatsApp:\s*|Chat:\s*|Inquiry:\s*)/i, '').toLowerCase().trim()
        matchedLead = leadsByName.get(cleanTitle)
      }

      // Resolve customer identity
      let customerName = 'Customer'
      if (matchedLead?.name) {
        customerName = matchedLead.name
      } else if (chatRecord.title && !chatRecord.title.startsWith('chat-session-') && !chatRecord.title.startsWith('whatsapp_')) {
        customerName = chatRecord.title.replace(/^(WhatsApp:\s*|Inquiry:\s*)/i, '').trim()
      } else if (customerPhone) {
        customerName = `Visitor (${customerPhone.slice(-4)})`
      } else {
        customerName = `Customer #${chatId.slice(-4)}`
      }

      const customerInitials = getInitials(customerName)
      const customerEmail = matchedLead?.email || undefined
      const location = matchedLead?.location || undefined

      // Resolve lead score and status
      const leadStatus = matchedLead?.lead_status
        ? matchedLead.lead_status.charAt(0).toUpperCase() + matchedLead.lead_status.slice(1)
        : 'Active'

      let leadScore = 50
      if (matchedLead?.lead_score === 'hot') leadScore = 90
      else if (matchedLead?.lead_score === 'warm') leadScore = 70
      else if (matchedLead?.lead_score === 'cold') leadScore = 30
      else if (matchedLead?.site_visit_requested) leadScore = 95

      // Resolve assigned employee
      let assignedEmployee = 'Real Estate Lead Receptionist'
      if (chatRecord.title?.toLowerCase().includes('clinic') || matchedLead?.notes?.toLowerCase().includes('clinic')) {
        assignedEmployee = 'Clinic Receptionist'
      } else if (
        chatRecord.title?.toLowerCase().includes('support') ||
        chatRecord.title?.toLowerCase().includes('help') ||
        formattedMessages.some(
          (m) =>
            m.content.toLowerCase().includes('human support team') ||
            m.content.toLowerCase().includes('support agent')
        )
      ) {
        assignedEmployee = 'Customer Support Agent'
      }

      const isEscalated = formattedMessages.some(
        (m) =>
          m.content.toLowerCase().includes('alerted our human support team') ||
          m.content.toLowerCase().includes('operator has received your conversation summary')
      )

      // Resolve status & unread count
      let status: ConversationStatus = 'active'
      if (isEscalated) {
        status = 'needs_attention'
      } else if (matchedLead?.lead_status === 'converted' || matchedLead?.lead_status === 'lost') {
        status = 'resolved'
      } else if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'customer') {
        status = 'active'
      }

      let unreadCount = 0
      for (let i = formattedMessages.length - 1; i >= 0; i--) {
        if (formattedMessages[i].role === 'customer') {
          unreadCount++
        } else {
          break
        }
      }

      const tags: string[] = []
      if (isEscalated) tags.push('Escalated', 'Support')
      if (channel === 'WhatsApp') tags.push('WhatsApp')
      if (matchedLead?.property_type) tags.push(matchedLead.property_type)
      if (matchedLead?.site_visit_requested) tags.push('Site Visit Requested')
      if (matchedLead?.lead_score === 'hot') tags.push('Hot Lead')
      if (tags.length === 0) tags.push('AI Conversation')

      conversations.push({
        id: chatId,
        customerName,
        customerInitials,
        customerPhone: customerPhone || matchedLead?.phone || undefined,
        customerEmail,
        channel,
        assignedEmployee,
        status,
        unread: unreadCount,
        lastMessage: lastMessageText,
        lastTime: lastTimeText,
        leadStatus,
        leadScore,
        source: matchedLead?.source ? `Lead Source: ${matchedLead.source}` : `${channel} Inbound`,
        messages: formattedMessages,
        tags,
        location,
        created_at: chatRecord.created_at || (formattedMessages[0]?.created_at) || new Date().toISOString(),
      })
    }

    // Sort conversations so the one with the latest message/update is first
    conversations.sort((a, b) => {
      const timeA = a.messages[a.messages.length - 1]?.created_at || a.created_at || ''
      const timeB = b.messages[b.messages.length - 1]?.created_at || b.created_at || ''
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })

    return {
      success: true,
      conversations,
      isFallback: false,
    }
  } catch (error: any) {
    console.error('[getConversations Exception]', error)
    return {
      success: false,
      conversations: DEMO_CONVERSATIONS,
      isFallback: true,
      error: error?.message || String(error),
    }
  }
}

// ─── Secondary Server Action: getConversationMessages(chatId) ────────────────

export async function getConversationMessages(chatId: string): Promise<ConversationMessage[]> {
  if (!chatId) return []

  try {
    const supabase = await createServerClient()
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error || !messages) {
      console.warn('[getConversationMessages] Error fetching messages:', error?.message)
      const demo = DEMO_CONVERSATIONS.find((c) => c.id === chatId)
      return demo?.messages || []
    }

    return messages.map((m: any, idx: number) => ({
      id: m.id || `msg-${chatId}-${idx}`,
      chat_id: chatId,
      role: m.role === 'assistant' || m.role === 'model' ? 'ai' : 'customer',
      content: m.content || '',
      time: formatMessageTime(m.created_at),
      created_at: m.created_at,
    }))
  } catch (err) {
    console.error('[getConversationMessages Exception]', err)
    return []
  }
}
