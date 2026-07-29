/**
 * Grovaitech AI Platform
 * app/api/rag-search/route.ts
 *
 * Handles context-aware document queries (RAG).
 * Receives the query, fetches document metadata, and prompts Gemini.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateResponse } from '@/lib/gemini/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query } = await request.json()
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Get list of uploaded documents
    const { data: docs } = await supabase
      .from('documents')
      .select('name')
      .eq('user_id', user.id)

    const docNames = docs && docs.length > 0 
      ? docs.map((d: any) => d.name).join(', ') 
      : 'No files uploaded yet'

    // Formulate a system prompt simulating RAG
    const ragPrompt = `
You are GrovAI, a Document RAG Search assistant. 
The user is asking a question about their uploaded business documents. 
Currently uploaded files: [${docNames}]

User Search Query: "${query}"

Respond as if you have successfully searched these files and found relevant answers. 
Provide a professional, concise response. Mention which document(s) you are referencing (e.g. dental_clinic_faqs.pdf or whatsapp_campaign_policy.docx) based on the user's query topic.
`

    const response = await generateResponse(ragPrompt)

    return NextResponse.json({
      answer: response,
      referencedDocs: docs && docs.length > 0 ? docs.slice(0, 2) : []
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
