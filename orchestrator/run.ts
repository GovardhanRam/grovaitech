#!/usr/bin/env node
/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/run.ts
 *
 * CLI entry point.
 *
 * Usage:
 *   npx tsx orchestrator/run.ts "Add a /api/ping route returning {status:'ok'}"
 *   npx tsx orchestrator/run.ts --task 20260914-012345-ab12
 *
 * Environment variables (add to .env.local):
 *   ORCHESTRATOR_PLANNER_MODEL=gemini-3.6-flash
 *   ORCHESTRATOR_REVIEWER_MODEL=gemini-3.6-flash
 *   ORCHESTRATOR_BUILDER=claude-code
 *   ORCHESTRATOR_MAX_FIX_ITERATIONS=2
 *   GEMINI_API_KEY=...
 *
 * SAFETY GUARANTEES:
 *   - Never pushes to GitHub automatically
 *   - Never commits without explicit human "commit" input at Gate 3
 *   - Only one run at a time (process lock)
 *   - All secrets sanitized from logs
 *   - Only the Builder may edit the working tree
 */

import { resolve } from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { loadConfig } from './config'
import { logger } from './logger'
import { acquireLock, releaseLock, registerLockCleanup } from './lock'
import { createTask, resumeTask, readTaskDescription, readPlan } from './task'
import {
  getDiffStat,
  getStatus,
  getCurrentBranch,
  commit,
  parsePlannedFiles,
  checkCommitScope,
} from './git'
import { createLLMAdapter } from './adapters/llm/factory'
import { createBuilderAdapter } from './adapters/builder/factory'
import { runPlanner } from './roles/planner'
import { runBuilder } from './roles/builder-runner'
import { runTester } from './roles/tester'
import { runReviewer } from './roles/reviewer'
import { runFixer } from './roles/fixer'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseArgs(args: string[]): { taskDescription: string | null; taskId: string | null } {
  const taskIdx = args.indexOf('--task')
  if (taskIdx >= 0 && args[taskIdx + 1]) {
    return { taskDescription: null, taskId: args[taskIdx + 1] }
  }
  // Any non-flag argument is the task description
  const desc = args.filter((a) => !a.startsWith('--')).join(' ').trim()
  if (desc) return { taskDescription: desc, taskId: null }
  return { taskDescription: null, taskId: null }
}

function printUsage(): void {
  console.log('')
  console.log('  Grovaitech AI Development Orchestrator')
  console.log('')
  console.log('  Usage:')
  console.log('    npx tsx orchestrator/run.ts "Your task description"')
  console.log('    npx tsx orchestrator/run.ts --task <task-id>')
  console.log('')
  console.log('  Environment variables (in .env.local):')
  console.log('    GEMINI_API_KEY                   required')
  console.log('    ORCHESTRATOR_PLANNER_MODEL       default: gemini-3.6-flash')
  console.log('    ORCHESTRATOR_REVIEWER_MODEL      default: gemini-3.6-flash')
  console.log('    ORCHESTRATOR_BUILDER             default: gemini-cli')
  console.log('    ORCHESTRATOR_MAX_FIX_ITERATIONS  default: 2')
  console.log('')
}

