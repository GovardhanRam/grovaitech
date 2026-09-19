/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/roles/builder-runner.ts
 *
 * Role 2: Builder orchestration wrapper.
 * Delegates to the configured BuilderAdapter.
 * The Builder OWNS the working tree exclusively during its execution.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { BuilderAdapter } from '../adapters/builder/types'
import type { TaskState } from '../task'
import { logger } from '../logger'

function loadSystemPrompt(repoRoot: string, promptFile: string): string | undefined {
  const promptPath = join(repoRoot, 'agents', promptFile)
  if (existsSync(promptPath)) {
    return readFileSync(promptPath, 'utf-8').trim()
  }
  return undefined
}

export async function runBuilder(
  builder: BuilderAdapter,
  state: TaskState,
  taskDescription: string,
  planContent: string,
  repoRoot: string,
  role: 'builder' | 'fixer' = 'builder',
): Promise<{ success: boolean; summary: string }> {
  const promptFile = role === 'fixer' ? 'FIXER.md' : undefined
  const systemPrompt = promptFile ? loadSystemPrompt(repoRoot, promptFile) : undefined

  logger.step(role.toUpperCase(), `${builder.name} executing implementation`)

  const result = await builder.execute({
    taskDescription,
    planContent,
    repoRoot,
    taskDir: state.dir,
    systemPrompt,
  })

  if (result.success) {
    logger.info(`${role} completed`, { summary: result.summary })
  } else {
    logger.warn(`${role} reported failure`, {
      summary: result.summary,
      exitCode: result.exitCode,
    })
    if (result.stderr) {
      logger.debug(`${role} stderr`, { stderr: result.stderr.slice(0, 500) })
    }
  }

  return { success: result.success, summary: result.summary }
}
