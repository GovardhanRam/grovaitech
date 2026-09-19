/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/config.ts
 *
 * Loads and validates orchestrator-specific environment variables.
 * Deliberately isolated from the Next.js application config so the
 * orchestrator can run as a standalone Node.js CLI.
 *
 * All variables are prefixed ORCHESTRATOR_* to avoid conflicts with
 * the existing application AI configuration (GEMINI_MODEL, MODEL_PROVIDER, etc.)
 *
 * Add to .env.local:
 *   ORCHESTRATOR_PLANNER_MODEL=gemini-3.6-flash
 *   ORCHESTRATOR_REVIEWER_MODEL=gemini-3.6-flash
 *   ORCHESTRATOR_BUILDER=gemini-cli
 *   ORCHESTRATOR_MAX_FIX_ITERATIONS=2
 */

import { readFileSync } from 'fs'
import { join } from 'path'

export interface OrchestratorConfig {
  /** Model string for the Planner role. Format: "gemini-3.6-flash" or "gemini:gemini-3.6-flash" */
  plannerModel: string
  /** Model string for the Reviewer role */
  reviewerModel: string
  /** Builder adapter identifier: "gemini-cli" | "claude-code" | "manual" */
  builder: string
  /** Maximum automatic fix iterations before escalating to human */
  maxFixIterations: number
  /** Gemini API key (from GEMINI_API_KEY — shared with the app) */
  geminiApiKey: string
  /** Absolute path to the repository root */
  repoRoot: string
}

/**
 * Load .env.local manually (orchestrator runs outside Next.js, which normally does this).
 * Only reads ORCHESTRATOR_* keys and GEMINI_API_KEY.
 */
function loadEnvLocal(repoRoot: string): void {
  const envPath = join(repoRoot, '.env.local')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      // Only set if not already in environment (real env takes priority)
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  } catch {
    // .env.local is optional — orchestrator can run with real environment variables
  }
}

export function loadConfig(repoRoot: string): OrchestratorConfig {
  loadEnvLocal(repoRoot)

  const plannerModel = process.env.ORCHESTRATOR_PLANNER_MODEL ?? 'gemini-3.6-flash'
  const reviewerModel = process.env.ORCHESTRATOR_REVIEWER_MODEL ?? 'gemini-3.6-flash'
  const builder = process.env.ORCHESTRATOR_BUILDER ?? 'gemini-cli'
  const maxFixIterations = parseInt(process.env.ORCHESTRATOR_MAX_FIX_ITERATIONS ?? '2', 10)
  const geminiApiKey = process.env.GEMINI_API_KEY ?? ''

  if (!geminiApiKey) {
    throw new Error(
      'GEMINI_API_KEY is required. Add it to .env.local or set it as an environment variable.',
    )
  }

  return {
    plannerModel,
    reviewerModel,
    builder,
    maxFixIterations: isNaN(maxFixIterations) ? 2 : Math.max(0, Math.min(5, maxFixIterations)),
    geminiApiKey,
    repoRoot,
  }
}
