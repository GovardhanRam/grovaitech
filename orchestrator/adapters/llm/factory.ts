/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/llm/factory.ts
 *
 * Resolves the correct LLM adapter from orchestrator config.
 * Adding a new provider = add a new case here + implement LLMAdapter.
 */

import type { LLMAdapter } from './types'
import { GeminiLLMAdapter } from './gemini'

export type LLMProviderName = 'gemini' | 'openai' | 'anthropic' | 'ollama'

/**
 * Parse a model string like "gemini:gemini-3.6-flash" or "gemini-3.6-flash"
 * Returns { provider, model }.
 */
export function parseModelString(modelStr: string): { provider: LLMProviderName; model: string } {
  const colonIdx = modelStr.indexOf(':')
  if (colonIdx > 0) {
    const provider = modelStr.slice(0, colonIdx) as LLMProviderName
    const model = modelStr.slice(colonIdx + 1)
    return { provider, model }
  }
  // Infer provider from model name prefix
  if (modelStr.startsWith('gemini') || modelStr.startsWith('models/gemini')) {
    return { provider: 'gemini', model: modelStr }
  }
  if (modelStr.startsWith('gpt-') || modelStr.startsWith('o1') || modelStr.startsWith('o3')) {
    return { provider: 'openai', model: modelStr }
  }
  if (modelStr.startsWith('claude-')) {
    return { provider: 'anthropic', model: modelStr }
  }
  // Default to gemini
  return { provider: 'gemini', model: modelStr }
}

export interface LLMFactoryConfig {
  modelString: string
  geminiApiKey?: string
  // Future: openaiApiKey, anthropicApiKey, ollamaBaseUrl, etc.
}

export function createLLMAdapter(config: LLMFactoryConfig): LLMAdapter {
  const { provider, model } = parseModelString(config.modelString)

  switch (provider) {
    case 'gemini': {
      const key = config.geminiApiKey
      if (!key) throw new Error('LLM factory: GEMINI_API_KEY is required for gemini provider')
      return new GeminiLLMAdapter(key, model)
    }
    case 'openai':
      throw new Error(
        'LLM factory: OpenAI provider is not yet implemented. Set ORCHESTRATOR_PLANNER_MODEL to a gemini: model.',
      )
    case 'anthropic':
      throw new Error(
        'LLM factory: Anthropic provider is not yet implemented. Use Claude Code CLI as the Builder instead.',
      )
    case 'ollama':
      throw new Error(
        'LLM factory: Ollama provider is not yet implemented. Set ORCHESTRATOR_PLANNER_MODEL to a gemini: model.',
      )
    default: {
      const _exhaustive: never = provider
      throw new Error(`LLM factory: unknown provider "${_exhaustive}"`)
    }
  }
}
