/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/roles/planner.ts
 *
 * Role 1: Planner
 * Reads the task description, gathers bounded codebase context (config,
 * actual directory hierarchy, and task-relevant source files),
 * calls the LLM, and writes plan.md.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import type { LLMAdapter } from '../adapters/llm/types'
import type { TaskState } from '../task'
import { writePlan } from '../task'
import { logger } from '../logger'

/** Static configuration files to include as baseline context */
const STATIC_CONFIG_FILES = [
  'package.json',
  'AGENTS.md',
  'tsconfig.json',
  'next.config.ts',
]

/** Maximum characters allocated for the entire codebase context */
const MAX_TOTAL_CONTEXT_CHARS = 24_000

/** Maximum characters per individual source file snippet */
const MAX_FILE_CHARS = 3_000

/** Directories to strictly exclude from scanning */
const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  '.vercel',
  'coverage',
  'build',
  'out',
  'dist',
  'tasks', // orchestrator/tasks
  '.gemini',
  'brain',
  'frontend', // legacy app
  '.local',
  'tmp',
  'temp',
])

/** Allowed file extensions for inspecting relevant source files */
const ALLOWED_SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.sql',
  '.md',
  '.json',
])

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were',
  'will', 'would', 'should', 'can', 'could', 'add', 'make', 'update', 'create', 'into',
  'when', 'what', 'which', 'their', 'there', 'about', 'more', 'some', 'such', 'then',
  'than', 'also', 'only', 'been', 'being', 'does', 'doing', 'done',
])

/**
 * Checks whether a file path is sensitive (secrets, env files, keys) or excluded.
 */
export function isSensitiveOrExcluded(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase()
  const segments = normalized.split('/')
  const fileName = segments[segments.length - 1] ?? ''

  // Never read .env files
  if (fileName.startsWith('.env')) return true

  // Never read secrets, tokens, credentials, private keys, or lockfiles
  if (
    fileName.includes('secret') ||
    fileName.includes('credential') ||
    fileName.includes('token') ||
    fileName.includes('password') ||
    fileName.endsWith('.pem') ||
    fileName.endsWith('.key') ||
    fileName.endsWith('.pfx') ||
    fileName.endsWith('.lock') ||
    fileName === 'package-lock.json'
  ) {
    return true
  }

  // Check excluded directory names
  for (const seg of segments) {
    if (EXCLUDED_DIRS.has(seg)) return true
  }

  return false
}

/**
 * Dynamically builds a concise project directory tree.
 */
