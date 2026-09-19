/**
 * Grovaitech AI Platform
 * lib/leads/extractor.ts
 *
 * Structured Real Estate Lead Extractor.
 * Extracts validated parameters using Gemini 3.7 Flash with deterministic fallback.
 */

import { generateResponse } from '@/lib/gemini/client'

export interface ExtractedRealEstateLead {
  name: string | null
  phone: string | null
  email: string | null
  property_type: 'villa' | 'apartment' | 'house' | 'plot' | 'commercial' | 'other' | null
  bhk: number | null
  location: string | null
  budget: string | null
  timeline: string | null
  intent: string | null
  qualification_score: number // 0 - 100
  qualification_status: 'qualified' | 'in_progress' | 'unqualified'
  site_visit_requested: boolean
  site_visit_date: string | null
  site_visit_time: string | null
}

function extractNameFromText(text: string): string | null {
  const introMatch = text.match(/(?:my name is|i am|this is|call me)\s+(?:dr\.?\s+|doctor\s+)?([A-Za-z]+)/i)
  if (introMatch && introMatch[1]) {
    const n = introMatch[1].trim()
    const black = ['looking', 'interested', 'a', 'the', 'here', 'customer', 'user', 'buyer', 'my', 'and', 'number', 'phone', 'ready', 'booking', 'visiting', 'planning', 'dr', 'doctor']
    if (n.length > 1 && !black.includes(n.toLowerCase())) {
      return n.charAt(0).toUpperCase() + n.slice(1)
    }
  }
  const explicitMatch = text.match(/\bname\s*[:=]\s*(?:dr\.?\s+|doctor\s+)?([A-Za-z]+)/i)
  if (explicitMatch && explicitMatch[1]) {
    const n = explicitMatch[1].trim()
    const black = ['is', 'looking', 'interested', 'a', 'the', 'here', 'customer', 'user', 'buyer', 'dr', 'doctor']
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

export async function extractRealEstateLead(
  chatHistory: { role: string; content: string }[]
): Promise<ExtractedRealEstateLead> {
  const conversationText = chatHistory
    .map((m) => `${m.role === 'user' ? 'Customer' : 'AI Receptionist'}: ${m.content}`)
    .join('\n')
  
  const userMessages = chatHistory.filter((m) => m.role === 'user').map((m) => m.content)
  const fullUserText = userMessages.join('\n')

  let extracted: Partial<ExtractedRealEstateLead> | null = null

  // 1. Try Gemini 3.7 Flash structured extraction if API key is present
  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey && !apiKey.includes('placeholder') && apiKey.trim().length > 5) {
    try {
      const prompt = `You are a real estate qualification data extractor for Grovaitech.
Analyze the following conversation between a Customer and an AI Real Estate Lead Receptionist.

Extract the lead information in JSON format according to this exact schema. If any field was not provided by the customer, set its value to null.

{
  "name": string or null,
  "phone": string or null,
  "email": string or null,
  "property_type": "villa" | "apartment" | "house" | "plot" | "commercial" | "other" or null,
  "bhk": number or null,
  "location": string or null,
  "budget": string or null,
  "timeline": string or null,
  "intent": string or null,
  "site_visit_requested": boolean,
  "site_visit_date": string or null,
  "site_visit_time": string or null
}

Conversation:
${conversationText}

Output valid JSON only:`

      const rawResponse = await generateResponse(prompt)
      const startIdx = rawResponse.indexOf('{')
      const endIdx = rawResponse.lastIndexOf('}')

      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = rawResponse.substring(startIdx, endIdx + 1)
        extracted = JSON.parse(jsonStr)
      }
    } catch (err) {
      console.warn('Gemini 3.7 Flash extraction error, using deterministic fallback:', err)
    }
  }

  // 2. Deterministic Fallback Parser
  const fallback = parseDeterministicFallback(fullUserText)

  const name: string | null = (extracted?.name ?? fallback.name) ?? null
  const phone: string | null = (extracted?.phone ?? fallback.phone) ?? null
  const email: string | null = (extracted?.email ?? fallback.email) ?? null
  const property_type: ExtractedRealEstateLead['property_type'] = (extracted?.property_type ?? fallback.property_type) ?? null
  const bhk: number | null = extracted?.bhk !== undefined && extracted?.bhk !== null ? Number(extracted.bhk) : (fallback.bhk ?? null)
  const location: string | null = (extracted?.location ?? fallback.location) ?? null
  const budget: string | null = (extracted?.budget ?? fallback.budget) ?? null
  const timeline: string | null = (extracted?.timeline ?? fallback.timeline) ?? null
  const site_visit_requested: boolean = Boolean(
    extracted?.site_visit_requested !== undefined && extracted?.site_visit_requested !== null
      ? extracted.site_visit_requested
      : fallback.site_visit_requested
  )
  const site_visit_date: string | null = (extracted?.site_visit_date ?? fallback.site_visit_date) ?? null
  const site_visit_time: string | null = (extracted?.site_visit_time ?? fallback.site_visit_time) ?? null

  // 3. Compute Qualification Score & Status
  let score = 0
  if (property_type) score += 20
  if (location) score += 20
  if (budget) score += 20
  if (phone) score += 25
  if (name) score += 10
  if (site_visit_requested) score += 5

  let qualification_status: 'qualified' | 'in_progress' | 'unqualified' = 'in_progress'
  if (score >= 60 && (phone || (location && budget && property_type))) {
    qualification_status = 'qualified'
  } else if (score < 30) {
    qualification_status = 'in_progress'
  }

  return {
    name,
    phone,
    email,
    property_type,
    bhk,
    location,
    budget,
    timeline,
    intent: site_visit_requested ? 'Site Visit Booking' : 'Property Inquiry',
    qualification_score: score,
    qualification_status,
    site_visit_requested,
    site_visit_date,
    site_visit_time,
  }
}

