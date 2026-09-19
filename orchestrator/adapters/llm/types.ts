/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/llm/types.ts
 *
 * Provider-agnostic LLM adapter interface.
 * All LLM providers (Gemini, OpenAI-compatible, Anthropic, Ollama) must
 * implement this interface. Switching providers = changing the factory only.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCallOptions {
  /** System prompt / instructions */
  system?: string
  /** Conversation turns (user + assistant) */
  messages: LLMMessage[]
  /** Model identifier — provider-specific string */
  model?: string
  /** 0.0–1.0 */
  temperature?: number
  /** Max tokens to generate */
  maxTokens?: number
}

export interface LLMCallResult {
  text: string
  modelUsed: string
  /** Approximate token counts if the provider exposes them */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Provider-agnostic LLM adapter.
 * Implement this for every model provider.
 */
export interface LLMAdapter {
  /** Human-readable name for logging */
  readonly name: string
  /** Provider identifier used in config */
  readonly provider: string
  /** Perform a single completion call */
  complete(options: LLMCallOptions): Promise<LLMCallResult>
}
