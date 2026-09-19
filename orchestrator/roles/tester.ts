/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/roles/tester.ts
 *
 * Role 3: Tester
 * Runs project verification scripts via child_process.
 * Cost: $0 — pure local npm scripts.
 *
 * Scripts run:
 *   npm run lint       (eslint)
 *   npx tsc --noEmit  (typecheck — no dedicated script exists in package.json)
 *   npm test           (vitest run)
 *   npm run build      (next build --turbopack)
 *
 * Each script runs independently. Failure of one does not skip the others.
 * Results are written to test-results.json.
 */

import { spawnSync } from 'child_process'
import { writeFileSync } from 'fs'
import type { TaskState } from '../task'
import { logger } from '../logger'

export interface ScriptResult {
  script: string
  command: string
  exitCode: number
  passed: boolean
  stdout: string
  stderr: string
  durationMs: number
}

export interface TestResults {
  taskId: string
  ranAt: string
  allPassed: boolean
  results: ScriptResult[]
  summary: string
}

const SCRIPTS_TO_RUN: { label: string; cmd: string; args: string[] }[] = [
  { label: 'lint',      cmd: 'npm',  args: ['run', 'lint'] },
  { label: 'typecheck', cmd: 'npx',  args: ['tsc', '--noEmit'] },
  { label: 'test',      cmd: 'npm',  args: ['test'] },
  { label: 'build',     cmd: 'npm',  args: ['run', 'build'] },
]

const MAX_OUTPUT_CHARS = 8_000

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text
  return text.slice(0, MAX_OUTPUT_CHARS) + `\n... [truncated, ${text.length - MAX_OUTPUT_CHARS} chars omitted]`
}

function runScript(
  label: string,
  cmd: string,
  args: string[],
  cwd: string,
): ScriptResult {
  logger.info(`Running ${label}...`, { cmd: `${cmd} ${args.join(' ')}` })
  const start = Date.now()

  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
    shell: true, // needed on Windows for npx
    timeout: 5 * 60 * 1000, // 5 minute per-script timeout
  })

  const durationMs = Date.now() - start
  const exitCode = result.status ?? 1
  const passed = exitCode === 0

  const stdout = truncate((result.stdout ?? '').trim())
  const stderr = truncate((result.stderr ?? '').trim())

  if (passed) {
    logger.info(`${label} PASSED`, { durationMs })
  } else {
    logger.warn(`${label} FAILED`, { exitCode, durationMs })
    if (stderr) logger.debug(`${label} stderr`, { stderr: stderr.slice(0, 500) })
  }

  return {
    script: label,
    command: `${cmd} ${args.join(' ')}`,
    exitCode,
    passed,
    stdout,
    stderr,
    durationMs,
  }
}

export async function runTester(state: TaskState, repoRoot: string): Promise<TestResults> {
  logger.step('TESTER', 'Running lint, typecheck, tests, build')

  const results: ScriptResult[] = []
  for (const { label, cmd, args } of SCRIPTS_TO_RUN) {
    results.push(runScript(label, cmd, args, repoRoot))
  }

  const allPassed = results.every((r) => r.passed)
  const passedCount = results.filter((r) => r.passed).length
  const summary = `${passedCount}/${results.length} checks passed${allPassed ? ' ✓' : ' — some checks FAILED'}`

  logger.info('Tester complete', { summary, allPassed })

  const testResults: TestResults = {
    taskId: state.id,
    ranAt: new Date().toISOString(),
    allPassed,
    results,
    summary,
  }

  writeFileSync(state.testResultsFile, JSON.stringify(testResults, null, 2), 'utf-8')

  return testResults
}

export function formatTestResultsForReview(results: TestResults): string {
  const lines: string[] = [`## Test Results — ${results.summary}`, '']
  for (const r of results.results) {
    const icon = r.passed ? '✓' : '✗'
    lines.push(`### ${icon} ${r.script} (exit ${r.exitCode}, ${r.durationMs}ms)`)
    if (!r.passed) {
      if (r.stderr) lines.push('```', r.stderr.slice(0, 2000), '```')
      else if (r.stdout) lines.push('```', r.stdout.slice(0, 2000), '```')
    }
    lines.push('')
  }
  return lines.join('\n')
}