function divider(label: string): void {
  const line = '═'.repeat(70)
  console.log('')
  console.log(line)
  console.log(` ${label}`)
  console.log(line)
  console.log('')
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

async function humanGate(gateName: string, description: string, options: string[]): Promise<string> {
  divider(`HUMAN GATE: ${gateName}`)
  console.log(description)
  console.log('')
  console.log(` Options: ${options.join(' | ')}`)
  console.log('')

  while (true) {
    const answer = await ask(' > Your decision: ')
    if (options.map((o) => o.toLowerCase()).includes(answer)) {
      return answer
    }
    console.log(` Please enter one of: ${options.join(', ')}`)
  }
}

// ─── Main Orchestration Loop ──────────────────────────────────────────────────

async function main(): Promise<void> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  const { taskDescription, taskId } = parseArgs(args)

  if (!taskDescription && !taskId) {
    console.error(' Error: provide a task description or --task <id>')
    printUsage()
    process.exit(1)
  }

  // ── Load config ──────────────────────────────────────────────────────────
  let config
  try {
    config = loadConfig(repoRoot)
  } catch (err: any) {
    console.error(`\n Config error: ${err.message}\n`)
    process.exit(1)
  }

  // ── Acquire lock (prevents concurrent runs) ───────────────────────────────
  acquireLock(repoRoot)
  registerLockCleanup(repoRoot)

  // ── Bootstrap task ────────────────────────────────────────────────────────
  const state = taskId
    ? resumeTask(repoRoot, taskId)
    : createTask(repoRoot, taskDescription!)

  logger.setLogFile(state.logFile)
  logger.info('Orchestrator started', {
    taskId: state.id,
    builder: config.builder,
    plannerModel: config.plannerModel,
    reviewerModel: config.reviewerModel,
    maxFixIterations: config.maxFixIterations,
    branch: getCurrentBranch(repoRoot),
  })

  const task = readTaskDescription(state)
  divider(`TASK: ${state.id}`)
  console.log(task)

  // ── Create adapters ───────────────────────────────────────────────────────
  const plannerLLM = createLLMAdapter({ modelString: config.plannerModel, geminiApiKey: config.geminiApiKey })
  const reviewerLLM = createLLMAdapter({ modelString: config.reviewerModel, geminiApiKey: config.geminiApiKey })
  const builder = await createBuilderAdapter(config.builder, (msg) => logger.info(msg))

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: PLANNER
  // ─────────────────────────────────────────────────────────────────────────

  let planContent = readPlan(state) // allow resuming after a completed plan
  if (!planContent) {
    planContent = await runPlanner(plannerLLM, state, task, repoRoot)
  } else {
    logger.info('Resuming — plan.md already exists', { file: state.planFile })
  }

  divider('PLAN (review before Builder executes)')
  console.log(planContent)

  // Gate 1: Plan review
  const planDecision = await humanGate(
    'Plan Review',
    'Review the implementation plan above.',
    ['approve', 'reject'],
  )

  if (planDecision === 'reject') {
    logger.info('Plan rejected by human — stopping')
    console.log(' Plan rejected. Edit orchestrator/tasks/' + state.id + '/task.md and re-run to regenerate.')
    releaseLock(repoRoot)
    process.exit(0)
  }

  logger.info('Plan approved by human')

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 + LOOP: BUILDER → TESTER → REVIEWER → FIXER (bounded)
  // ─────────────────────────────────────────────────────────────────────────

  let fixIteration = 0
  const maxFix = config.maxFixIterations

  // Initial Builder run
  await runBuilder(builder, state, task, planContent, repoRoot)

  while (true) {
    // ── STEP 3: TESTER ──────────────────────────────────────────────────────
    const testResults = await runTester(state, repoRoot)

    divider('TEST RESULTS')
    console.log(`  ${testResults.summary}`)
    for (const r of testResults.results) {
      console.log(`  ${r.passed ? '✓' : '✗'} ${r.script} (${r.durationMs}ms)`)
    }

    // ── STEP 4: REVIEWER ────────────────────────────────────────────────────
    const review = await runReviewer(
      reviewerLLM,
      state,
      task,
      planContent,
      testResults,
      repoRoot,
    )

    divider('REVIEW')
    console.log(review.content)

    if (review.decision === 'REJECT') {
      logger.warn('Reviewer REJECTED the implementation')
      console.log(' ✗ Reviewer REJECTED — the implementation has unfixable problems.')
      console.log(' See review.md for details: ' + state.reviewFile)
      const action = await humanGate(
        'Rejection — What to do?',
        'The Reviewer rejected the implementation. You can abort or override (proceed to human approval anyway).',
        ['abort', 'override'],
      )
      if (action === 'abort') {
        releaseLock(repoRoot)
        process.exit(1)
      }
      // Override — fall through to human approval gate
      break
    }

    if (review.decision === 'APPROVE') {
      logger.info('Reviewer APPROVED the implementation')
      console.log(' ✓ Reviewer APPROVED')
      break
    }

    // REQUEST_CHANGES
    if (fixIteration >= maxFix) {
      logger.warn(`Fix limit reached (${maxFix} iterations). Escalating to human.`)
      divider('FIX LIMIT REACHED')
      console.log(` Max fix iterations (${maxFix}) exhausted.`)
      console.log(' The Reviewer still has required changes:')
      console.log(review.requiredChanges ?? '(see review.md)')
      const action = await humanGate(
        'Fix Limit — What to do?',
        'Automatic fixing limit reached. You can abort or proceed to human approval anyway.',
        ['abort', 'proceed'],
      )
      if (action === 'abort') {
        releaseLock(repoRoot)
        process.exit(1)
      }
      break
    }

    // ── STEP 5: FIXER ──────────────────────────────────────────────────────
    fixIteration++
    logger.info(`Starting fix iteration ${fixIteration}/${maxFix}`)
    await runFixer(
      builder,
      state,
      task,
      planContent,
      review.requiredChanges ?? review.content,
      fixIteration,
      repoRoot,
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GATE 3: HUMAN APPROVAL & SAFE COMMIT SCOPE
  // ─────────────────────────────────────────────────────────────────────────

  const branch = getCurrentBranch(repoRoot)
  const diffStat = getDiffStat(repoRoot)

  // ── Safe Commit Scope Check ──────────────────────────────────────────────
  const plannedFiles = parsePlannedFiles(planContent)
  const scope = checkCommitScope(repoRoot, plannedFiles)

  if (!scope.isClean) {
    logger.error('Commit blocked: out-of-scope files detected in working tree', {
      outOfScope: scope.outOfScope,
      inScope: scope.inScope,
      plannedFiles: scope.plannedFiles,
    })

    divider('SCOPE VIOLATION DETECTED — UNPLANNED CHANGES PRESENT')
    console.log(' The working tree contains changes outside the planned scope:')
    for (const file of scope.outOfScope) {
      console.log(`   ✗ [OUT OF SCOPE] ${file}`)
    }
    console.log('')
    console.log(' Planned files for this task:')
    if (scope.plannedFiles.length === 0) {
      console.log('   (none parsed from implementation plan)')
    } else {
      for (const file of scope.plannedFiles) {
        console.log(`   ✓ [PLANNED]     ${file}`)
      }
    }
    console.log('')
    console.log(' SAFETY RULE:')
    console.log(' The orchestrator will NOT stage or commit unrelated changes, and will never silently discard them.')
    console.log(' Human intervention is required: inspect, stash, or revert out-of-scope files before proceeding.')
    console.log('')

    await humanGate(
      'Scope Violation',
      'Unplanned files must be addressed manually before this task can be committed.',
      ['abort'],
    )
    releaseLock(repoRoot)
    process.exit(1)
  }

  divider('HUMAN APPROVAL GATE')
  console.log(` Branch: ${branch}`)
  console.log('')
  console.log(' Files to be committed (in planned scope):')
  if (scope.inScope.length === 0) {
    console.log('   (no changed files matching planned scope)')
  } else {
    for (const file of scope.inScope) {
      console.log(`   + ${file}`)
    }
  }
  console.log('')
  console.log(' Git diff summary:')
  console.log(diffStat || '  (no changes)')
  console.log('')
  console.log(' Task files:')
  console.log('   plan:   ' + state.planFile)
  console.log('   review: ' + state.reviewFile)
  console.log('   log:    ' + state.logFile)
  console.log('')
  console.log(' ⚠  COMMIT will stage ONLY the in-scope task files and create a git commit.')
  console.log(' ⚠  PUSH will NOT happen automatically — run `git push` yourself.')

  const commitDecision = await humanGate(
    'Final Commit Approval',
    'Type "commit" to stage + commit the in-scope changes, or "abort" to discard.',
    ['commit', 'abort'],
  )

  if (commitDecision === 'abort') {
    logger.info('Human aborted at commit gate — no changes committed')
    console.log(' Aborted. Working tree unchanged. Run `git checkout -- .` to discard changes if desired.')
    releaseLock(repoRoot)
    process.exit(0)
  }

  // ── COMMIT (human approved, in-scope files only) ──────────────────────────
  if (scope.inScope.length === 0) {
    logger.warn('Commit skipped: no changed files in scope')
    console.log(' No files in planned scope have changed. Nothing to commit.')
    releaseLock(repoRoot)
    process.exit(0)
  }

  const commitMsg = `[orchestrator] ${state.id}: ${task.slice(0, 72)}`
  const commitResult = commit(repoRoot, commitMsg, scope.inScope)

  if (!commitResult.success) {
    logger.error('Commit failed', { error: commitResult.error })
    console.error(' ✗ Commit failed: ' + commitResult.error)
    releaseLock(repoRoot)
    process.exit(1)
  }

  logger.info('Commit successful', { message: commitMsg, stagedFiles: commitResult.stagedFiles })

  divider('COMPLETE')
  console.log(' ✓ Committed: ' + commitMsg)
  if (commitResult.stagedFiles) {
    console.log(' Staged files:')
    for (const f of commitResult.stagedFiles) {
      console.log(`   + ${f}`)
    }
  }
  console.log(' ─────────────────────────────────────────────────')
  console.log(' To push: git push origin ' + branch)
  console.log(' ─────────────────────────────────────────────────')
  console.log('')

  releaseLock(repoRoot)
}

main().catch((err) => {
  console.error('[orchestrator] Fatal error:', err?.message ?? err)
  process.exit(1)
})
