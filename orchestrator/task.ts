/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/task.ts
 *
 * Task ID generation and task directory/file bootstrapping.
 * Supports both:
 *   npx tsx orchestrator/run.ts "task description"   → generates ID, creates dir
 *   npx tsx orchestrator/run.ts --task <id>          → resumes existing task
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

export interface TaskState {
  id: string
  dir: string
  taskFile: string
  planFile: string
  testResultsFile: string
  reviewFile: string
  logFile: string
}

/**
 * Generate a task ID from the task description.
 * Format: YYYYMMDD-HHMMSS-{4-char-random}
 */
export function generateTaskId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.toISOString().slice(11, 19).replace(/:/g, '')
  const rand = randomBytes(2).toString('hex')
  return `${date}-${time}-${rand}`
}

/**
 * Create a new task directory and persist the task description.
 * Returns the TaskState for the new task.
 */
export function createTask(repoRoot: string, description: string): TaskState {
  const id = generateTaskId()
  const dir = join(repoRoot, 'orchestrator', 'tasks', id)
  mkdirSync(dir, { recursive: true })

  const state = buildTaskState(repoRoot, id)
  writeFileSync(state.taskFile, description.trim(), 'utf-8')
  writeFileSync(state.logFile, '', 'utf-8') // create empty log file

  return state
}

/**
 * Resume an existing task by ID.
 * Throws if the task directory does not exist.
 */
export function resumeTask(repoRoot: string, taskId: string): TaskState {
  const dir = join(repoRoot, 'orchestrator', 'tasks', taskId)
  if (!existsSync(dir)) {
    throw new Error(
      `Task "${taskId}" not found.\n` +
      `Expected directory: ${dir}\n` +
      `Create a new task by running: npx tsx orchestrator/run.ts "your task"`,
    )
  }
  return buildTaskState(repoRoot, taskId)
}

export function readTaskDescription(state: TaskState): string {
  if (!existsSync(state.taskFile)) {
    throw new Error(`task.md missing for task ${state.id}: ${state.taskFile}`)
  }
  return readFileSync(state.taskFile, 'utf-8').trim()
}

export function readPlan(state: TaskState): string | null {
  if (!existsSync(state.planFile)) return null
  return readFileSync(state.planFile, 'utf-8').trim()
}

export function writePlan(state: TaskState, content: string): void {
  writeFileSync(state.planFile, content, 'utf-8')
}

export function writeReview(state: TaskState, content: string): void {
  writeFileSync(state.reviewFile, content, 'utf-8')
}

export function readReview(state: TaskState): string | null {
  if (!existsSync(state.reviewFile)) return null
  return readFileSync(state.reviewFile, 'utf-8').trim()
}

function buildTaskState(repoRoot: string, id: string): TaskState {
  const dir = join(repoRoot, 'orchestrator', 'tasks', id)
  return {
    id,
    dir,
    taskFile: join(dir, 'task.md'),
    planFile: join(dir, 'plan.md'),
    testResultsFile: join(dir, 'test-results.json'),
    reviewFile: join(dir, 'review.md'),
    logFile: join(dir, 'run.log'),
  }
}
