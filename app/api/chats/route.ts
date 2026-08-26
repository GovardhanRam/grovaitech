import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateResponse } from '@/lib/gemini/client'
import { getEmployeeBySlug } from '@/lib/employees'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'

export async function POST(request: NextRequest) {
  console.log('=== API CHAT CALLED ===')
  
  try {
    const supabase = await createServerClient()
    
    // Check for authenticated user (allow guest fallback for public AI employee demos)
    let user: any = null
    try {
      const { data: authData } = await supabase.auth.getUser()
      user = authData?.user || null
    } catch {
      user = null
    }

    const body = await request.json()
    const { message, chatId, history } = body
    const employeeSlug = body.employeeSlug || body.slug || 'real-estate-lead-receptionist'
    console.log('Message:', message, 'Employee Slug:', employeeSlug, 'User:', user?.email || 'Guest Demo User')
    
    let currentChatId = chatId
    if (!currentChatId) {
      const chatPayload: any = {
        title: message ? message.slice(0, 50) : 'Real Estate Inquiry'
      }
      if (user?.id) {
        chatPayload.user_id = user.id
      }

      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert(chatPayload)
        .select()
        .single()

      if (chatError) {
        console.warn('Chat record creation notice (using generated ID):', chatError.message)
        currentChatId = `chat-session-${Date.now()}`
      } else {
        currentChatId = chat.id
      }
    }

    // Save user message to database
    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          role: 'user',
          content: message,
        })
    } catch (msgErr) {
      console.warn('Message log notice:', msgErr)
    }

    // Format conversation history for Gemini context
    const historyContext = history && Array.isArray(history) && history.length > 0
      ? history.map((h: any) => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.content}`).join('\n')
      : ''

    // Define Real Estate Receptionist system prompt with Gemini 3.7 Flash
    let systemPrompt = `
You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.
Your goal is to warmly assist prospective property buyers, answer questions intelligently, and qualify them for a site visit.

**Core Objectives:**
1. Understand buyer preferences (Property Type, Location, BHK, Budget, Timeline).
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. If the user mentions a site visit or wants to see properties (e.g. this weekend / Saturday / Sunday), offer to schedule the site visit and ask for their name and phone number.
4. Keep answers friendly, highly professional, and helpful. Do NOT sound like an interrogation checklist.

${historyContext}
Customer: ${message}
AI Receptionist:`

    if (employeeSlug) {
      const employee = await getEmployeeBySlug(employeeSlug)
      if (employee?.system_prompt) {
        systemPrompt = `
${employee.system_prompt}

${historyContext}
Customer: ${message}
AI Receptionist:`
      }
    }

    console.log('Generating response with Gemini 3.7 Flash...')
    const aiResponse = await generateResponse(systemPrompt)

    // Save assistant response
    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: aiResponse,
        })
    } catch (aiMsgErr) {
      console.warn('Assistant message log notice:', aiMsgErr)
    }

    // ── End-to-End Vertical Slice: Structured Lead Extraction & Workflow Engine ──
    let leadExtractionResult = null
    let workflowResult = null

    if (employeeSlug === 'real-estate-lead-receptionist') {
      try {
        console.log('[Vertical Slice] Starting structured lead analysis...')
        
        // Build combined conversation turns for context
        const turnHistory = [
          ...(history || []),
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse }
        ]

        const extractedLead = await extractRealEstateLead(turnHistory)
        leadExtractionResult = extractedLead
        console.log('[Vertical Slice] Extracted Lead:', extractedLead)

        // If lead meets qualification thresholds (has phone or key parameters), persist to Supabase & trigger workflow
        if (extractedLead.qualification_status === 'qualified' || extractedLead.phone || extractedLead.site_visit_requested) {
          const leadRecord = {
            name: extractedLead.name || 'Interested Buyer',
            phone: extractedLead.phone || '+91 Unverified',
            email: extractedLead.email || undefined,
            property_type: extractedLead.property_type || 'villa',
            location: extractedLead.location || 'Tirupati',
            budget: extractedLead.budget || '1.2 Cr',
            timeline: extractedLead.timeline || 'Immediate',
            site_visit_requested: extractedLead.site_visit_requested,
            site_visit_date: extractedLead.site_visit_date || undefined,
            site_visit_time: extractedLead.site_visit_time || undefined,
            lead_score: (extractedLead.site_visit_requested ? 'hot' : 'warm') as any,
            lead_status: (extractedLead.site_visit_requested ? 'site_visit' : 'qualified') as any,
            notes: `Extracted by Real Estate Lead Receptionist (Gemini 3.7 Flash). Chat ID: ${currentChatId}. Score: ${extractedLead.qualification_score}/100.`,
            source: 'ai_demo' as const,
            user_id: user?.id || null
          }

          const saveRes = await createLead(leadRecord)
          if (saveRes.success && saveRes.data) {
            const savedLeadId = saveRes.data.id
            console.log(`[Vertical Slice] Lead saved to Supabase (ID: ${savedLeadId}). Triggering wf-001...`)
            
            // Execute canonical workflow wf-001
            workflowResult = await executeRealEstateWorkflow({
              leadId: savedLeadId,
              conversationId: currentChatId,
              lead: extractedLead
            })
          }
        }
      } catch (sliceErr) {
        console.error('[Vertical Slice] Lead extraction/workflow error:', sliceErr)
      }
    }

    return NextResponse.json({
      message: aiResponse,
      chatId: currentChatId,
      lead: leadExtractionResult,
      workflow: workflowResult
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    )
  }
}
