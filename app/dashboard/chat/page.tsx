'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Send, 
  Loader2, 
  Plus, 
  MessageSquare, 
  Bot, 
  User, 
  Sparkles,
  Calendar,
  Phone,
  MessageCircle,
  HelpCircle
} from 'lucide-react'

interface Chat {
  id: string
  title: string
  created_at: string
}

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initial load
  useEffect(() => {
    async function loadChats() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: previousChats } = await supabase
        .from('chats')
        .select()
        .order('created_at', { ascending: false })

      if (previousChats && previousChats.length > 0) {
        setChats(previousChats)
        // Auto-select first chat
        selectChat(previousChats[0].id)
      }
    }
    loadChats()
  }, [supabase])

  const selectChat = async (id: string) => {
    setChatId(id)
    setIsLoading(true)
    
    const { data: history } = await supabase
      .from('messages')
      .select()
      .eq('chat_id', id)
      .order('created_at', { ascending: true })

    if (history) {
      setMessages(history)
    } else {
      setMessages([])
    }
    setIsLoading(false)
  }

  const startNewChat = () => {
    setChatId(null)
    setMessages([])
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatId: chatId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      
      // Update chat list if a new chat was created
      if (!chatId) {
        setChatId(data.chatId)
        
        // Refresh sidebar chat list
        const { data: updatedChats } = await supabase
          .from('chats')
          .select()
          .order('created_at', { ascending: false })
        if (updatedChats) setChats(updatedChats)
      }

      // Add assistant response to UI
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error during inference. Please check your API keys or connection.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestions = [
    { text: "Help me set up an AI Receptionist for a Clinic", icon: Calendar, color: 'text-blue-400' },
    { text: "How do I qualify leads on WhatsApp?", icon: MessageCircle, color: 'text-emerald-400' },
    { text: "Upload client onboarding PDFs for RAG search", icon: Sparkles, color: 'text-purple-400' },
    { text: "Write a webhook trigger for n8n workflow integrations", icon: HelpCircle, color: 'text-amber-400' }
  ]

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl border border-[#1E293B] bg-[#1E293B]/10 backdrop-blur-md overflow-hidden relative">
      
      {/* Secondary Sidebar - Chat History */}
      <aside className="w-64 border-r border-[#1E293B] bg-[#0F172A] flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-[#1E293B]">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/15 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> New Conversation
          </button>
        </div>
        
        {/* Chats History list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-[#94A3B8] text-xs font-medium">No previous chats</div>
          ) : (
            chats.map((chat) => {
              const isSelected = chat.id === chatId
              return (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-left text-xs font-medium truncate transition-all ${
                    isSelected
                      ? 'bg-[#1E293B] text-white border border-[#3B82F6]/30'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/40'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#3B82F6]' : 'text-slate-550'}`} />
                  <span className="truncate">{chat.title}</span>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* Main Chat Frame */}
      <div className="flex-1 flex flex-col bg-[#0F172A]/20 relative">
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#0F172A]/40 to-transparent pointer-events-none" />
        
        {/* Chat Balloon Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 text-center pt-8">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/25 mx-auto animate-bounce-slow">
                  <Bot className="w-7 h-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white pt-2">Deploy AI Employees with GROVAITECH</h2>
                <p className="text-[#94A3B8] text-xs leading-relaxed max-w-md mx-auto">
                  Ask me anything about setting up AI voice agents, scheduling receptionist functions, or custom WhatsApp workflow automations.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                {suggestions.map((s, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(s.text)
                    }}
                    className="p-3.5 rounded-xl border border-[#1E293B] bg-[#0F172A]/40 hover:bg-[#1E293B]/60 hover:border-[#3B82F6]/30 transition-all duration-200 group flex items-start gap-3"
                  >
                    <s.icon className={`w-4 h-4 shrink-0 mt-0.5 ${s.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-[11px] font-medium text-[#94A3B8] group-hover:text-white leading-normal">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[#3B82F6] shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm shadow-md leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#3B82F6] text-white rounded-tr-none'
                        : 'bg-[#1E293B]/70 border border-[#1E293B] text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/30 flex items-center justify-center font-bold text-[#60A5FA] shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[#3B82F6] shrink-0">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-[#1E293B]/70 border border-[#1E293B] px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-[#94A3B8] text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B82F6]" />
                    <span>Inference generating...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0F172A]/40">
          <div className="max-w-4xl mx-auto flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Deploy me an agent, ask questions, or ask RAG configurations..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white rounded-xl shadow-lg transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
