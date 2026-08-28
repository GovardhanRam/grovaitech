/**
 * Grovaitech AI Platform
 * lib/gemini/client.ts
 *
 * Backward-compatibility wrapper for legacy callers.
 * Delegates canonical inference and simulated fallbacks to lib/ai/gemini.ts.
 */

export {
  DEFAULT_GEMINI_MODEL,
  generateResponse,
  Gemini,
  GeminiAgent,
  getSimulatedResponse,
} from '@/lib/ai/gemini'
