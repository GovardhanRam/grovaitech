import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateResponse } from '@/lib/gemini/client'

export async function POST(request: NextRequest) {
  console.log('=== API CHAT CALLED ===')
  
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }
    
    console.log('User:', user.email)
    
    const { message, chatId, history } = await request.json()
    console.log('Message:', message)
    
    let currentChatId = chatId
    if (!currentChatId) {
      // Create new chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({ 
          user_id: user.id, 
          title: message.slice(0, 50) 
        })
        .select()
        .single()

      if (chatError) {
        console.error('Chat creation error:', chatError)
        return NextResponse.json(
          { error: 'Failed to create chat: ' + chatError.message },
          { status: 500 }
        )
      }
      currentChatId = chat.id
      console.log('Chat created:', currentChatId)
    }

    // Save user message
    await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'user',
        content: message,
      })

    // Format conversation history for Gemini context
    const historyContext = history && Array.isArray(history) && history.length > 0
      ? history.map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n')
      : ''

    // Generate AI response
    const systemPrompt = `
You are GrovAI, an AI assistant for Grovaitech.
You help businesses with AI automation.

${historyContext}
User: ${message}
Assistant:`

    console.log('Calling Gemini...')
    const aiResponse = await generateResponse(systemPrompt)
    console.log('Gemini responded:', aiResponse.substring(0, 50))

    // Save AI response
    await supabase
      .from('messages')
      .insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: aiResponse,
      })

    return NextResponse.json({
      message: aiResponse,
      chatId: currentChatId,
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
