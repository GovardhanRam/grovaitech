/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/builder/types.ts
 *
 * Provider-agnostic Builder adapter interface.
 * The Builder is the agent that actually WRITES CODE.
 * It owns the working tree exclusively during its execution window.
 *
 * Current adapters:
 *   - ClaudeCodeBuilderAdapter  (claude CLI, needs auth)
 *   - ManualBuilderAdapter      (prints instructions, waits for human)
 *
 * Future adapters:
 *   - QwenCodeBuilderAdapter
 *   - AiderBuilderAdapter
 *   - AnyOpenAICompatibleBuilderAdapter
 */

export interface BuilderInput {
  /** The original task description */
  taskDescription: string
  /** Full content of plan.md */
  planContent: string
  /** Absolute path to the repository root */
  repoRoot: string
  /** Absolute path to the task directory (for logging) */
  taskDir: string
  /** System prompt to prepend (from agents/FIXER.md or agents/PLANNER context) */
  systemPrompt?: string
}

export interface BuilderResult {
  /** Whether the builder reported success */
  success: boolean
  /** Raw stdout captured from the builder process */
  stdout: string
  /** Raw stderr captured from the builder process */
  stderr: string
  /** Exit code (0 = success, null = not applicable for manual) */
  exitCode: number | null
  /** Friendly summary for logs */
  summary: string
}

/**
 * Provider-agnostic Builder adapter.
 * Implement this for every coding agent provider.
 */
export interface BuilderAdapter {
  /** Human-readable name for logging */
  readonly name: string
  /** Adapter identifier used in config */
  readonly adapterId: string
  /**
   * Check whether this adapter can actually run in the current environment.
   * Returns { available: true } or { available: false, reason: string }.
   */
  checkAvailability(): Promise<{ available: boolean; reason?: string }>
  /**
   * Execute the builder with the given input.
   * The builder OWNS the working tree during this call.
   * Returns when the builder has finished making changes.
   */
  execute(input: BuilderInput): Promise<BuilderResult>
}
