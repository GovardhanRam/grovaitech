'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          chatId: chatId,
          history: messages.slice(-5),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error:', errorData)
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      setChatId(data.chatId)
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
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

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#94A3B8]">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[#3B82F6] mx-auto">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-lg font-bold text-white uppercase tracking-wider">Welcome to GROVAITECH</p>
              <p className="text-xs text-[#94A3B8]">Ask me anything about setting up your AI Receptionist or WhatsApp integrations.</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 items-start ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[#3B82F6] shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-md leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#3B82F6] text-white rounded-tr-none'
                    : 'bg-[#1E293B] border border-[#1E293B] text-slate-100 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/25 border border-[#3B82F6]/30 flex items-center justify-center font-bold text-[#60A5FA] shrink-0 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center font-bold text-[#3B82F6] shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-[#1E293B] border border-[#1E293B] px-4 py-2.5 rounded-2xl rounded-tl-none text-[#94A3B8] text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B82F6]" />
              <span>Generating response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#1E293B] p-4 bg-[#0F172A]/50">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#1E293B] bg-[#0F172A] px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#3B82F6]"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-45 text-white rounded-xl shadow-lg transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
