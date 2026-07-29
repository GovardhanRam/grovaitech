import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock-key")

// Local intelligent fallback simulation in case Gemini API fails or keys are invalid
const getSimulatedResponse = (prompt: string): string => {
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes("receptionist") || lowercasePrompt.includes("call") || lowercasePrompt.includes("clinic") || lowercasePrompt.includes("salon")) {
    return `Here is a custom plan for your **AI Receptionist** Employee:

1. **Voice integration**: We will set up a virtual phone line with custom audio flows.
2. **Calendar Booking**: Direct link to your CRM (e.g. Zoho, Salesforce, or Google Calendar).
3. **Escalation Rules**: If a client asks for specialized medical/legal queries, the AI will text your human secretary.

Would you like to customize the booking rules or specify working hours?`;
  }
  
  if (lowercasePrompt.includes("whatsapp") || lowercasePrompt.includes("lead") || lowercasePrompt.includes("qualifier")) {
    return `To deploy the **AI Lead Qualifier** on WhatsApp:

- **Step 1**: Register a Meta WhatsApp Business API account.
- **Step 2**: Create qualifying questions (e.g., budget, timeline, contact info).
- **Step 3**: Configure CRM webhooks to store qualified leads automatically.

I can write a webhook payload for you if you'd like!`;
  }

  if (lowercasePrompt.includes("rag") || lowercasePrompt.includes("document") || lowercasePrompt.includes("pdf")) {
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

export const generateResponse = async (prompt: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("placeholder")) {
    console.log("No valid Gemini API key found, using local simulated response.");
    return getSimulatedResponse(prompt);
  }

  try {
    console.log("Calling Gemini API...")
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error("Gemini API Error, falling back to simulated response:", error)
    return getSimulatedResponse(prompt)
  }
}

