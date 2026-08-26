'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  ChevronRight,
  Bot,
  Phone,
  Globe,
  MessageSquare,
  Send,
  Paperclip,
  MoreHorizontal,
  X,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Mail,
  PhoneCall,
  Tag,
  Star,
  ExternalLink,
  Inbox,
  Wifi,
  SlidersHorizontal,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConversationMessage {
  id: string
  role: 'customer' | 'ai'
  content: string
  time: string
}

interface Conversation {
  id: string
  customerName: string
  customerInitials: string
  customerPhone?: string
  customerEmail?: string
  channel: 'WhatsApp' | 'Website' | 'Phone' | 'AI Chat'
  assignedEmployee: string
  status: 'active' | 'resolved' | 'pending' | 'needs_attention'
  unread: number
  lastMessage: string
  lastTime: string
  leadStatus: string
  leadScore: number
  source: string
  messages: ConversationMessage[]
  tags: string[]
  location?: string
}

// ─── Demo Data (clearly separated — replace with Supabase query later) ──────

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    customerName: 'Suresh Kumar',
    customerInitials: 'SK',
    customerPhone: '+91 94400 12345',
    customerEmail: 'suresh.k@gmail.com',
    channel: 'WhatsApp',
    assignedEmployee: 'Real Estate Lead Receptionist',
    status: 'active',
    unread: 3,
    lastMessage: "I'm interested in a 3BHK villa near Tirupati. What's the price range?",
    lastTime: '10m ago',
    leadStatus: 'Qualified',
    leadScore: 82,
    source: 'WhatsApp Campaign',
    location: 'Tirupati, AP',
    tags: ['Real Estate', 'Hot Lead'],
    messages: [
      { id: 'm1', role: 'customer', content: 'Hello, I saw your ad for properties near Tirupati.', time: '9:42 AM' },
      { id: 'm2', role: 'ai', content: 'Hi Suresh! Welcome to Grovaitech Properties. I\'m here to help you find your perfect home. Are you looking to buy or rent?', time: '9:43 AM' },
      { id: 'm3', role: 'customer', content: 'Buy. Looking for a 3BHK villa, budget around 90 lakhs.', time: '9:44 AM' },
      { id: 'm4', role: 'ai', content: 'Great! We have a few options in the 85–95 lakh range near Tirupati. Could you share your preferred location — Renigunta Road, Tiruchanoor, or BRTS Road?', time: '9:45 AM' },
      { id: 'm5', role: 'customer', content: "I'm interested in a 3BHK villa near Tirupati. What's the price range?", time: '9:51 AM' },
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
    messages: [
      { id: 'm1', role: 'customer', content: 'Hi, I need to see a doctor for a general checkup.', time: '9:10 AM' },
      { id: 'm2', role: 'ai', content: 'Hello Priya! I\'m the AI Receptionist at Grovaitech Clinic. I\'d be happy to help you schedule an appointment. Which doctor would you like to see?', time: '9:11 AM' },
      { id: 'm3', role: 'customer', content: 'Any general physician is fine.', time: '9:12 AM' },
      { id: 'm4', role: 'ai', content: 'Dr. Ramesh is available Monday and Wednesday. Slots are open at 10:00 AM and 2:00 PM. Which works for you?', time: '9:13 AM' },
      { id: 'm5', role: 'customer', content: 'Can I book an appointment for Monday at 10 AM?', time: '9:15 AM' },
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
    lastMessage: 'Thank you! I\'ll visit on Saturday.',
    lastTime: '2h ago',
    leadStatus: 'Qualified',
    leadScore: 91,
    source: 'WhatsApp Referral',
    location: 'Nellore, AP',
    tags: ['Real Estate', 'Site Visit Booked'],
    messages: [
      { id: 'm1', role: 'customer', content: 'Hi, my friend referred me. Looking for a 2BHK flat in Nellore.', time: '7:20 AM' },
      { id: 'm2', role: 'ai', content: 'Hi Ram! Thanks for reaching out. We have excellent 2BHK options starting from ₹45 lakhs in Nellore. Would you like to schedule a site visit this weekend?', time: '7:21 AM' },
      { id: 'm3', role: 'customer', content: 'Yes, Saturday would work.', time: '7:22 AM' },
      { id: 'm4', role: 'ai', content: 'Saturday site visit confirmed at 11 AM! Our agent will contact you on Friday to confirm the details. 📍 Location: Fortune Gardens, Nellore.', time: '7:23 AM' },
      { id: 'm5', role: 'customer', content: "Thank you! I'll visit on Saturday.", time: '7:25 AM' },
    ],
  },
  {
    id: 'conv-4',
    customerName: 'Lakshmi Devi',
    customerInitials: 'LD',
    customerPhone: '+91 99000 44321',
    customerEmail: 'lakshmi.d@gmail.com',
    channel: 'AI Chat',
    assignedEmployee: 'Real Estate Lead Receptionist',
    status: 'needs_attention',
    unread: 5,
    lastMessage: "I've been waiting for 20 minutes, can someone help me?",
    lastTime: '5m ago',
    leadStatus: 'New',
    leadScore: 40,
    source: 'Website AI Demo',
    location: 'Chennai, TN',
    tags: ['Escalation Needed'],
    messages: [
      { id: 'm1', role: 'customer', content: 'Hello? Is anyone there?', time: '10:30 AM' },
      { id: 'm2', role: 'ai', content: 'Hi! I\'m the Grovaitech Real Estate AI. How can I help you today?', time: '10:30 AM' },
      { id: 'm3', role: 'customer', content: 'I need to speak to a human agent urgently.', time: '10:31 AM' },
      { id: 'm4', role: 'ai', content: 'I understand. I\'m escalating this conversation to our team. Please hold on.', time: '10:31 AM' },
      { id: 'm5', role: 'customer', content: "I've been waiting for 20 minutes, can someone help me?", time: '10:51 AM' },
    ],
  },
  {
    id: 'conv-5',
    customerName: 'Anil Reddy',
    customerInitials: 'AR',
    customerPhone: '+91 98765 43210',
    channel: 'Phone',
    assignedEmployee: 'Real Estate Lead Receptionist',
    status: 'resolved',
    unread: 0,
    lastMessage: 'Noted. I\'ll send the documents by email.',
    lastTime: '1d ago',
    leadStatus: 'Qualified',
    leadScore: 76,
    source: 'Phone Inbound',
    location: 'Tirupati, AP',
    tags: ['Real Estate', 'Documents Requested'],
    messages: [
      { id: 'm1', role: 'customer', content: 'I called about the property listing on Renigunta Road.', time: 'Yesterday' },
      { id: 'm2', role: 'ai', content: 'Hi Anil! The Renigunta Road villa is still available. It\'s a 4BHK, ground floor, 2200 sq ft at ₹1.1 Crore. Shall I send you the brochure?', time: 'Yesterday' },
      { id: 'm3', role: 'customer', content: 'Yes please. Also need the RERA documents.', time: 'Yesterday' },
      { id: 'm4', role: 'ai', content: "I'll arrange both the brochure and RERA certificate to be emailed to you.", time: 'Yesterday' },
      { id: 'm5', role: 'customer', content: "Noted. I'll send the documents by email.", time: 'Yesterday' },
    ],
  },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

const channelIcon = (channel: string) => {
  const base = 'w-3 h-3'
  if (channel === 'WhatsApp') return <MessageSquare className={`${base} text-emerald-500`} />
  if (channel === 'Website') return <Globe className={`${base} text-blue-500`} />
  if (channel === 'Phone') return <PhoneCall className={`${base} text-purple-500`} />
  return <Bot className={`${base} text-amber-500`} />
}

const channelBadgeClass = (channel: string) => {
  if (channel === 'WhatsApp') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (channel === 'Website') return 'bg-blue-50 text-blue-700 border-blue-100'
  if (channel === 'Phone') return 'bg-purple-50 text-purple-700 border-purple-100'
  return 'bg-amber-50 text-amber-700 border-amber-100'
}

const statusDot = (status: string) => {
  if (status === 'active') return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
  if (status === 'pending') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
  if (status === 'needs_attention') return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
  return <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
}

const statusLabel = (status: string) => {
  if (status === 'active') return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
  if (status === 'pending') return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-100' }
  if (status === 'needs_attention') return { label: 'Needs Attention', cls: 'bg-red-50 text-red-700 border-red-100' }
  return { label: 'Resolved', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
}

const leadScoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100'
  if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100'
  return 'text-slate-500 bg-slate-50 border-slate-200'
}

// ─── Filters ─────────────────────────────────────────────────────────────────

type InboxTab = 'all' | 'unread' | 'ai_handled' | 'needs_attention' | 'resolved'

const INBOX_TABS: { key: InboxTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'ai_handled', label: 'AI Handled' },
  { key: 'needs_attention', label: 'Needs Attention' },
  { key: 'resolved', label: 'Resolved' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string>(DEMO_CONVERSATIONS[0].id)
  const [activeTab, setActiveTab] = useState<InboxTab>('all')
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [composerText, setComposerText] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const selected = DEMO_CONVERSATIONS.find(c => c.id === selectedId) ?? DEMO_CONVERSATIONS[0]

  const filtered = DEMO_CONVERSATIONS.filter(c => {
    const matchSearch =
      !search ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
    const matchChannel = channelFilter === 'all' || c.channel === channelFilter
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'unread' && c.unread > 0) ||
      (activeTab === 'ai_handled' && (c.status === 'active' || c.status === 'resolved')) ||
      (activeTab === 'needs_attention' && c.status === 'needs_attention') ||
      (activeTab === 'resolved' && c.status === 'resolved')
    return matchSearch && matchChannel && matchTab
  })

  const handleSelectConv = (id: string) => {
    setSelectedId(id)
    setMobileView('chat')
  }

  const sl = statusLabel(selected.status)

  return (
    // The outer div uses -mx-6 -my-6 to bleed to the shell's padding edges,
    // then refills padding inside. This lets the inbox fill the workspace fully.
    <div className="flex flex-col h-[calc(100vh-0px)] -m-6 bg-slate-50 overflow-hidden">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-6 pb-4 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Workforce OS</span>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">Conversations</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage customer conversations across all AI Employees.</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition w-48"
              />
            </div>

            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Website">Website</option>
              <option value="Phone">Phone</option>
              <option value="AI Chat">AI Chat</option>
            </select>

            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>

        {/* Inbox Tabs */}
        <div className="flex gap-1 mt-4">
          {INBOX_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.key === 'needs_attention' && (
                <span className="ml-1.5 px-1 py-0.5 rounded bg-red-500 text-white text-[8px] font-black">1</span>
              )}
              {tab.key === 'unread' && (
                <span className="ml-1.5 px-1 py-0.5 rounded bg-slate-200 text-slate-600 text-[8px] font-black">
                  {DEMO_CONVERSATIONS.filter(c => c.unread > 0).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3-Pane Inbox Body ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT — Conversation List */}
        <div className={`
          flex-col w-full md:w-80 lg:w-72 xl:w-80 shrink-0 border-r border-slate-200 bg-white overflow-y-auto
          ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        `}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs">
              <Inbox className="w-8 h-8 mb-2 opacity-40" />
              No conversations match your filter.
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors relative ${
                  selectedId === conv.id ? 'bg-blue-50/60 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                    {conv.customerInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800 truncate">{conv.customerName}</span>
                      <span className="text-[9px] text-slate-400 font-semibold shrink-0">{conv.lastTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {channelIcon(conv.channel)}
                      <span className="text-[9px] font-bold text-slate-400">{conv.channel}</span>
                      {statusDot(conv.status)}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 truncate leading-tight">{conv.lastMessage}</p>

                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-slate-400 font-medium truncate">{conv.assignedEmployee}</span>
                      {conv.unread > 0 && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* MIDDLE — Active Conversation ──────────────────────────────── */}
        <div className={`
          flex-col flex-1 min-w-0 bg-white border-r border-slate-200
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Conversation Header */}
          <div className="shrink-0 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
            {/* Mobile back button */}
            <button
              className="md:hidden text-slate-400 hover:text-slate-600 mr-1"
              onClick={() => setMobileView('list')}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                {selected.customerInitials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 truncate">{selected.customerName}</h2>
                  <span className={`hidden sm:inline-flex text-[9px] px-2 py-0.5 rounded-full font-bold border ${sl.cls}`}>
                    {sl.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${channelBadgeClass(selected.channel)}`}>
                    {selected.channel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    via {selected.assignedEmployee}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                Resolve
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50">
            {selected.messages.map(msg => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.role === 'customer' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-black shrink-0 mt-0.5">
                    {selected.customerInitials}
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'customer'
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                        : 'bg-blue-600 text-white rounded-tr-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${msg.role === 'customer' ? '' : 'justify-end'}`}>
                    {msg.role === 'ai' && <Bot className="w-2.5 h-2.5 text-blue-400" />}
                    <span className="text-[9px] text-slate-400 font-medium">
                      {msg.role === 'ai' ? `AI · ${msg.time}` : msg.time}
                    </span>
                  </div>
                </div>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition">
              <textarea
                value={composerText}
                onChange={e => setComposerText(e.target.value)}
                placeholder="Type a reply… (this is a read-only inbox demo)"
                rows={2}
                className="flex-1 resize-none bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none leading-relaxed"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) e.preventDefault()
                }}
              />
              <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  disabled={!composerText.trim()}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 px-1">
              Replies sent here will be routed through the assigned AI Employee channel. Human-override mode.
            </p>
          </div>
        </div>

        {/* RIGHT — Customer Info Panel ─────────────────────────────────── */}
        <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Details</h3>
          </div>

          <div className="px-5 py-4 space-y-5 text-xs">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black">
                {selected.customerInitials}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{selected.customerName}</p>
                {selected.location && (
                  <p className="text-[11px] text-slate-500">{selected.location}</p>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              {selected.customerPhone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">{selected.customerPhone}</span>
                </div>
              )}
              {selected.customerEmail && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium truncate">{selected.customerEmail}</span>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Lead details */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Information</h4>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {selected.leadStatus}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lead Score</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${leadScoreColor(selected.leadScore)}`}>
                  {selected.leadScore} / 100
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Source</span>
                <span className="font-semibold text-slate-700 text-right max-w-[140px] truncate">{selected.source}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Channel</span>
                <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${channelBadgeClass(selected.channel)}`}>
                  {selected.channel}
                </span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Assigned employee */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned AI Employee</h4>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">{selected.assignedEmployee}</p>
                  <span className="text-[9px] text-emerald-600 font-bold">● Active</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {selected.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-slate-100" />

            {/* Actions */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</h4>
              <Link
                href="/leads"
                className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition text-[11px]"
              >
                View Lead Profile <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition text-[11px]">
                Assign to Human <User className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition text-[11px]">
                Close Conversation <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
