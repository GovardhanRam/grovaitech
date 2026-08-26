/**
 * Grovaitech AI Platform
 * lib/ai/gemini.ts
 *
 * This file handles direct API connections to Google's Gemini models.
 * Fully typed, production-ready, and configured to load secrets from environment variables.
 */

export interface GenerateTextOptions {
  model?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateTextResponse {
  text: string;
  usage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

export interface EmbedTextOptions {
  model?: string;
  text: string;
}

export interface EmbedTextResponse {
  embedding: number[];
}

export interface AgentConfig {
  role: string;
  temperature?: number;
}

/**
 * Gemini Core Client
 * Offers simple interfaces for text generation and text embedding using Gemini.
 */
export class Gemini {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor() {
    // Load key from process.env, which is populated via .env.local
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn(
        "Warning: GEMINI_API_KEY is not defined in your environment variables. " +
        "Ensure it is set in .env.local for production connections."
      );
    }
    this.apiKey = key || "";
  }

  /**
   * Generates text content using a Gemini model.
   * Defaults to gemini-3.7-flash with native medium thinking mode.
   */
  async generateText(options: GenerateTextOptions): Promise<GenerateTextResponse> {
    const model = options.model || process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const temperature = options.temperature ?? 1.0;

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Configure it in .env.local.");
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: options.prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: temperature,
              maxOutputTokens: options.maxOutputTokens,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API returned status ${response.status}: ${
            errData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Invalid response format received from Gemini API.");
      }

      return {
        text: text,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              candidatesTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Gemini generateText error:", error);
      throw error;
    }
  }

  /**
   * Generates text embeddings using Gemini's text-embedding-004 model.
   */
  async embedText(options: EmbedTextOptions): Promise<EmbedTextResponse> {
    const model = options.model || "text-embedding-004";

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Configure it in .env.local.");
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: {
              parts: [
                {
                  text: options.text,
                },
              ],
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API returned status ${response.status}: ${
            errData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      const embedding = data.embedding?.values;
      if (!embedding) {
        throw new Error("Invalid response format received from Gemini Embedding API.");
      }

      return {
        embedding: embedding,
      };
    } catch (error) {
      console.error("Gemini embedText error:", error);
      throw error;
    }
  }
}

/**
 * GeminiAgent Orchestrator
 * Encapsulates role-based styling/instructions to simulate autonomous agents.
 */
export class GeminiAgent {
  private client: Gemini;
  private role: string;
  private temperature: number;

  constructor(config: AgentConfig) {
    this.client = new Gemini();
    this.role = config.role;
    this.temperature = config.temperature ?? 0.7;
  }

  /**
   * Runs the agent task with structured system instructions based on the role.
   */
  async run(taskPrompt: string): Promise<string> {
    const systemPrompt = `You are a helpful AI Agent operating under the role of: "${this.role}".\nRespond appropriately to the following user task, matching your specific role guidelines.\n\nTask:`;
    
    const response = await this.client.generateText({
      prompt: `${systemPrompt}\n${taskPrompt}`,
      temperature: this.temperature,
    });

    return response.text;
  }
}
