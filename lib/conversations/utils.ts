/**
 * Grovaitech AI Platform
 * lib/conversations/utils.ts
 *
 * Pure utility functions and fallback datasets for Conversations.
 * Separated from 'use server' actions to satisfy Next.js Server Action build constraints.
 */

import type { Conversation } from '@/types/conversations'

export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return 'CU'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CU'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Recently'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Recently'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMessageTime(dateString?: string): string {
  if (!dateString) return 'Now'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Now'

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    customerName: 'Suresh Kumar',
    customerInitials: 'SK',
    customerPhone: '+91 94400 12345',
    customerEmail: 'suresh.k@gmail.com',
    channel: 'WhatsApp',
    assignedEmployee: 'Real Estate Lead Receptionist',
    status: 'active',
    unread: 1,
    lastMessage: "I'm interested in a 3BHK villa near Tirupati. What's the price range?",
    lastTime: '10m ago',
    leadStatus: 'Qualified',
    leadScore: 82,
    source: 'WhatsApp Inbound',
    location: 'Tirupati, AP',
    tags: ['Real Estate', 'Hot Lead'],
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    messages: [
      { id: 'm1', role: 'customer', content: 'Hello, I saw your ad for properties near Tirupati.', time: '9:42 AM', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { id: 'm2', role: 'ai', content: 'Hi Suresh! Welcome to Grovaitech Properties. I\'m here to help you find your perfect home. Are you looking to buy or rent?', time: '9:43 AM', created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString() },
      { id: 'm3', role: 'customer', content: 'Buy. Looking for a 3BHK villa, budget around 90 lakhs.', time: '9:44 AM', created_at: new Date(Date.now() - 1000 * 60 * 13).toISOString() },
      { id: 'm4', role: 'ai', content: 'Great! We have a few options in the 85–95 lakh range near Tirupati. Could you share your preferred location — Renigunta Road, Tiruchanoor, or BRTS Road?', time: '9:45 AM', created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
      { id: 'm5', role: 'customer', content: "I'm interested in a 3BHK villa near Tirupati. What's the price range?", time: '9:51 AM', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    ],
  },
  {
    id: 'conv-2',
    customerName: 'Priya Sharma',
    customerInitials: 'PS',
    customerPhone: '+91 98801 55678',
    customerEmail: 'priya.sharma@outlook.com',
    channel: 'Website',
    assignedEmployee: 'Clinic Receptionist',
    status: 'pending',
    unread: 1,
    lastMessage: 'Can I book an appointment for Monday at 10 AM?',
    lastTime: '45m ago',
    leadStatus: 'Warm',
    leadScore: 65,
    source: 'Website Chat Widget',
    location: 'Nellore, AP',
    tags: ['Clinic', 'Appointment'],
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    messages: [
      { id: 'm1', role: 'customer', content: 'Hi, I need to see a doctor for a general checkup.', time: '9:10 AM', created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString() },
      { id: 'm2', role: 'ai', content: 'Hello Priya! I\'m the AI Receptionist at Grovaitech Clinic. I\'d be happy to help you schedule an appointment. Which doctor would you like to see?', time: '9:11 AM', created_at: new Date(Date.now() - 1000 * 60 * 49).toISOString() },
      { id: 'm3', role: 'customer', content: 'Any general physician is fine.', time: '9:12 AM', created_at: new Date(Date.now() - 1000 * 60 * 48).toISOString() },
      { id: 'm4', role: 'ai', content: 'Dr. Ramesh is available Monday and Wednesday. Slots are open at 10:00 AM and 2:00 PM. Which works for you?', time: '9:13 AM', created_at: new Date(Date.now() - 1000 * 60 * 47).toISOString() },
      { id: 'm5', role: 'customer', content: 'Can I book an appointment for Monday at 10 AM?', time: '9:15 AM', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    ],
  },
  {
    id: 'conv-3',
    customerName: 'Ram Charan',
    customerInitials: 'RC',
    customerPhone: '+91 90000 88771',
    channel: 'WhatsApp',
    assignedEmployee: 'Real Estate Lead Receptionist',
    status: 'resolved',
    unread: 0,
    lastMessage: "Thank you! I'll visit on Saturday.",
    lastTime: '2h ago',
    leadStatus: 'Qualified',
    leadScore: 91,
    source: 'WhatsApp Referral',
    location: 'Nellore, AP',
    tags: ['Real Estate', 'Site Visit Booked'],
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    messages: [
      { id: 'm1', role: 'customer', content: 'Hi, my friend referred me. Looking for a 2BHK flat in Nellore.', time: '7:20 AM', created_at: new Date(Date.now() - 1000 * 60 * 125).toISOString() },
      { id: 'm2', role: 'ai', content: 'Hi Ram! Thanks for reaching out. We have excellent 2BHK options starting from ₹45 lakhs in Nellore. Would you like to schedule a site visit this weekend?', time: '7:21 AM', created_at: new Date(Date.now() - 1000 * 60 * 124).toISOString() },
      { id: 'm3', role: 'customer', content: 'Yes, Saturday would work.', time: '7:22 AM', created_at: new Date(Date.now() - 1000 * 60 * 123).toISOString() },
      { id: 'm4', role: 'ai', content: 'Saturday site visit confirmed at 11 AM! Our agent will contact you on Friday to confirm the details. 📍 Location: Fortune Gardens, Nellore.', time: '7:23 AM', created_at: new Date(Date.now() - 1000 * 60 * 122).toISOString() },
      { id: 'm5', role: 'customer', content: "Thank you! I'll visit on Saturday.", time: '7:25 AM', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    ],
  },
]
