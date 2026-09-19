/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/llm/gemini.ts
 *
 * Gemini LLM adapter for the orchestrator.
 * Wraps the @google/generative-ai SDK directly (does NOT import lib/ai/gemini.ts
 * to keep the orchestrator self-contained and runnable outside Next.js context).
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMAdapter, LLMCallOptions, LLMCallResult } from './types'

export class GeminiLLMAdapter implements LLMAdapter {
  readonly name = 'Gemini'
  readonly provider = 'gemini'

  private readonly apiKey: string
  private readonly defaultModel: string

  constructor(apiKey: string, defaultModel: string) {
    if (!apiKey) throw new Error('GeminiLLMAdapter: GEMINI_API_KEY is required')
    this.apiKey = apiKey
    this.defaultModel = defaultModel
  }

  async complete(options: LLMCallOptions): Promise<LLMCallResult> {
    const model = options.model ?? this.defaultModel
    const genai = new GoogleGenerativeAI(this.apiKey)

    const systemInstruction = options.system ?? undefined

    const genModel = genai.getGenerativeModel({
      model,
      systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 8192,
      },
    })

    // Build contents from messages (skip system — handled via systemInstruction)
    const contents = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }))

    const result = await genModel.generateContent({ contents })
    const response = result.response
    const text = response.text()

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined

    return { text, modelUsed: model, usage }
  }
}
