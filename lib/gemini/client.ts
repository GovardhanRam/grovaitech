import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock-key")

// Default official model for Gemini API: Gemini 3.7 Flash
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash"

interface ConversationState {
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

// Helper to extract conversation state from conversation turns
function parseConversationState(fullPrompt: string): { state: ConversationState; latestMessage: string } {
  // 1. Isolate the latest user message by checking all standard customer delimiters
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

  // 2. Extract state by analyzing the conversation turns
  const lowerFull = fullPrompt.toLowerCase()
  const lowerLatest = latestMessage.toLowerCase()

  // Phone & Name extraction
  const phone = extractPhoneFromText(latestMessage) || extractPhoneFromText(fullPrompt)
  const name = extractNameFromText(latestMessage) || extractNameFromText(fullPrompt)

  // BHK: search latest, then full
  let bhk: number | null = null
  const bhkMatch = latestMessage.match(/(\d)\s*(?:bhk|bedroom|bed)/i) || fullPrompt.match(/(\d)\s*(?:bhk|bedroom|bed)/i)
  if (bhkMatch && bhkMatch[1]) {
    bhk = parseInt(bhkMatch[1], 10)
  }

  // Property Type
  let property_type: string | null = null
  if (lowerFull.includes('villa')) property_type = 'villa'
  else if (lowerFull.includes('apartment') || lowerFull.includes('flat')) property_type = 'apartment'
  else if (lowerFull.includes('house') || lowerFull.includes('home')) property_type = 'house'
  else if (lowerFull.includes('plot') || lowerFull.includes('land')) property_type = 'plot'
  else if (lowerFull.includes('commercial') || lowerFull.includes('office')) property_type = 'commercial'

  // Location
  let location: string | null = null
  const locPatterns = [
    /(?:in|at|near|around)\s+([A-Za-z\s]{3,20})(?:\.|\n|,|$|with|my|budget|for|this)/i,
    /location[:\s]+([A-Za-z\s]{3,20})/i,
  ]
  for (const pat of locPatterns) {
    const m = latestMessage.match(pat) || fullPrompt.match(pat)
    if (m && m[1]) {
      const loc = m[1].trim()
      const invalid = ['a', 'the', 'this', 'that', 'villa', 'apartment', 'visit', 'site', 'house', 'plot', 'weekend', 'saturday', 'sunday']
      if (!invalid.includes(loc.toLowerCase())) {
        location = loc
        break
      }
    }
  }
  if (!location && lowerFull.includes('tirupati')) location = 'Tirupati'
  if (!location && lowerFull.includes('bangalore')) location = 'Bangalore'
  if (!location && lowerFull.includes('hyderabad')) location = 'Hyderabad'
  if (!location && lowerFull.includes('chennai')) location = 'Chennai'

  // Budget: prioritize latest message budget if user explicitly updated it!
  let budget: string | null = null
  const budgetPatterns = [
    /(?:budget is|budget of|around|budget)\s*(?:around|is|of)?\s*([0-9.]+\s*(?:cr|crore|crores|lakh|lakhs|k|million|L|Cr))/i,
    /([0-9.]+\s*(?:cr|crore|crores|lakh|lakhs|L|Cr))/i,
  ]
  for (const pat of budgetPatterns) {
    const mLatest = latestMessage.match(pat)
    if (mLatest && mLatest[1]) {
      budget = mLatest[1].trim()
      break
    }
  }
  if (!budget) {
    for (const pat of budgetPatterns) {
      const mFull = fullPrompt.match(pat)
      if (mFull && mFull[1]) {
        budget = mFull[1].trim()
        break
      }
    }
  }

  // Timeline / Site Visit Date
  let site_visit_date: string | null = null
  let wants_site_visit = lowerFull.includes('visit') || lowerFull.includes('tour') || lowerFull.includes('schedule') || lowerFull.includes('inspect')
  if (lowerLatest.includes('saturday') || lowerFull.includes('saturday')) site_visit_date = 'Saturday'
  else if (lowerLatest.includes('sunday') || lowerFull.includes('sunday')) site_visit_date = 'Sunday'
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

// Local intelligent fallback simulation that dynamically constructs natural responses
const getSimulatedResponse = (prompt: string): string => {
  const lowercasePrompt = prompt.toLowerCase()
  const isClinic = lowercasePrompt.includes("medical clinic") || lowercasePrompt.includes("clinic receptionist") || lowercasePrompt.includes("clinic")
  const isRealEstate = lowercasePrompt.includes("real estate") || lowercasePrompt.includes("property") || lowercasePrompt.includes("receptionist")

  const { state, latestMessage } = parseConversationState(prompt)
  const query = latestMessage.toLowerCase()

  // ─── Real Estate Receptionist Simulation ──────────────────────────────────
  if (isRealEstate) {
    const propLabel = `${state.bhk ? `${state.bhk} BHK ` : ''}${state.property_type ? `${state.property_type}` : 'property'}`
    const locLabel = state.location ? ` in ${state.location}` : ''

    // 1. User provided contact info / final confirmation
    if (state.phone || (state.name && query.includes('number'))) {
      const greeting = state.name ? `Thank you, ${state.name}!` : 'Thank you!'
      const dateText = state.site_visit_date ? ` for this ${state.site_visit_date}` : ''
      const budgetText = state.budget ? ` (Budget: ₹${state.budget})` : ''
      const phoneText = state.phone ? ` on ${state.phone}` : ''

      return `${greeting} I have reserved your site visit${dateText} for a ${propLabel}${locLabel}${budgetText}. Our real estate specialist will contact you${phoneText} to confirm the appointment and share the exact property location. Is there anything specific you would like us to prepare for your visit?`
    }

    // 2. User requested site visit date (e.g. "I want to visit this Saturday")
    if (state.site_visit_date || query.includes('visit') || query.includes('tour') || query.includes('saturday') || query.includes('sunday')) {
      const dateTarget = state.site_visit_date || 'this weekend'
      const budgetNote = state.budget ? ` for our ₹${state.budget} options` : ''
      return `I would be delighted to schedule a site visit for you this ${dateTarget}${budgetNote}${locLabel}! Could you please share your full name and contact phone number so our team can confirm the site visit details?`
    }

    // 3. User updated/provided their budget (e.g. "My budget is around 5 crore")
    if (query.includes('budget') || query.includes('cr') || query.includes('crore') || query.includes('lakh')) {
      const budgetVal = state.budget ? `₹${state.budget}` : 'your specified budget'
      return `Understood! We have premium ${propLabel}${locLabel} within ${budgetVal}. Would you like to schedule a site visit this weekend to view the available units, or are you looking for specific amenities like a clubhouse or private garden?`
    }

    // 4. User specified property type / location initial inquiry (e.g. "I want a 3 BHK villa in Tirupati")
    if (state.property_type || state.location || state.bhk) {
      if (!state.budget) {
        return `Hello! Welcome to Grovaitech Real Estate. I can certainly assist you with finding ${propLabel}${locLabel}. What is your preferred budget range, and when are you planning to make a purchase?`
      }
      return `Hello! We have excellent options for ${propLabel}${locLabel} within ₹${state.budget}. Would you like to schedule a site visit to view the available properties?`
    }

    // 5. General greetings or questions
    if (query.includes('hello') || query.includes('hi ') || query.includes('hey')) {
      return "Hello! Welcome to Grovaitech Real Estate. I am your AI Lead Receptionist. What type of property and location are you looking for today?"
    }

    if (query.includes('price') || query.includes('cost')) {
      return "We have properties ranging from 2 BHK apartments to luxury 3 and 4 BHK villas. Which location and property type are you interested in so I can provide accurate pricing?"
    }

    return "Thank you for your enquiry. I would be happy to help you with your property search. Could you please share your preferred location, property type, and budget?"
  }

  // ─── Clinic Receptionist Simulation ───────────────────────────────────────
  if (isClinic) {
    if (query.includes("book") || query.includes("appointment") || query.includes("schedule")) {
      return "Hello! I can certainly help you book an appointment at the clinic. Could you please tell me your full name, phone number, and preferred date/time?";
    }
    if (query.includes("timing") || query.includes("hour") || query.includes("time") || query.includes("open")) {
      return "Our clinic is open from 9 AM to 6 PM, Monday to Saturday. We are closed on Sundays. Let me know if you would like to book a slot!";
    }
    if (query.includes("doctor") || query.includes("specialist") || query.includes("dentist")) {
      return "We have Dr. Verma (General Dentistry) and Dr. Reddy (Orthodontics) available at the clinic. Would you like to schedule a consultation with one of them?";
    }
    if (query.includes("hello") || query.includes("hi ") || query.includes("hey")) {
      return "Hello! Welcome to the Clinic. I am your front-desk AI Receptionist. How can I help you today?";
    }
    return "Thank you for the details. I've noted down your request. Our medical front-desk team will confirm your slot shortly. Is there anything else I can assist with?";
  }

  // ─── General Fallback ─────────────────────────────────────────────────────
  return `Hello! I am **GrovAI**, your business automation partner from Grovaitech. 

I help businesses deploy **AI Employees** to handle voice calls, WhatsApp leads, support queries, and document searches.

What aspect of your business would you like to automate today?
- Deploying an AI Receptionist
- Qualifying leads from WhatsApp
- Creating a Document Knowledge Base`;
}

export const generateResponse = async (prompt: string, modelOverride?: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("placeholder")) {
    console.log("No valid Gemini API key found, using dynamic simulated response.");
    return getSimulatedResponse(prompt);
  }

  try {
    const selectedModel = modelOverride || DEFAULT_GEMINI_MODEL
    console.log(`Calling Gemini API with model: ${selectedModel}...`)
    const model = genAI.getGenerativeModel({ model: selectedModel })
    
    // Set 4.5s timeout on API call to guarantee responsive UX and graceful fallback
    const apiPromise = (async () => {
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text()
    })()

    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API call timed out after 4500ms')), 4500)
    })

    return await Promise.race([apiPromise, timeoutPromise])
  } catch (error) {
    console.error("Gemini API Error, falling back to dynamic simulated response:", error)
    return getSimulatedResponse(prompt)
  }
}
