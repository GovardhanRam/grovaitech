/**
 * Grovaitech AI Platform
 * tests/unit/phase-5p-multi-turn.test.ts
 *
 * PHASE 5P: Controlled Multi-Turn Function-Calling Test with Live Gemini 3.6 Flash.
 * Validates conversational lead qualification across 2 turns and intercepts
 * the create_lead tool call before database execution.
 */

import { describe, it, expect } from 'vitest'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCanonicalEmployeeBySlug } from '@/lib/employees/registry'
import { resolveAuthorizedTools } from '@/lib/ai/runtime'
import { validateParams } from '@/lib/ai/dispatcher'
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai/gemini'

// Safely load .env.local if not already in environment
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // Already loaded or file absent
  }
}

const rawApiKey = (process.env.GEMINI_API_KEY || '').trim()
const hasLiveApiKey = rawApiKey.length > 10 && !rawApiKey.includes('placeholder')

describe('PHASE 5P: Controlled Live Gemini 3.6 Flash Multi-Turn Function-Calling', () => {
  it.skipIf(!hasLiveApiKey)('conducts multi-turn qualification and safely intercepts create_lead without database execution', async () => {
    if (!hasLiveApiKey) {
      console.log('[Phase 5P] GEMINI_API_KEY is not configured. Skipping live integration test.')
      return
    }

    const apiKey = rawApiKey
    expect(apiKey.length).toBeGreaterThan(10)
    expect(apiKey).not.toContain('placeholder')

    // Model target must be gemini-3.6-flash
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.6-flash')
    const modelName = DEFAULT_GEMINI_MODEL

    const trustedClientId = 'client-test-synthetic-01'
    const trustedDeploymentId = 'dep-client-test-synthetic-01-real-estate-lead-receptionist'

    // Compose immutable canonical prompt with client deployment context
    const canonicalEmployee = getCanonicalEmployeeBySlug('real-estate-lead-receptionist')
    expect(canonicalEmployee).toBeDefined()

    const systemContext = `[Client Deployment Context]
Organization: "Grovaitech Test Client"
Industry: "real-estate"
Location / Territory: "India / Global"
Authorized Channels: Web Chat, WhatsApp
Assigned Workforce Agent: "Real Estate Lead Receptionist" (real-estate-lead-receptionist)
Bound Automation Workflow: "Real Estate Lead ➔ WhatsApp & Site Visit Sync" (wf-001)
Key Business Priorities: Inbound lead qualification; Response latency optimization
Guardrail: Strictly represent "Grovaitech Test Client" with truthful, verified operational data.`

    const compositeSystemPrompt = `${canonicalEmployee!.system_prompt}\n\n${systemContext}`

    const canonicalTools = resolveAuthorizedTools('real-estate-lead-receptionist')
    // Target tool for lead qualification is create_lead
    const LIVE_ALLOWLIST = new Set(['create_lead'])
    const activeTools = canonicalTools.filter((t) => LIVE_ALLOWLIST.has(t.name))

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: compositeSystemPrompt,
      tools: [{ functionDeclarations: activeTools as any }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }, { timeout: 60000 })

    // Helper for transient API retries (503 Service Unavailable spikes)
    async function generateWithRetry(contents: any, retries = 3): Promise<any> {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await model.generateContent({ contents })
          return await res.response
        } catch (err: any) {
          const isTransient = err?.message?.includes('503') || err?.message?.includes('429') || err?.message?.includes('high demand')
          if (isTransient && i < retries - 1) {
            console.log(`[Phase 5P] Gemini API returned transient status (${err?.message?.slice(0, 80)}...). Retrying in ${(i + 1) * 3}s...`)
            await new Promise((r) => setTimeout(r, (i + 1) * 3000))
            continue
          }
          throw err
        }
      }
    }

    const conversationHistory: Array<{
      role: 'user' | 'model' | 'function'
      parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>
    }> = []

    // ──────────────────────────────────────────────────────────────────────────
    // TURN 1: Incomplete Customer Inquiry
    // ──────────────────────────────────────────────────────────────────────────
    const turn1Message = "Hi, I'm looking for a 2-bedroom apartment in Salem. My budget is 50 lakhs."
    conversationHistory.push({
      role: 'user',
      parts: [{ text: turn1Message }],
    })

    const turn1Response = await generateWithRetry(conversationHistory as any)

    // Extract any function calls from Turn 1
    const turn1FunctionCalls: any[] = []
    for (const candidate of turn1Response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if ((part as any).functionCall) {
          turn1FunctionCalls.push((part as any).functionCall)
        }
      }
    }

    console.log('\n[Phase 5P] Turn 1 Candidates:\n', JSON.stringify(turn1Response.candidates, null, 2))
    let turn1Text = ''
    try {
      turn1Text = turn1Response.text()
    } catch {
      turn1Text = turn1Response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || ''
    }
    console.log('\n[Phase 5P] Turn 1 Assistant Response:\n', turn1Text.trim())

    // VERIFICATION 1: In Turn 1, create_lead MUST NOT be called prematurely
    const turn1CreateLeadCalls = turn1FunctionCalls.filter((fc) => fc.name === 'create_lead')
    expect(turn1CreateLeadCalls.length).toBe(0)
    expect(turn1Text.length).toBeGreaterThan(5)

    // Push the full candidate content from Turn 1 to preserve thoughts
    conversationHistory.push(turn1Response.candidates[0].content)

    // ──────────────────────────────────────────────────────────────────────────
    // TURN 2: Qualified Customer Details
    // ──────────────────────────────────────────────────────────────────────────
    const turn2Message = "I'm looking to buy within the next 2 months. My name is Ravi and my phone number is +919888888888."
    conversationHistory.push({
      role: 'user',
      parts: [{ text: turn2Message }],
    })

    const turn2Response = await generateWithRetry(conversationHistory as any)

    // Extract function calls from Turn 2
    const turn2FunctionCalls: any[] = []
    for (const candidate of turn2Response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if ((part as any).functionCall) {
          turn2FunctionCalls.push((part as any).functionCall)
        }
      }
    }

    // VERIFICATION 2: Gemini recognized sufficient info and prepared create_lead
    expect(turn2FunctionCalls.length).toBeGreaterThan(0)
    const proposedCall = turn2FunctionCalls[0]
    expect(proposedCall.name).toBe('create_lead')

    // VERIFICATION 3: Intercept and validate structured arguments before execution
    const rawArgs = { ...proposedCall.args }
    const validatedArgs = validateParams(rawArgs, {
      name: { type: 'string', required: true },
      phone: { type: 'phone', required: true, minLength: 7 },
      email: { type: 'string' },
      location: { type: 'string', default: 'Salem' },
      budget: { type: 'string', default: '50 lakhs' },
      timeline: { type: 'string', default: '2 months' },
      notes: { type: 'string' },
      property_type: { type: 'string', enum: ['villa', 'apartment', 'house', 'plot', 'commercial', 'other'], default: 'apartment' },
    })

    expect(validatedArgs.name.toLowerCase()).toContain('ravi')
    expect(validatedArgs.phone).toBe('+919888888888')
    expect(validatedArgs.location.toLowerCase()).toContain('salem')

    // VERIFICATION 4: Enforce trusted server-controlled tenant identity
    rawArgs.client_id = trustedClientId
    rawArgs.deployment_id = trustedDeploymentId

    expect(rawArgs.client_id).toBe('client-test-synthetic-01')
    expect(rawArgs.deployment_id).toBe('dep-client-test-synthetic-01-real-estate-lead-receptionist')

    // VERIFICATION 5: Return deterministic MOCK result to model (ZERO database writes)
    const mockLeadId = 'mock-lead-intercepted-p5p'
    const mockToolResult = {
      name: 'create_lead',
      response: {
        success: true,
        leadId: mockLeadId,
        message: `Lead for ${validatedArgs.name} (${validatedArgs.phone}) successfully registered with Grovaitech Test Client for 2-bedroom apartment in Salem.`,
        isSimulated: true,
      },
    }

    console.log('\n[Phase 5P] Turn 2 Model Content Parts:\n', JSON.stringify(turn2Response.candidates?.[0]?.content, null, 2))

    // Preserve the exact model content from turn 2 (maintains thought_signature for tools)
    conversationHistory.push(turn2Response.candidates[0].content)

    conversationHistory.push({
      role: 'user',
      parts: [{ functionResponse: mockToolResult }],
    })

    const finalResponse = await generateWithRetry(conversationHistory as any)
    const finalConfirmationText = finalResponse.text()
    console.log('\n[Phase 5P] Final Assistant Confirmation:\n', finalConfirmationText.trim())

    expect(finalConfirmationText).toBeTruthy()
    expect(typeof finalConfirmationText).toBe('string')
  }, 120000)
})
