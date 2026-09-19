/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/roles/fixer.ts
 *
 * Role 5: Fixer
 * Receives the Reviewer's required changes list.
 * Constructs a fix prompt embedding those changes.
 * Delegates back to the Builder adapter for execution.
 */

import type { BuilderAdapter } from '../adapters/builder/types'
import type { TaskState } from '../task'
import { runBuilder } from './builder-runner'
import { logger } from '../logger'

export async function runFixer(
  builder: BuilderAdapter,
  state: TaskState,
  taskDescription: string,
  originalPlanContent: string,
  requiredChanges: string,
  iterationNumber: number,
  repoRoot: string,
): Promise<{ success: boolean; summary: string }> {
  logger.step('FIXER', `Fix iteration ${iterationNumber}: applying required changes`)

  // Embed required changes into the plan content so the Builder sees them clearly
  const fixPlan = [
    originalPlanContent,
    '',
    '---',
    '',
    `## Fixer Instructions — Iteration ${iterationNumber}`,
    '',
    'The Reviewer has identified the following REQUIRED CHANGES.',
    'Apply ONLY these specific changes. Do not change anything else.',
    '',
    requiredChanges,
  ].join('\n')

  return runBuilder(builder, state, taskDescription, fixPlan, repoRoot, 'fixer')
}
