/**
 * Grovaitech AI Platform
 * lib/ai/gemini.ts
 *
 * Canonical Google Gemini Client for Grovaitech AI Workforce OS.
 * Provides unified inference, tool calling declarations, embeddings, and graceful fallbacks.
 * Conforms to installed @google/generative-ai SDK specifications.
 */

import { GoogleGenerativeAI, type FunctionDeclaration } from "@google/generative-ai"

// Model resolution order: GEMINI_MODEL -> MODEL_NAME (ignoring obsolete models) -> gemini-3.6-flash
const envModel = process.env.GEMINI_MODEL || process.env.MODEL_NAME
const OBSOLETE_MODELS = new Set(['gemini-1.5-flash', 'gemini-2.5-flash'])
export const DEFAULT_GEMINI_MODEL =
  envModel && !OBSOLETE_MODELS.has(envModel)
    ? envModel
    : 'gemini-3.6-flash'

// Default network request timeout (15 seconds)
export const DEFAULT_GEMINI_TIMEOUT_MS =
  parseInt(process.env.GEMINI_TIMEOUT_MS || "15000", 10) || 15000

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface GenerateTextOptions {
  model?: string
  prompt: string
  temperature?: number
  maxOutputTokens?: number
  systemInstruction?: string
  timeoutMs?: number
}

export interface GenerateTextResponse {
  text: string
  usage?: {
    promptTokens: number
    candidatesTokens: number
    totalTokens: number
  }
}

export interface EmbedTextOptions {
  model?: string
  text: string
  timeoutMs?: number
}

export interface EmbedTextResponse {
  embedding: number[]
}

export interface AgentConfig {
  role: string
  temperature?: number
}

export interface FunctionCallItem {
  name: string
  args: Record<string, any>
}

export interface GenerateWithToolsOptions {
  model?: string
  prompt?: string
  contents?: Array<{
    role: 'user' | 'model' | 'function' | 'system'
    parts: Array<{ text?: string; functionCall?: FunctionCallItem; functionResponse?: any }>
  }>
  tools?: FunctionDeclaration[]
  systemInstruction?: string
  temperature?: number
  timeoutMs?: number
}

export interface GenerateWithToolsResponse {
  text: string | null
  functionCalls?: FunctionCallItem[]
  rawResponse?: any
}

// ─── Local Dynamic Fallback Simulation ──────────────────────────────────────

interface FallbackConversationState {
  name: string | null
  phone: string | null
  location: string | null
  property_type: string | null
  bhk: number | null
  budget: string | null
  timeline: string | null
  site_visit_date: string | null
  wants_site_visit: boolean
}

function extractNameFromText(text: string): string | null {
  const introMatch = text.match(/(?:my name is|i am|this is|call me)\s+([A-Za-z]+)/i)
  if (introMatch && introMatch[1]) {
    const n = introMatch[1].trim()
    const black = ['looking', 'interested', 'a', 'the', 'here', 'customer', 'user', 'buyer', 'my', 'and', 'number', 'phone', 'ready', 'booking', 'visiting', 'planning']
    if (n.length > 1 && !black.includes(n.toLowerCase())) {
      return n.charAt(0).toUpperCase() + n.slice(1)
    }
  }
  const explicitMatch = text.match(/\bname\s*[:=]\s*([A-Za-z]+)/i)
  if (explicitMatch && explicitMatch[1]) {
    const n = explicitMatch[1].trim()
    const black = ['is', 'looking', 'interested', 'a', 'the', 'here', 'customer', 'user', 'buyer']
    if (n.length > 1 && !black.includes(n.toLowerCase())) {
      return n.charAt(0).toUpperCase() + n.slice(1)
    }
  }
  return null
}

function extractPhoneFromText(text: string): string | null {
  const match = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|(?:\+91[\s-]?)?[6-9]\d{9}|(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6-9]\d{9}\b/)
  if (match) return match[0].trim()
  return null
}

