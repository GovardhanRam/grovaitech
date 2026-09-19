/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/builder/factory.ts
 *
 * Resolves the correct Builder adapter from config.
 * Auto-detects and falls back gracefully when the configured adapter is unavailable.
 */

import type { BuilderAdapter } from './types'
import { GeminiCliBuilderAdapter } from './gemini-cli'
import { ClaudeCodeBuilderAdapter } from './claude-code'
import { ManualBuilderAdapter } from './manual'

export type BuilderAdapterName = 'gemini-cli' | 'claude-code' | 'manual'

export async function createBuilderAdapter(
  adapterName: string,
  log: (msg: string) => void,
): Promise<BuilderAdapter> {
  const name = adapterName.toLowerCase().trim()

  // Always available regardless of config
  const manual = new ManualBuilderAdapter()

  if (name === 'manual') {
    log('[Builder] Manual adapter selected via config')
    return manual
  }

  if (name === 'gemini-cli' || name === 'gemini') {
    const adapter = new GeminiCliBuilderAdapter()
    const availability = await adapter.checkAvailability()
    if (availability.available) {
      log('[Builder] Gemini CLI adapter ready')
      return adapter
    }
    log(`[Builder] Gemini CLI unavailable: ${availability.reason}`)
    log('[Builder] Falling back to manual adapter')
    console.log('')
    console.log(' ⚠  BUILDER FALLBACK NOTICE')
    if (availability.reason) {
      console.log(' ' + availability.reason)
    }
    console.log('')
    return manual
  }

  if (name === 'claude-code' || name === 'claude') {
    const adapter = new ClaudeCodeBuilderAdapter()
    const availability = await adapter.checkAvailability()
    if (availability.available) {
      log('[Builder] Claude Code CLI adapter ready')
      return adapter
    }
    log(`[Builder] Claude Code unavailable: ${availability.reason}`)
    log('[Builder] Falling back to manual adapter')
    console.log('')
    console.log(' ⚠  BUILDER FALLBACK NOTICE')
    if (availability.reason) {
      console.log(' ' + availability.reason)
    }
    console.log('')
    return manual
  }

  // Unknown adapter — log and fall back
  log(`[Builder] Unknown adapter "${adapterName}" — falling back to manual`)
  console.log(` ⚠  Unknown ORCHESTRATOR_BUILDER="${adapterName}". Supported: gemini-cli, claude-code, manual`)
  return manual
}