export function buildDirectoryHierarchy(repoRoot: string, maxDepth = 2): string {
  const searchRoots = ['app', 'lib', 'components', 'types', 'tests', 'agents', 'prompts', 'orchestrator']
  const lines: string[] = ['=== Project Directory Structure ===']

  for (const rootDir of searchRoots) {
    const fullRootDir = join(repoRoot, rootDir)
    if (!existsSync(fullRootDir)) continue

    lines.push(`${rootDir}/`)
    try {
      const entries = readdirSync(fullRootDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue
        if (entry.isDirectory()) {
          lines.push(`  ${entry.name}/`)
          if (maxDepth >= 2) {
            try {
              const subEntries = readdirSync(join(fullRootDir, entry.name), { withFileTypes: true })
              for (const sub of subEntries) {
                if (sub.name.startsWith('.') || EXCLUDED_DIRS.has(sub.name)) continue
                if (sub.isDirectory()) {
                  lines.push(`    ${sub.name}/`)
                }
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch { /* skip */ }
  }

  return lines.join('\n')
}

/**
 * Extracts meaningful keyword tokens from the task description.
 */
export function extractTaskKeywords(taskDescription: string): string[] {
  if (!taskDescription) return []
  return taskDescription
    .toLowerCase()
    .replace(/[^a-z0-9_\-/]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

/**
 * Finds existing source files relevant to the given task description.
 */
export function findRelevantSourceFiles(
  repoRoot: string,
  taskDescription: string,
  maxFiles = 5,
): Array<{ relPath: string; content: string }> {
  const keywords = extractTaskKeywords(taskDescription)
  if (keywords.length === 0) return []

  const searchRoots = ['app', 'lib', 'components', 'types', 'tests']
  const candidates: Array<{ relPath: string; fullPath: string; score: number }> = []

  function walk(currentDir: string, depth: number) {
    if (depth > 4) return
    let entries
    try {
      entries = readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)
      const relPath = relative(repoRoot, fullPath).replace(/\\/g, '/')

      if (isSensitiveOrExcluded(relPath)) continue

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase()
        if (!ALLOWED_SOURCE_EXTENSIONS.has(ext)) continue

        try {
          const stat = statSync(fullPath)
          if (stat.size > 100 * 1024) continue // skip files larger than 100KB

          const lowerPath = relPath.toLowerCase()
          let score = 0

          for (const kw of keywords) {
            // High score for exact match in filename
            if (entry.name.toLowerCase().includes(kw)) score += 5
            // Score for directory match
            if (lowerPath.includes(kw)) score += 2
          }

          if (score > 0) {
            candidates.push({ relPath, fullPath, score })
          }
        } catch { /* skip */ }
      }
    }
  }

  for (const root of searchRoots) {
    const full = join(repoRoot, root)
    if (existsSync(full)) {
      walk(full, 1)
    }
  }

  // Sort by relevance score descending
  candidates.sort((a, b) => b.score - a.score)

  const selected: Array<{ relPath: string; content: string }> = []
  for (const item of candidates.slice(0, maxFiles)) {
    try {
      const text = readFileSync(item.fullPath, 'utf-8')
      selected.push({
        relPath: item.relPath,
        content: text.slice(0, MAX_FILE_CHARS),
      })
    } catch { /* skip */ }
  }

  return selected
}

/**
 * Gathers bounded, deterministic codebase context for the Planner.
 */
export function gatherCodebaseContext(repoRoot: string, taskDescription = ''): string {
  const parts: string[] = []
  let totalChars = 0

  // 1. Static config files
  for (const rel of STATIC_CONFIG_FILES) {
    const fullPath = join(repoRoot, rel)
    if (!existsSync(fullPath) || isSensitiveOrExcluded(rel)) continue
    try {
      const content = readFileSync(fullPath, 'utf-8')
      const snippet = `=== ${rel} ===\n${content.slice(0, 2500)}`
      parts.push(snippet)
      totalChars += snippet.length
      if (totalChars > MAX_TOTAL_CONTEXT_CHARS) break
    } catch { /* skip */ }
  }

  // 2. Dynamic directory structure
  if (totalChars < MAX_TOTAL_CONTEXT_CHARS) {
    const dirTree = buildDirectoryHierarchy(repoRoot, 2)
    parts.push(dirTree)
    totalChars += dirTree.length
  }

  // 3. Task-relevant source files
  if (totalChars < MAX_TOTAL_CONTEXT_CHARS && taskDescription) {
    const remainingBudget = MAX_TOTAL_CONTEXT_CHARS - totalChars
    const relevantFiles = findRelevantSourceFiles(repoRoot, taskDescription, 5)

    for (const file of relevantFiles) {
      const snippet = `=== Relevant Source File: ${file.relPath} ===\n${file.content}`
      if (totalChars + snippet.length > MAX_TOTAL_CONTEXT_CHARS) {
        // Truncate snippet to fit remaining budget
        const fitSnippet = snippet.slice(0, Math.max(100, remainingBudget - 50)) + '\n... [truncated]'
        parts.push(fitSnippet)
        totalChars += fitSnippet.length
        break
      }
      parts.push(snippet)
      totalChars += snippet.length
    }
  }

  return parts.join('\n\n')
}

function loadSystemPrompt(repoRoot: string): string {
  const promptPath = join(repoRoot, 'agents', 'PLANNER.md')
  if (existsSync(promptPath)) {
    return readFileSync(promptPath, 'utf-8').trim()
  }
  return 'You are the Grovaitech AI Development Planner. Produce a structured implementation plan. Do NOT write code.'
}

function buildPlannerPrompt(taskDescription: string, codebaseContext: string): string {
  return [
    '## Task',
    taskDescription,
    '',
    '## Codebase Context',
    codebaseContext,
    '',
    '## Instructions',
    'Produce a structured implementation plan in the format described in your system prompt.',
    'Do NOT write code. Write a clear, unambiguous plan only.',
  ].join('\n')
}

export async function runPlanner(
  llm: LLMAdapter,
  state: TaskState,
  taskDescription: string,
  repoRoot: string,
): Promise<string> {
  logger.step('PLANNER', 'Generating implementation plan')

  const systemPrompt = loadSystemPrompt(repoRoot)
  const context = gatherCodebaseContext(repoRoot, taskDescription)
  const userPrompt = buildPlannerPrompt(taskDescription, context)

  logger.info('Calling LLM for planning', { model: llm.name, contextChars: context.length })

  const result = await llm.complete({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.2,
    maxTokens: 4096,
  })

  const plan = result.text.trim()

  writePlan(state, plan)
  logger.info('Plan written', { file: state.planFile, tokens: result.usage?.totalTokens })

  return plan
}