function parseConversationState(fullPrompt: string): { state: FallbackConversationState; latestMessage: string } {
  const delimiters = ["Customer:", "User:", "Human:"]
  let lastIndex = -1
  let chosenDelimLen = 0

  for (const delim of delimiters) {
    const idx = fullPrompt.lastIndexOf(delim)
    if (idx > lastIndex) {
      lastIndex = idx
      chosenDelimLen = delim.length
    }
  }

  let latestMessage = ""
  if (lastIndex !== -1) {
    const afterDelim = fullPrompt.substring(lastIndex + chosenDelimLen)
    const assistantDelims = ["AI Receptionist:", "Assistant:", "AI:"]
    let assistIdx = -1
    for (const aDelim of assistantDelims) {
      const aIdx = afterDelim.indexOf(aDelim)
      if (aIdx !== -1 && (assistIdx === -1 || aIdx < assistIdx)) {
        assistIdx = aIdx
      }
    }
    latestMessage = assistIdx !== -1 ? afterDelim.substring(0, assistIdx).trim() : afterDelim.trim()
  } else {
    latestMessage = fullPrompt.trim()
  }

  const lowerFull = fullPrompt.toLowerCase()
  const lowerLatest = latestMessage.toLowerCase()

  const phone = extractPhoneFromText(latestMessage) || extractPhoneFromText(fullPrompt)
  const name = extractNameFromText(latestMessage) || extractNameFromText(fullPrompt)

  let bhk: number | null = null
  const bhkMatch = latestMessage.match(/(\d)\s*(?:bhk|bedroom|bed)/i) || fullPrompt.match(/(\d)\s*(?:bhk|bedroom|bed)/i)
  if (bhkMatch && bhkMatch[1]) {
    bhk = parseInt(bhkMatch[1], 10)
  }

  let property_type: string | null = null
  if (lowerFull.includes('villa')) property_type = 'villa'
  else if (lowerFull.includes('apartment') || lowerFull.includes('flat')) property_type = 'apartment'
  else if (lowerFull.includes('house') || lowerFull.includes('home')) property_type = 'house'
  else if (lowerFull.includes('plot') || lowerFull.includes('land')) property_type = 'plot'
  else if (lowerFull.includes('commercial') || lowerFull.includes('office')) property_type = 'commercial'

  let location: string | null = null
  const locMatch = latestMessage.match(/in\s+([A-Za-z\s]+?)(?:,|\.|\band\b|\bfor\b|\bwith\b|\bwithin\b|$)/i) || fullPrompt.match(/in\s+([A-Za-z\s]+?)(?:,|\.|\band\b|\bfor\b|\bwith\b|\bwithin\b|$)/i)
  if (locMatch && locMatch[1]) {
    const candidate = locMatch[1].trim()
    if (!['my', 'a', 'the', 'this', 'our', 'good', 'any'].includes(candidate.toLowerCase())) {
      location = candidate.charAt(0).toUpperCase() + candidate.slice(1)
    }
  }

  let budget: string | null = null
  const budgetMatch = latestMessage.match(/(?:budget|around|under|within|approx|up to|upto)\s*(?:is|of)?\s*([₹\d\s,.]+(?:cr|crore|crores|lakh|lakhs|l|k|million)?)/i) || fullPrompt.match(/(?:budget|around|under|within|approx|up to|upto)\s*(?:is|of)?\s*([₹\d\s,.]+(?:cr|crore|crores|lakh|lakhs|l|k|million)?)/i)
  if (budgetMatch && budgetMatch[1]) {
    budget = budgetMatch[1].trim()
  }

  const wants_site_visit = lowerLatest.includes('site visit') || lowerLatest.includes('visit') || lowerLatest.includes('tour') || lowerFull.includes('site visit')

  let site_visit_date: string | null = null
  if (lowerLatest.includes('saturday') || lowerFull.includes('saturday')) site_visit_date = 'Saturday'
  else if (lowerLatest.includes('sunday') || lowerFull.includes('sunday')) site_visit_date = 'Sunday'
  else if (lowerLatest.includes('tomorrow') || lowerFull.includes('tomorrow')) site_visit_date = 'Tomorrow'
  else if (lowerLatest.includes('this weekend') || lowerFull.includes('this weekend')) site_visit_date = 'This Weekend'

  let timeline: string | null = null
  if (lowerFull.includes('immediate') || lowerFull.includes('asap') || lowerFull.includes('now')) timeline = 'Immediate'
  else if (lowerFull.includes('1 month') || lowerFull.includes('next month')) timeline = '1 Month'
  else if (site_visit_date) timeline = site_visit_date

  return {
    state: {
      name,
      phone,
      location,
      property_type,
      bhk,
      budget,
      timeline,
      site_visit_date,
      wants_site_visit,
    },
    latestMessage,
  }
}

