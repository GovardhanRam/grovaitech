'use client'

/**
 * Grovaitech AI Platform
 * components/conversations/ConversationsWorkspace.tsx
 *
 * Unified Conversations Inbox Client Component.
 * Supports live Supabase conversations, search, filtering, thread inspector,
 * customer lead sidebar, and isolated fallback display.
 */

import { useState, useTransition, useEffect } from 'react'
import {
  Search,
  ChevronRight,
  Bot,
  MessageSquare,
  Send,
  Paperclip,
  MoreHorizontal,
  X,
  User,
  Mail,
  PhoneCall,
  ExternalLink,
  Inbox,
  SlidersHorizontal,
  RefreshCw,
  Globe,
  Database,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import type { Conversation, ConversationChannel, ConversationStatus } from '@/types/conversations'
import { getConversations } from '@/app/actions/conversations'

// ─── Sub-components & Helpers ────────────────────────────────────────────────

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

type InboxTab = 'all' | 'unread' | 'ai_handled' | 'needs_attention' | 'resolved'

const INBOX_TABS: { key: InboxTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'ai_handled', label: 'AI Handled' },
  { key: 'needs_attention', label: 'Needs Attention' },
  { key: 'resolved', label: 'Resolved' },
]

interface ConversationsWorkspaceProps {
  initialConversations: Conversation[]
  isFallback: boolean
}

export function ConversationsWorkspace({
  initialConversations,
  isFallback: initialIsFallback,
}: ConversationsWorkspaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [isFallback, setIsFallback] = useState<boolean>(initialIsFallback)
  const [selectedId, setSelectedId] = useState<string>(
    initialConversations.length > 0 ? initialConversations[0].id : ''
  )
  const [activeTab, setActiveTab] = useState<InboxTab>('all')
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [composerText, setComposerText] = useState('')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [isPending, startTransition] = useTransition()

  // Update selected conversation if conversations list changes
  useEffect(() => {
    if (conversations.length > 0 && (!selectedId || !conversations.some((c) => c.id === selectedId))) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  const selected = conversations.find((c) => c.id === selectedId) || conversations[0]

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getConversations()
      if (res.success && res.conversations) {
        setConversations(res.conversations)
        setIsFallback(res.isFallback)
      }
    })
  }

  const filtered = conversations.filter((c) => {
    const matchSearch =
      !search ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase()) ||
      (c.customerPhone && c.customerPhone.includes(search))
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

  const sl = selected ? statusLabel(selected.status) : { label: 'Active', cls: 'bg-slate-100 text-slate-500' }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] -m-6 bg-slate-50 overflow-hidden">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-6 pb-4 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                AI Workforce OS
              </span>
              {isFallback ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  Demo Sandbox Mode
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> Live Supabase
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">
              Conversations
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified inbox across Web Chat, WhatsApp, and AI Employee customer engagements.
            </p>
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
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition w-48"
              />
            </div>

            {/* Channel filter */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Website">Website</option>
              <option value="Phone">Phone</option>
              <option value="AI Chat">AI Chat</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isPending}
              title="Refresh conversation feeds from Supabase"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Inbox Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-0.5">
          {INBOX_TABS.map((tab) => {
            const count =
              tab.key === 'unread'
                ? conversations.filter((c) => c.unread > 0).length
                : tab.key === 'needs_attention'
                ? conversations.filter((c) => c.status === 'needs_attention').length
                : null

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {count !== null && count > 0 && (
                  <span
                    className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-black ${
                      tab.key === 'needs_attention'
                        ? 'bg-red-500 text-white'
                        : activeTab === tab.key
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3-Pane Inbox Body ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT — Conversation List */}
        <div
          className={`
          flex-col w-full md:w-80 lg:w-72 xl:w-80 shrink-0 border-r border-slate-200 bg-white overflow-y-auto
          ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        `}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs px-4 text-center">
              <Inbox className="w-8 h-8 mb-2 opacity-40" />
              <p className="font-semibold text-slate-600">No conversations found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try changing your search or filter criteria.</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors relative cursor-pointer ${
                  selected?.id === conv.id ? 'bg-blue-50/60 border-l-2 border-l-blue-600' : ''
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
        {selected ? (
          <div
            className={`
            flex-col flex-1 min-w-0 bg-white border-r border-slate-200
            ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
          `}
          >
            {/* Conversation Header */}
            <div className="shrink-0 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
              {/* Mobile back button */}
              <button
                className="md:hidden text-slate-400 hover:text-slate-600 mr-1 cursor-pointer"
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
                <Link
                  href="/leads"
                  className="px-3 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  View Lead
                </Link>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50">
              {selected.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                  No messages in this conversation yet.
                </div>
              ) : (
                selected.messages.map((msg) => (
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
                            : 'bg-blue-600 text-white rounded-tr-none shadow-xs'
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
                ))
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition">
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Type a message or note..."
                  rows={2}
                  className="flex-1 resize-none bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) e.preventDefault()
                  }}
                />
                <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!composerText.trim()}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 px-1">
                Connected to {selected.channel} session: {selected.id}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs bg-slate-50">
            Select a conversation to view the message thread.
          </div>
        )}

        {/* RIGHT — Customer Info Panel ─────────────────────────────────── */}
        {selected && (
          <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 bg-white overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Customer Details
              </h3>
            </div>

            <div className="px-5 py-4 space-y-5 text-xs">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black">
                  {selected.customerInitials}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selected.customerName}</p>
                  {selected.location && <p className="text-[11px] text-slate-500">{selected.location}</p>}
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
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Lead Information
                </h4>

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
                  <span className="font-semibold text-slate-700 text-right max-w-[140px] truncate">
                    {selected.source}
                  </span>
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
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Assigned AI Employee
                </h4>
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
              {selected.tags && selected.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                      >
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
                  View in CRM <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