function parseDeterministicFallback(text: string): Partial<ExtractedRealEstateLead> {
  const lower = text.toLowerCase()

  // Phone Extraction
  const phone = extractPhoneFromText(text)

  // Email Extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const emailMatch = text.match(emailRegex)
  const email = emailMatch ? emailMatch[0].trim() : null

  // Name Extraction
  const name = extractNameFromText(text)

  // BHK Extraction
  let bhk: number | null = null
  const bhkMatch = text.match(/(\d)\s*(?:bhk|bedroom|bed)/i)
  if (bhkMatch && bhkMatch[1]) {
    bhk = parseInt(bhkMatch[1], 10)
  }

  // Property Type
  let property_type: ExtractedRealEstateLead['property_type'] = null
  if (lower.includes('villa')) property_type = 'villa'
  else if (lower.includes('apartment') || lower.includes('flat')) property_type = 'apartment'
  else if (lower.includes('house') || lower.includes('home')) property_type = 'house'
  else if (lower.includes('plot') || lower.includes('land')) property_type = 'plot'
  else if (lower.includes('commercial') || lower.includes('office') || lower.includes('shop')) property_type = 'commercial'

  // Location Extraction
  let location: string | null = null
  const locationPatterns = [
    /(?:in|at|around|near)\s+([A-Za-z\s]{3,25})(?:\.|\n|,|$|with|my|budget|for)/i,
    /location[:\s]+([A-Za-z\s]{3,25})/i,
  ]
  for (const pat of locationPatterns) {
    const m = text.match(pat)
    if (m && m[1]) {
      const loc = m[1].trim()
      const invalid = ['a', 'the', 'this', 'that', 'villa', 'apartment', 'visit', 'site', 'house', 'plot', 'weekend']
      if (!invalid.includes(loc.toLowerCase())) {
        location = loc
        break
      }
    }
  }
  if (!location && lower.includes('tirupati')) location = 'Tirupati'
  if (!location && lower.includes('bangalore')) location = 'Bangalore'
  if (!location && lower.includes('hyderabad')) location = 'Hyderabad'
  if (!location && lower.includes('chennai')) location = 'Chennai'

  // Budget Extraction
  let budget: string | null = null
  const budgetPatterns = [
    /(?:budget is|budget of|around|budget)\s*(?:around|is|of)?\s*([0-9.]+\s*(?:cr|crore|crores|lakh|lakhs|k|million|L|Cr))/i,
    /([0-9.]+\s*(?:cr|crore|crores|lakh|lakhs|L|Cr))/i,
  ]
  for (const pat of budgetPatterns) {
    const m = text.match(pat)
    if (m && m[1]) {
      budget = m[1].trim()
      break
    }
  }

  // Timeline
  let timeline: string | null = null
  if (lower.includes('immediate') || lower.includes('asap') || lower.includes('now')) timeline = 'Immediate'
  else if (lower.includes('1 month') || lower.includes('next month') || lower.includes('this month')) timeline = '1 Month'
  else if (lower.includes('3 month') || lower.includes('few month')) timeline = '3 Months'
  else if (lower.includes('weekend') || lower.includes('saturday') || lower.includes('sunday')) timeline = 'This Weekend'

  // Site Visit
  const site_visit_requested =
    lower.includes('visit') || lower.includes('tour') || lower.includes('schedule') || lower.includes('inspect')
  
  let site_visit_date: string | null = null
  if (lower.includes('saturday')) site_visit_date = 'Saturday'
  else if (lower.includes('sunday')) site_visit_date = 'Sunday'
  else if (lower.includes('this weekend')) site_visit_date = 'This Weekend'

  return {
    name,
    phone,
    email,
    property_type,
    bhk,
    location,
    budget,
    timeline,
    site_visit_requested,
    site_visit_date,
    site_visit_time: null,
  }
}

