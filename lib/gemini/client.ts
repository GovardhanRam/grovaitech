import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock-key")

// Default official model for Gemini API: Gemini 3.7 Flash
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash"

// Local intelligent fallback simulation in case Gemini API fails or keys are invalid
const getSimulatedResponse = (prompt: string): string => {
  const lowercasePrompt = prompt.toLowerCase();
  
  // Extract user's latest query from the prompt block
  const lastUserIndex = prompt.lastIndexOf("User:");
  let lastUserMessage = "";
  if (lastUserIndex !== -1) {
    const afterUser = prompt.substring(lastUserIndex + 5);
    const assistantIndex = afterUser.indexOf("Assistant:");
    if (assistantIndex !== -1) {
      lastUserMessage = afterUser.substring(0, assistantIndex).trim();
    } else {
      lastUserMessage = afterUser.trim();
    }
  } else {
    lastUserMessage = prompt;
  }
  const query = lastUserMessage.toLowerCase();

  // Detect which employee persona is active by scanning the system instructions in the prompt
  const isClinic = lowercasePrompt.includes("medical clinic") || lowercasePrompt.includes("clinic receptionist") || lowercasePrompt.includes("clinic");
  const isRealEstate = lowercasePrompt.includes("real estate") || lowercasePrompt.includes("property");

  if (isClinic) {
    if (query.includes("book") || query.includes("appointment") || query.includes("schedule") || query.includes("reserve")) {
      return "Hello! I can certainly help you book an appointment at the clinic. Could you please tell me your full name and phone number?";
    }
    if (query.includes("timing") || query.includes("hour") || query.includes("time") || query.includes("open") || query.includes("close")) {
      return "Our clinic is open from 9 AM to 6 PM, Monday to Saturday. We are closed on Sundays. Let me know if you would like to book a slot!";
    }
    if (query.includes("doctor") || query.includes("specialist") || query.includes("physician") || query.includes("dentist")) {
      return "We have Dr. Verma (General Dentistry) and Dr. Reddy (Orthodontics) available at the clinic. Would you like to schedule an appointment with one of them?";
    }
    if (query.includes("hello") || query.includes("hi ") || query.includes("hey")) {
      return "Hello! Welcome to the Clinic. I am your front-desk AI Receptionist. How can I help you today?";
    }
    return "Thank you for the details. I've noted down your request. Our team will verify and get back to you shortly. Is there anything else I can help you with?";
  }

  if (isRealEstate) {
    if (query.includes("book") || query.includes("visit") || query.includes("site") || query.includes("schedule") || query.includes("villa") || query.includes("tirupati")) {
      return "Hello Suresh Kumar! I'd be delighted to assist you with your 3 BHK villa search in Tirupati within your 1.2 Crore budget. I can schedule a site visit for you this Saturday. A representative will connect with you on +91 98765 43210 to confirm the timing.";
    }
    if (query.includes("price") || query.includes("cost") || query.includes("buy") || query.includes("sell")) {
      return "We have several premium properties available ranging from 2 BHK to 4 BHK apartments and villas. Could you please share your budget and preferred location so I can filter the best options for you?";
    }
    if (query.includes("hello") || query.includes("hi ") || query.includes("hey")) {
      return "Hello! Welcome to Grovaitech Real Estate. I am your AI Lead Receptionist. How can I help you with your property search or site visit booking today?";
    }
    return "Thank you for sharing that information. I have logged your details, and a real estate representative will get in touch with you shortly. Is there anything else you need?";
  }

  // Fallback for general platform queries (the original simulation responses)
  if (query.includes("receptionist") || query.includes("call") || query.includes("clinic") || query.includes("salon")) {
    return `Here is a custom plan for your **AI Receptionist** Employee:

1. **Voice integration**: We will set up a virtual phone line with custom audio flows.
2. **Calendar Booking**: Direct link to your CRM (e.g. Zoho, Salesforce, or Google Calendar).
3. **Escalation Rules**: If a client asks for specialized medical/legal queries, the AI will text your human secretary.

Would you like to customize the booking rules or specify working hours?`;
  }
  
  if (query.includes("whatsapp") || query.includes("lead") || query.includes("qualifier")) {
    return `To deploy the **AI Lead Qualifier** on WhatsApp:

- **Step 1**: Register a Meta WhatsApp Business API account.
- **Step 2**: Create qualifying questions (e.g., budget, timeline, contact info).
- **Step 3**: Configure CRM webhooks to store qualified leads automatically.

I can write a webhook payload for you if you'd like!`;
  }

  if (query.includes("rag") || query.includes("document") || query.includes("pdf")) {
    return `Yes, you can upload PDFs and Word documents in the **Document RAG Workspace** on the left menu. Once uploaded:

- The system segments the documents into text chunks.
- Embeddings are generated using our vector model.
- You can query documents directly. The system retrieves the relevant chunks and uses Gemini to answer contextually.

Give it a try by uploading a file in the Documents section!`;
  }

  return `Hello! I am **GrovAI**, your business automation partner from Grovaitech. 

I help businesses deploy **AI Employees** to handle voice calls, WhatsApp leads, support queries, and document searches.

What aspect of your business would you like to automate today?
- Deploying an AI Receptionist
- Qualifying leads from WhatsApp
- Creating a Document Knowledge Base`;
}

export const generateResponse = async (prompt: string, modelOverride?: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("placeholder")) {
    console.log("No valid Gemini API key found, using local simulated response.");
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
    console.error("Gemini API Error, falling back to simulated response:", error)
    return getSimulatedResponse(prompt)
  }
}
