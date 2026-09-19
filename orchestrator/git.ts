/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/git.ts
 *
 * Safe git helpers for the orchestrator.
 * SAFETY: No command here pushes automatically.
 * Every destructive operation (commit) requires explicit human approval.
 */

import { spawnSync } from 'child_process'

export type GitExecutor = (
  args: string[],
  cwd: string,
) => { stdout: string; stderr: string; exitCode: number }

function defaultGit(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  })
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  }
}

/** Normalizes file paths for cross-platform Git comparisons */
export function normalizeGitPath(filePath: string): string {
  return filePath
    .replace(/^["']|["']$/g, '') // remove quotes
    .replace(/\\/g, '/') // unix slashes
    .replace(/^\.\//, '') // remove leading ./
    .trim()
}

/** Returns the full unified diff of all uncommitted changes */
export function getDiff(repoRoot: string, gitExecutor: GitExecutor = defaultGit): string {
  const diffResult = gitExecutor(['diff', 'HEAD'], repoRoot)
  const statusResult = gitExecutor(['status', '--porcelain', '-uall'], repoRoot)
  const untracked = statusResult.stdout
    .split('\n')
    .filter((line) => line.startsWith('??'))
    .map((line) => line.slice(3).trim())
    .filter(Boolean)

  let untrackedSummary = ''
  if (untracked.length > 0) {
    untrackedSummary = '\n\nUntracked files:\n' + untracked.map((f) => `+ ${f}`).join('\n')
  }

  return (diffResult.stdout + untrackedSummary).trim()
}

/** Returns git diff --stat summary */
export function getDiffStat(repoRoot: string, gitExecutor: GitExecutor = defaultGit): string {
  const result = gitExecutor(['diff', 'HEAD', '--stat'], repoRoot)
  return result.stdout.trim()
}

/** Returns git status --short */
export function getStatus(repoRoot: string, gitExecutor: GitExecutor = defaultGit): string {
  const result = gitExecutor(['status', '--short'], repoRoot)
  return result.stdout.trim()
}

/** Returns true if the working tree has any changes vs HEAD */
export function hasChanges(repoRoot: string, gitExecutor: GitExecutor = defaultGit): boolean {
  const status = getStatus(repoRoot, gitExecutor)
  return status.length > 0
}

/**
 * Returns all modified, added, deleted, or untracked files in the working tree.
 */
export function getWorkingTreeChanges(
  repoRoot: string,
  gitExecutor: GitExecutor = defaultGit,
): Array<{ path: string; status: string }> {
  const result = gitExecutor(['status', '--porcelain', '-uall'], repoRoot)
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return []
  }

  const changes: Array<{ path: string; status: string }> = []
  const lines = result.stdout.split('\n')

  for (const rawLine of lines) {
    if (!rawLine || rawLine.length < 3) continue
    const status = rawLine.slice(0, 2).trim()
    let filePath = rawLine.slice(3).trim()

    // Handle renames (e.g. "R  old.ts -> new.ts")
    if (filePath.includes(' -> ')) {
      const parts = filePath.split(' -> ')
      filePath = parts[1] ?? parts[0]
    }

    const normalized = normalizeGitPath(filePath)
    if (normalized) {
      changes.push({ path: normalized, status })
    }
  }

  return changes
}

/**
 * Extracts intended files from the implementation plan's "## Affected Files" section.
 */
export function parsePlannedFiles(planContent: string): string[] {
  if (!planContent) return []

  const match = planContent.match(/(?:^|\n)##\s+Affected Files\s*\n([\s\S]*?)(?=\n##\s+|$)/i)
  if (!match) return []

  const section = match[1]
  const lines = section.split('\n')
  const files = new Set<string>()

  const IGNORED_WORDS = new Set([
    'create',
    'modify',
    'delete',
    'add',
    'update',
    'remove',
    'none',
    'n/a',
    'new',
    'deleted',
    'modified',
  ])

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    // 1. Check for backtick enclosed paths: `path/to/file.ts`
    const backtickMatches = line.matchAll(/`([^`]+)`/g)
    let foundInBackticks = false
    for (const bMatch of backtickMatches) {
      const candidate = normalizeGitPath(bMatch[1])
      if (
        candidate &&
        (candidate.includes('/') || candidate.includes('.')) &&
        !candidate.startsWith('http') &&
        !IGNORED_WORDS.has(candidate.toLowerCase())
      ) {
        files.add(candidate)
        foundInBackticks = true
      }
    }
    if (foundInBackticks) continue

    // 2. Check for markdown links: [text](path/to/file.ts)
    const linkMatches = line.matchAll(/\[(?:[^\]]*)\]\(([^)]+)\)/g)
    let foundInLinks = false
    for (const lMatch of linkMatches) {
      const candidate = normalizeGitPath(lMatch[1])
      if (
        candidate &&
        (candidate.includes('/') || candidate.includes('.')) &&
        !candidate.startsWith('http') &&
        !IGNORED_WORDS.has(candidate.toLowerCase())
      ) {
        files.add(candidate)
        foundInLinks = true
      }
    }
    if (foundInLinks) continue

    // 3. Fallback: tokenize words on the line
    const cleanedLine = line
      .replace(/^[-*0-9.]+\s*/, '') // strip list prefixes
      .replace(/[()[\]:;,]/g, ' ') // strip punctuation
    const tokens = cleanedLine.split(/\s+/).filter(Boolean)

    for (const token of tokens) {
      const candidate = normalizeGitPath(token)
      if (
        candidate &&
        !candidate.startsWith('http') &&
        !IGNORED_WORDS.has(candidate.toLowerCase()) &&
        (candidate.includes('/') || /\.[a-zA-Z0-9_-]+$/.test(candidate))
      ) {
        files.add(candidate)
      }
    }
  }

  return Array.from(files)
}

export interface ScopeCheckResult {
  inScope: string[]
  outOfScope: string[]
  isClean: boolean
  plannedFiles: string[]
  workingTreeChanges: string[]
}

/**
 * Validates that all working tree changes fall strictly within the planned files scope.
 */
export function checkCommitScope(
  repoRoot: string,
  plannedFiles: string[],
  gitExecutor: GitExecutor = defaultGit,
): ScopeCheckResult {
  const normalizedPlanned = plannedFiles.map(normalizeGitPath)
  const plannedSet = new Set(normalizedPlanned.map((p) => p.toLowerCase()))

  const changes = getWorkingTreeChanges(repoRoot, gitExecutor)
  const workingTreeChanges = changes.map((c) => c.path)

  const inScope: string[] = []
  const outOfScope: string[] = []

  for (const file of workingTreeChanges) {
    if (plannedSet.has(file.toLowerCase())) {
      inScope.push(file)
    } else {
      outOfScope.push(file)
    }
  }

  return {
    inScope,
    outOfScope,
    isClean: outOfScope.length === 0,
    plannedFiles: normalizedPlanned,
    workingTreeChanges,
  }
}

/**
 * Safely stage and commit ONLY the designated files.
 * SAFETY: Never uses `git add -A`. Only stages explicitly designated task files.
 * REQUIRES explicit human approval before calling.
 */
export function commit(
  repoRoot: string,
  message: string,
  filesToStage?: string[],
  gitExecutor: GitExecutor = defaultGit,
): { success: boolean; error?: string; stagedFiles?: string[] } {
  if (!filesToStage || filesToStage.length === 0) {
    return {
      success: false,
      error: 'Cannot commit: no files to stage were specified. Staging all files via -A is disabled for safety.',
    }
  }

  const normalizedFiles = filesToStage.map(normalizeGitPath)

  // Stage ONLY the specified files
  const addResult = gitExecutor(['add', '--', ...normalizedFiles], repoRoot)
  if (addResult.exitCode !== 0) {
    return { success: false, error: `git add failed: ${addResult.stderr}` }
  }

  const commitResult = gitExecutor(['commit', '-m', message], repoRoot)
  if (commitResult.exitCode !== 0) {
    return { success: false, error: `git commit failed: ${commitResult.stderr}` }
  }

  return { success: true, stagedFiles: normalizedFiles }
}

/**
 * Get the current branch name.
 */
export function getCurrentBranch(repoRoot: string, gitExecutor: GitExecutor = defaultGit): string {
  const result = gitExecutor(['branch', '--show-current'], repoRoot)
  return result.stdout.trim()
}