export interface ExtractedGbpLead {
  contact_name: string | null
  business_name: string | null
  phone: string | null
  email: string | null
  location: string | null
  business_category: string | null
  is_lead_ready: boolean
}

export interface GbpAuditContext {
  business_name?: string
  category?: string
  address_nap?: string
}

function extractProspectPhone(text: string): string | null {
  // 1. Explicit self/contact phrasing (high confidence)
  const explicitPatterns = [
    /(?:my\s+(?:phone|number|mobile|contact|cell)(?:\s+(?:number|no\.?))?\s*(?:is|:|=)?)\s*([+\d\s().-]{7,25})/i,
    /(?:call\s+me\s+(?:at|on)?)\s*([+\d\s().-]{7,25})/i,
    /(?:contact\s+me\s+(?:at|on)?)\s*([+\d\s().-]{7,25})/i,
    /(?:(?:you\s+can\s+)?reach\s+me\s+(?:at|on)?)\s*([+\d\s().-]{7,25})/i,
    /(?:whatsapp\s+(?:me\s+)?(?:at|on)?)\s*([+\d\s().-]{7,25})/i,
    /\b(?:phone|mobile|cell|whatsapp|contact)\s*[:=]\s*([+\d\s().-]{7,25})/i,
  ]

  for (const pat of explicitPatterns) {
    const match = text.match(pat)
    if (match && match[1]) {
      const candidate = extractPhoneFromText(match[1])
      if (candidate) return candidate
    }
  }

  // 2. Reject if the phone is tied to listing/competitor context
  const listingContextPattern = /(?:listing|competitor|google profile|profile|existing|business)\s+(?:phone|number|contact)/i
  if (listingContextPattern.test(text)) {
    return null
  }

  // 3. Fallback: if user supplied a phone number alongside self-introduction ("I am...", "My name is...")
  const introMatch = text.match(/(?:my name is|i am|this is|call me)\s+[A-Za-z]/i)
  if (introMatch) {
    const generalPhone = extractPhoneFromText(text)
    if (generalPhone) return generalPhone
  }

  return null
}

