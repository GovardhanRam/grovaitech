'use client'

/**
 * Grovaitech AI Platform
 * components/chat/EmbedChatInterface.tsx
 *
 * Standalone Customer-Facing Embeddable AI Receptionist Chat Interface.
 * Designed for public iframe embedding on client real-estate websites.
 * 
 * Commercial Truthfulness Guardrails:
 * - Site visits are strictly designated as "site-visit request" or "preferred site-visit time".
 * - Never claims automatic calendar booking, WhatsApp confirmation, or external CRM sync.
 * - Zero exposure of internal admin controls, debug states, or simulated backend claims.
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, CheckCircle2, AlertCircle, Building2, MapPin } from 'lucide-react'

export interface EmbedChatInterfaceProps {
  deploymentId: string
  companyName: string
  employeeName: string
  employeeSlug?: string
  location?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  siteVisitRequested?: boolean
  timestamp?: string
}

const STARTER_PROMPTS = [
  'What properties or units are currently available?',
  'What is the price range and payment plan?',
  'I would like to submit a preferred site-visit time',
]

export default function EmbedChatInterface({
  deploymentId,
  companyName,
  employeeName,
  location,
}: EmbedChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const sendMessage = async (messageText?: string) => {
    const textToSend = (messageText || input).trim()
    if (!textToSend || isLoading) return

    setInput('')
    setErrorMessage(null)

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((prev) => [...prev, { role: 'user', content: textToSend, timestamp: now }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          chatId,
          deploymentId,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Unable to receive response. Please try again.')
      }

      const data = await response.json()
      if (data.chatId) {
        setChatId(data.chatId)
      }

      const hasSiteVisit =
        Boolean(data.lead?.site_visit_requested) ||
        Boolean(data.workflow?.workflowId === 'wf-001') ||
        (data.toolResults &&
          Array.isArray(data.toolResults) &&
          data.toolResults.some((t: any) => t.toolName === 'schedule_site_visit'))

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          siteVisitRequested: hasSiteVisit,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err: any) {
      console.error('[EmbedChat] Communication error:', err)
      setErrorMessage(err?.message || 'Connection issue. Please try again in a moment.')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered a momentary connection error. Please send your message again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans antialiased select-text">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900 tracking-tight leading-none">
                  {companyName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span>{employeeName}</span>
                {location && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              AI Real Estate Receptionist
            </span>
          </div>
        </div>
      </header>

      {/* ── Message Stream ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Empty State */}
          {messages.length === 0 ? (
            <div className="pt-6 pb-4 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-xs">
                <Bot className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h2 className="text-base font-semibold text-slate-900">
                  Welcome to {companyName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  I am your AI Real Estate Receptionist. How can I assist you today with property information, pricing, or submitting a site-visit request?
                </p>
              </div>

              {/* Starter Prompts */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center items-center">
                {STARTER_PROMPTS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(starter)}
                    className="w-full sm:w-auto text-left sm:text-center text-xs text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-600 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:border-blue-200 cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 items-start ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Commercial Truthfulness Notice for Site-Visit Requests */}
                  {msg.siteVisitRequested && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Preferred site-visit request noted. A sales representative will contact you to coordinate confirmation.
                      </span>
                    </div>
                  )}

                  {msg.timestamp && (
                    <div
                      className={`text-[10px] text-slate-400 px-1 ${
                        msg.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-start justify-start">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-xs text-slate-500 text-xs flex items-center gap-2 shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Generating response...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <footer className="shrink-0 bg-white border-t border-slate-200 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about properties, pricing, or request a site visit..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:bg-white transition-colors disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0 font-medium text-xs sm:text-sm"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Attribution */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <span>Press Enter to send</span>
            <span className="font-medium text-slate-500">
              Powered by <span className="font-semibold text-slate-700">Grovaitech AI</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