export const getSimulatedResponse = (prompt: string, systemInstruction?: string): string => {
  const fullContext = systemInstruction ? `${systemInstruction}\n${prompt}` : prompt
  const lowercasePrompt = fullContext.toLowerCase()
  const isClinic =
    lowercasePrompt.includes("medical clinic") ||
    lowercasePrompt.includes("clinic receptionist") ||
    lowercasePrompt.includes("clinic") ||
    lowercasePrompt.includes("doctor") ||
    lowercasePrompt.includes("dentist") ||
    lowercasePrompt.includes("appointment") ||
    lowercasePrompt.includes("patient")

  const isRealEstate =
    lowercasePrompt.includes("real estate") ||
    lowercasePrompt.includes("property") ||
    lowercasePrompt.includes("receptionist") ||
    lowercasePrompt.includes("villa") ||
    lowercasePrompt.includes("apartment") ||
    lowercasePrompt.includes("flat") ||
    lowercasePrompt.includes("house") ||
    lowercasePrompt.includes("plot") ||
    lowercasePrompt.includes("bhk") ||
    lowercasePrompt.includes("site visit")

  const { state, latestMessage } = parseConversationState(prompt)
  const query = latestMessage.toLowerCase()

  if (isRealEstate) {
    const propLabel = `${state.bhk ? `${state.bhk} BHK ` : ''}${state.property_type ? `${state.property_type}` : 'property'}`
    const locLabel = state.location ? ` in ${state.location}` : ''

    if (state.phone || (state.name && query.includes('number'))) {
      const greeting = state.name ? `Thank you, ${state.name}!` : 'Thank you!'
      const dateText = state.site_visit_date ? ` for this ${state.site_visit_date}` : ''
      const budgetText = state.budget ? ` (Budget: ₹${state.budget})` : ''
      const phoneText = state.phone ? ` on ${state.phone}` : ''

      return `${greeting} I have recorded your site visit request${dateText} for a ${propLabel}${locLabel}${budgetText}. Our real estate specialist will contact you${phoneText} to confirm the exact appointment details and share the property location. Is there anything specific you would like us to prepare for your visit?`
    }

    if (state.site_visit_date || query.includes('visit') || query.includes('tour') || query.includes('saturday') || query.includes('sunday')) {
      const dateTarget = state.site_visit_date || 'this weekend'
      const budgetNote = state.budget ? ` for our ₹${state.budget} options` : ''
      return `I would be delighted to schedule a site visit for you this ${dateTarget}${budgetNote}${locLabel}! Could you please share your full name and contact phone number so our team can confirm the site visit details?`
    }

    if (query.includes('budget') || query.includes('cr') || query.includes('crore') || query.includes('lakh')) {
      const budgetVal = state.budget ? `₹${state.budget}` : 'your specified budget'
      return `Understood! We have premium ${propLabel}${locLabel} within ${budgetVal}. Would you like to schedule a site visit this weekend to view the available units, or are you looking for specific amenities like a clubhouse or private garden?`
    }

    if (state.property_type || state.location || state.bhk) {
      if (!state.budget) {
        return `Hello! Welcome to Grovaitech Real Estate. I can certainly assist you with finding ${propLabel}${locLabel}. What is your preferred budget range, and when are you planning to make a purchase?`
      }
      return `Hello! We have excellent options for ${propLabel}${locLabel} within ₹${state.budget}. Would you like to schedule a site visit to view the available properties?`
    }

    if (query.includes('hello') || query.includes('hi ') || query.includes('hey')) {
      return "Hello! Welcome to Grovaitech Real Estate. I am your AI Lead Receptionist. What type of property and location are you looking for today?"
    }

    if (query.includes('price') || query.includes('cost')) {
      return "We have properties ranging from 2 BHK apartments to luxury 3 and 4 BHK villas. Which location and property type are you interested in so I can provide accurate pricing?"
    }

    return "Thank you for your enquiry. I would be happy to help you with your property search. Could you please share your preferred location, property type, and budget?"
  }

  if (isClinic) {
    if (query.includes("book") || query.includes("appointment") || query.includes("schedule")) {
      return "Hello! I can certainly help you book an appointment at the clinic. Could you please tell me your full name, phone number, and preferred date/time?"
    }
    if (query.includes("timing") || query.includes("hour") || query.includes("time") || query.includes("open")) {
      return "Our clinic is open from 9 AM to 6 PM, Monday to Saturday. We are closed on Sundays. Let me know if you would like to book a slot!"
    }
    if (query.includes("doctor") || query.includes("specialist") || query.includes("dentist")) {
      return "We have Dr. Verma (General Dentistry) and Dr. Reddy (Orthodontics) available at the clinic. Would you like to schedule a consultation with one of them?"
    }
    if (query.includes("hello") || query.includes("hi ") || query.includes("hey")) {
      return "Hello! Welcome to the Clinic. I am your front-desk AI Receptionist. How can I help you today?"
    }
    return "Thank you for the details. I've noted down your request. Our medical front-desk team will confirm your slot shortly. Is there anything else I can assist with?"
  }

  return `Hello! I am **GrovAI**, your business automation partner from Grovaitech. 

I help businesses deploy **AI Employees** to handle voice calls, WhatsApp leads, support queries, and document searches.

What aspect of your business would you like to automate today?
- Deploying an AI Receptionist
- Qualifying leads from WhatsApp
- Creating a Document Knowledge Base`
}