export async function extractGbpLead(
  chatHistory: { role: string; content: string }[],
  auditContext?: GbpAuditContext
): Promise<ExtractedGbpLead> {
  const userMessages = chatHistory.filter((m) => m.role === 'user').map((m) => m.content)
  const fullUserText = userMessages.join('\n')

  // Step 1: Rapid check for explicit contact signal before performing further processing
  const phone = extractProspectPhone(fullUserText)
  if (!phone) {
    // Fast path: No usable contact signal provided by user -> Not lead ready
    return {
      contact_name: null,
      business_name: auditContext?.business_name || null,
      phone: null,
      email: null,
      location: auditContext?.address_nap || null,
      business_category: auditContext?.category || null,
      is_lead_ready: false,
    }
  }

  // Step 2: Extract email if provided
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const emailMatch = fullUserText.match(emailRegex)
  const email: string | null = emailMatch ? emailMatch[0].trim() : null

  // Step 3: Extract contact name (prioritize explicit self-introduction)
  let contact_name: string | null = null
  const docIntro = fullUserText.match(/(?:my name is|i am|this is|call me)\s+(?:dr\.?\s+|doctor\s+)([A-Za-z]+)/i)
  if (docIntro && docIntro[1]) {
    contact_name = `Dr. ${docIntro[1].charAt(0).toUpperCase() + docIntro[1].slice(1)}`
  }
  if (!contact_name) {
    const rawName = extractNameFromText(fullUserText)
    if (rawName && rawName.toLowerCase() !== 'dr' && rawName.toLowerCase() !== 'doctor') {
      contact_name = rawName
    }
  }
  if (!contact_name) {
    const contactLabelMatch = fullUserText.match(/\b(?:contact(?:\s+person)?|owner|manager|founder)\s*(?:is\s+|[:=]\s*)([A-Za-z]+)/i)
    if (contactLabelMatch && contactLabelMatch[1]) {
      contact_name = contactLabelMatch[1].trim()
    }
  }

  // Step 4: Extract business name
  let business_name: string | null = null
  const bizMatch = fullUserText.match(/\b(?:business|clinic|shop|store|company|hotel|restaurant|hospital|firm|agency|salon|listing)(?:\s+name)?(?:\s+is|\s*:)\s*([A-Za-z0-9\s&'-]{2,50}?)(?:\.|\n|,|$|in|near|at|my|phone)/i)
  if (bizMatch && bizMatch[1]) {
    business_name = bizMatch[1].trim()
  }
  if (!business_name) {
    const auditForMatch = fullUserText.match(/\b(?:audit|optimize|check|review|manage|improve)\s+(?:our|my|the)?\s*([A-Za-z0-9\s&'-]{2,50}?)(?:\s+in|\s+at|\s+profile|\s+listing|\.|\n|,|$)/i)
    if (auditForMatch && auditForMatch[1]) {
      let candidate = auditForMatch[1].trim()
      candidate = candidate.replace(/^(?:our|my|the)?\s*(?:clinic|business|shop|store|company|firm|salon|hotel|restaurant)\s+/i, '').trim()
      const black = ['profile', 'listing', 'reviews', 'my', 'the', 'ranking', 'visibility']
      if (!black.includes(candidate.toLowerCase()) && candidate.length > 1) {
        business_name = candidate
      }
    }
  }
  if (!business_name && auditContext?.business_name) {
    business_name = auditContext.business_name
  } else if (business_name && auditContext?.business_name) {
    if (auditContext.business_name.toLowerCase().includes(business_name.toLowerCase()) ||
        business_name.toLowerCase().includes(auditContext.business_name.toLowerCase())) {
      business_name = auditContext.business_name
    }
  }

  // Step 5: Location from explicit user phrasing or existing audit context
  let location: string | null = null
  const locMatch = fullUserText.match(/\b(?:in|at|near|location[:\s]+)\s+([A-Za-z\s]{3,30}?)(?:\.|\n|,|$|my|phone|call|with)/i)
  if (locMatch && locMatch[1]) {
    const candidateLoc = locMatch[1].trim()
    const invalid = ['our', 'my', 'the', 'this', 'that', 'site', 'visit', 'call', 'weekend']
    if (!invalid.includes(candidateLoc.toLowerCase())) {
      location = candidateLoc
    }
  }
  if (!location && auditContext?.address_nap) {
    location = auditContext.address_nap
  }

  // Step 6: Business category from audit context
  const business_category = auditContext?.category || null

  return {
    contact_name,
    business_name,
    phone,
    email,
    location,
    business_category,
    is_lead_ready: true,
  }
}