// ─── Content Formatting for Simulation ──────────────────────────────────────

export function extractConversationTextFromContents(
  contents?: GenerateWithToolsOptions['contents']
): string {
  if (!contents || !Array.isArray(contents) || contents.length === 0) {
    return ''
  }

  const lines: string[] = []
  for (const turn of contents) {
    const rolePrefix =
      turn.role === 'model' || turn.role === 'system'
        ? 'AI Receptionist: '
        : 'Customer: '
    const textParts = (turn.parts || [])
      .map((p) => {
        if (p.text) return p.text
        if (p.functionCall)
          return `[Action: ${p.functionCall.name}(${JSON.stringify(p.functionCall.args || {})})]`
        if (p.functionResponse)
          return `[Result: ${JSON.stringify(p.functionResponse.response || {})}]`
        return ''
      })
      .filter(Boolean)
      .join(' ')

    if (textParts.trim()) {
      lines.push(`${rolePrefix}${textParts.trim()}`)
    }
  }

  return lines.join('\n')
}

function sanitizeLogMessage(msg: any): string {
  if (!msg) return ''
  const str = typeof msg === 'string' ? msg : JSON.stringify(msg)
  return str
    .replace(/(?:AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_API_KEY]')
    .replace(/(?:ghp_[0-9A-Za-z]{36})/g, '[REDACTED_TOKEN]')
    .replace(/(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/g, '[REDACTED_JWT]')
}

// ─── Canonical Gemini Client Class ──────────────────────────────────────────

export class Gemini {
  private apiKey: string
  private genAI: GoogleGenerativeAI | null = null

  constructor(apiKey?: string) {
    this.apiKey = (apiKey || process.env.GEMINI_API_KEY || "").trim()
    if (this.apiKey && !this.apiKey.includes('placeholder')) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
    }
  }

  /**
   * Generates text content using Gemini with detailed logging and graceful fallback
   */
  async generateText(options: GenerateTextOptions): Promise<GenerateTextResponse> {
    const rawModel = options.model || DEFAULT_GEMINI_MODEL
    const modelName = OBSOLETE_MODELS.has(rawModel) ? DEFAULT_GEMINI_MODEL : rawModel
    const temperature = options.temperature ?? 0.7
    const timeoutMs = options.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS

    if (!this.genAI) {
      return {
        text: getSimulatedResponse(options.prompt, options.systemInstruction),
      }
    }

    try {
      const model = this.genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: {
            temperature,
            maxOutputTokens: options.maxOutputTokens,
          },
          systemInstruction: options.systemInstruction,
        },
        { timeout: timeoutMs }
      )

      const result = await model.generateContent(options.prompt)
      const res = await result.response

      return {
        text: res.text(),
        usage: res.usageMetadata
          ? {
              promptTokens: res.usageMetadata.promptTokenCount || 0,
              candidatesTokens: res.usageMetadata.candidatesTokenCount || 0,
              totalTokens: res.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      }
    } catch (error: any) {
      console.error(`[Gemini API Error] (${modelName}):`, {
        status: error?.status,
        message: sanitizeLogMessage(error?.message || String(error)),
        errorDetails: error?.errorDetails,
      })

      return {
        text: getSimulatedResponse(options.prompt, options.systemInstruction),
      }
    }
  }

  /**
   * Generates content with tool/function declarations for structured calling
   */
  async generateContentWithTools(options: GenerateWithToolsOptions): Promise<GenerateWithToolsResponse> {
    const rawModel = options.model || DEFAULT_GEMINI_MODEL
    const modelName = OBSOLETE_MODELS.has(rawModel) ? DEFAULT_GEMINI_MODEL : rawModel
    const temperature = options.temperature ?? 0.2
    const timeoutMs = options.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS

    if (!this.genAI) {
      const promptText = options.prompt || extractConversationTextFromContents(options.contents)
      return {
        text: getSimulatedResponse(promptText, options.systemInstruction),
        functionCalls: [],
      }
    }

    try {
      const toolsConfig = options.tools && options.tools.length > 0 ? [{
        functionDeclarations: options.tools,
      }] : undefined

      const model = this.genAI.getGenerativeModel(
        {
          model: modelName,
          tools: toolsConfig,
          generationConfig: {
            temperature,
          },
          systemInstruction: options.systemInstruction,
        },
        { timeout: timeoutMs }
      )

      const contents = options.contents || (options.prompt ? [options.prompt] : [])
      const result = await model.generateContent(contents as any)
      const response = await result.response

      const functionCalls: FunctionCallItem[] = []
      const candidates = response.candidates || []
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || []
        for (const part of parts) {
          if ((part as any).functionCall) {
            functionCalls.push({
              name: (part as any).functionCall.name,
              args: (part as any).functionCall.args,
            })
          }
        }
      }

      let text: string | null = null
      try {
        text = response.text()
      } catch {
        text = null
      }

      return {
        text,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        rawResponse: response,
      }
    } catch (error: any) {
      console.error(`[Gemini Tool Calling API Error] (${modelName}):`, {
        status: error?.status,
        message: sanitizeLogMessage(error?.message || String(error)),
        errorDetails: error?.errorDetails,
      })

      const promptText = options.prompt || extractConversationTextFromContents(options.contents)
      return {
        text: getSimulatedResponse(promptText, options.systemInstruction),
        functionCalls: [],
      }
    }
  }

  /**
   * Generates text embeddings using Gemini's text-embedding-004
   */
  async embedText(options: EmbedTextOptions): Promise<EmbedTextResponse> {
    const modelName = options.model || "text-embedding-004"
    const timeoutMs = options.timeoutMs ?? DEFAULT_GEMINI_TIMEOUT_MS

    if (!this.genAI) {
      const dummyEmbedding = Array.from({ length: 768 }, (_, i) => Math.sin(i + options.text.length))
      return { embedding: dummyEmbedding }
    }

    try {
      const model = this.genAI.getGenerativeModel(
        { model: modelName },
        { timeout: timeoutMs }
      )
      const result = await model.embedContent(options.text)
      const embedding = result.embedding.values

      return { embedding }
    } catch (error: any) {
      console.error(`[Gemini Embedding API Error] (${modelName}):`, sanitizeLogMessage(error?.message || error))
      throw error
    }
  }
}

// ─── GeminiAgent Orchestrator ───────────────────────────────────────────────

export class GeminiAgent {
  private client: Gemini
  private role: string
  private temperature: number

  constructor(config: AgentConfig) {
    this.client = new Gemini()
    this.role = config.role
    this.temperature = config.temperature ?? 0.7
  }

  async run(taskPrompt: string): Promise<string> {
    const systemInstruction = `You are a helpful AI Agent operating under the role of: "${this.role}". Respond appropriately matching your role guidelines.`

    const response = await this.client.generateText({
      prompt: taskPrompt,
      systemInstruction,
      temperature: this.temperature,
    })

    return response.text
  }
}

// ─── Backward Compatibility High-Level Helpers ──────────────────────────────

const defaultClient = new Gemini()

/**
 * High-level response generator used throughout Grovaitech v1
 * Preserves 100% backward compatibility with all existing routes and callers.
 */
export async function generateResponse(prompt: string, modelOverride?: string): Promise<string> {
  const res = await defaultClient.generateText({
    prompt,
    model: modelOverride,
  })
  return res.text
}
