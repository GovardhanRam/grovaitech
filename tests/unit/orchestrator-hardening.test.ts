import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeGitPath,
  parsePlannedFiles,
  checkCommitScope,
  commit,
} from '@/orchestrator/git'
import { extractDecision } from '@/orchestrator/roles/reviewer'
import { ClaudeCodeBuilderAdapter } from '@/orchestrator/adapters/builder/claude-code'
import {
  isSensitiveOrExcluded,
  extractTaskKeywords,
  buildDirectoryHierarchy,
  gatherCodebaseContext,
  findRelevantSourceFiles,
} from '@/orchestrator/roles/planner'
import * as childProcess from 'child_process'

describe('Grovaitech Orchestrator Hardening', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. SAFE COMMIT SCOPE
  // ─────────────────────────────────────────────────────────────────────────
  describe('Safe Commit Scope (orchestrator/git.ts)', () => {
    it('normalizes git paths across platforms and formats', () => {
      expect(normalizeGitPath('lib\\billing\\service.ts')).toBe('lib/billing/service.ts')
      expect(normalizeGitPath('./app/api/ping/route.ts')).toBe('app/api/ping/route.ts')
      expect(normalizeGitPath('"tests/unit/foo.test.ts"')).toBe('tests/unit/foo.test.ts')
      expect(normalizeGitPath("'src/index.ts'")).toBe('src/index.ts')
    })

    it('extracts planned files from ## Affected Files section with markdown backticks', () => {
      const plan = `
# Plan
## Task Summary
Add billing types and update service.

## Affected Files
- \`lib/billing/types.ts\` (MODIFY) - Add new status fields
- \`lib/billing/service.ts\` (MODIFY) - Update quote generator
- \`tests/unit/billing.test.ts\` (CREATE) - Add test coverage

## Implementation Steps
1. Edit \`lib/billing/types.ts\`
2. Edit \`lib/billing/service.ts\`
`
      const files = parsePlannedFiles(plan)
      expect(files).toEqual([
        'lib/billing/types.ts',
        'lib/billing/service.ts',
        'tests/unit/billing.test.ts',
      ])
    })

    it('extracts planned files without backticks and filters action keywords', () => {
      const plan = `
## Affected Files
* CREATE: app/api/ping/route.ts
* MODIFY lib/utils.ts
* [DELETE] lib/deprecated-code.ts
* none

## Acceptance Criteria
All tests pass.
`
      const files = parsePlannedFiles(plan)
      expect(files).toContain('app/api/ping/route.ts')
      expect(files).toContain('lib/utils.ts')
      expect(files).toContain('lib/deprecated-code.ts')
      expect(files).not.toContain('none')
      expect(files).not.toContain('CREATE')
      expect(files).not.toContain('MODIFY')
    })

    it('returns empty array when ## Affected Files is missing or empty', () => {
      expect(parsePlannedFiles('')).toEqual([])
      expect(parsePlannedFiles('## Task Summary\nNo files listed')).toEqual([])
    })

    it('detects clean working tree when all changes are within planned scope', () => {
      const planned = ['lib/billing/service.ts', 'tests/unit/billing.test.ts']

      const mockGit = vi.fn().mockReturnValue({
        stdout: ' M lib/billing/service.ts\n?? tests/unit/billing.test.ts\n',
        stderr: '',
        exitCode: 0,
      })

      const scope = checkCommitScope(process.cwd(), planned, mockGit)

      expect(scope.isClean).toBe(true)
      expect(scope.outOfScope).toEqual([])
      expect(scope.inScope).toContain('lib/billing/service.ts')
      expect(scope.inScope).toContain('tests/unit/billing.test.ts')
    })

    it('detects out-of-scope files and marks isClean as false when unplanned changes exist', () => {
      const planned = ['lib/billing/service.ts']

      const mockGit = vi.fn().mockReturnValue({
        stdout: ' M lib/billing/service.ts\n?? secret.txt\n M app/unrelated.ts\n',
        stderr: '',
        exitCode: 0,
      })

      const scope = checkCommitScope(process.cwd(), planned, mockGit)

      expect(scope.isClean).toBe(false)
      expect(scope.inScope).toEqual(['lib/billing/service.ts'])
      expect(scope.outOfScope).toContain('secret.txt')
      expect(scope.outOfScope).toContain('app/unrelated.ts')
    })

    it('commit refuses to stage all files and rejects when filesToStage is empty', () => {
      const mockGit = vi.fn()

      const result = commit(process.cwd(), 'test commit', [], mockGit)
      expect(result.success).toBe(false)
      expect(result.error).toContain('no files to stage were specified')
      expect(mockGit).not.toHaveBeenCalled()

      const resultNull = commit(process.cwd(), 'test commit', undefined, mockGit)
      expect(resultNull.success).toBe(false)
      expect(resultNull.error).toContain('no files to stage were specified')
      expect(mockGit).not.toHaveBeenCalled()
    })

    it('commit stages ONLY the explicit files via git add -- <files>', () => {
      const mockGit = vi.fn().mockReturnValue({
        stdout: '',
        stderr: '',
        exitCode: 0,
      })

      const files = ['lib/billing/service.ts', 'tests/unit/billing.test.ts']
      const result = commit(process.cwd(), 'feat: add billing test', files, mockGit)

      expect(result.success).toBe(true)
      expect(result.stagedFiles).toEqual(files)

      // First call should be git add -- file1 file2
      expect(mockGit).toHaveBeenNthCalledWith(
        1,
        ['add', '--', 'lib/billing/service.ts', 'tests/unit/billing.test.ts'],
        process.cwd(),
      )
      // Second call should be git commit -m
      expect(mockGit).toHaveBeenNthCalledWith(
        2,
        ['commit', '-m', 'feat: add billing test'],
        process.cwd(),
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DETERMINISTIC REVIEW DECISION
  // ─────────────────────────────────────────────────────────────────────────
  describe('Deterministic Review Decision (orchestrator/roles/reviewer.ts)', () => {
    it('correctly extracts APPROVE from valid ## Decision section', () => {
      const review = `
## Decision
APPROVE

## Summary
The implementation strictly follows the plan.
`
      expect(extractDecision(review)).toBe('APPROVE')
    })

    it('correctly extracts REQUEST_CHANGES from valid ## Decision section', () => {
      const review = `
## Decision
REQUEST_CHANGES

## Required Changes
1. Add missing input validation.
`
      expect(extractDecision(review)).toBe('REQUEST_CHANGES')
    })

    it('correctly extracts REJECT from valid ## Decision section', () => {
      const review = `
## Decision
REJECT

## Rejection Reason
Violates project security rules.
`
      expect(extractDecision(review)).toBe('REJECT')
    })

    it('handles markdown formatting like **APPROVE** or `REQUEST_CHANGES` in decision section', () => {
      const review1 = `## Decision\n**APPROVE**\n## Summary\nGood job.`
      expect(extractDecision(review1)).toBe('APPROVE')

      const review2 = `## Decision\n\`REQUEST_CHANGES\`\n## Summary\nFix tests.`
      expect(extractDecision(review2)).toBe('REQUEST_CHANGES')

      const review3 = `## Decision\n> **REJECT**\n## Summary\nArchitectural flaw.`
      expect(extractDecision(review3)).toBe('REJECT')
    })

    it('does NOT infer APPROVE merely because the word "approve" appears in the review body', () => {
      const adversarialReview = `
## Summary
I cannot approve this pull request because type checks fail. We should not approve broken code.

## Code Quality
Do not approve without fixing error handling.

## Required Changes
Fix types before we can approve.
`
      // Missing ## Decision section entirely -> MUST default strictly to REQUEST_CHANGES
      expect(extractDecision(adversarialReview)).toBe('REQUEST_CHANGES')
    })

    it('detects negations like DO NOT APPROVE in decision section and defaults to REQUEST_CHANGES', () => {
      const review = `
## Decision
DO NOT APPROVE - missing critical verification tests.

## Summary
Tests are incomplete.
`
      expect(extractDecision(review)).toBe('REQUEST_CHANGES')
    })

    it('defaults to REQUEST_CHANGES when decision section contains conflicting decisions', () => {
      const conflicting = `
## Decision
APPROVE or REJECT depending on test run.

## Summary
Ambiguous review output.
`
      expect(extractDecision(conflicting)).toBe('REQUEST_CHANGES')
    })

    it('defaults to REQUEST_CHANGES when review text is empty or missing ## Decision', () => {
      expect(extractDecision('')).toBe('REQUEST_CHANGES')
      expect(extractDecision('Just some random text without headers')).toBe('REQUEST_CHANGES')
      expect(extractDecision('## Decision\n\n## Summary\nEmpty decision section')).toBe('REQUEST_CHANGES')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CLAUDE BUILDER PROCESS SAFETY
  // ─────────────────────────────────────────────────────────────────────────
  describe('Claude Builder Process Safety (orchestrator/adapters/builder/claude-code.ts)', () => {
    it('initializes with correct name and adapterId', () => {
      const adapter = new ClaudeCodeBuilderAdapter()
      expect(adapter.name).toBe('Claude Code CLI')
      expect(adapter.adapterId).toBe('claude-code')
    })

    it('resolves exactly once even when process fires error and close consecutively', async () => {
      let errorCallback: ((err: Error) => void) | undefined
      let closeCallback: ((code: number) => void) | undefined

      const mockProc = {
        pid: 9999,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event: string, cb: any) => {
          if (event === 'error') errorCallback = cb
          if (event === 'close') closeCallback = cb
        }),
      }

      const mockSpawn = vi.fn().mockReturnValue(mockProc)
      const adapter = new ClaudeCodeBuilderAdapter('mock-claude', mockSpawn as any)

      const executionPromise = adapter.execute({
        taskDescription: 'Test task',
        planContent: 'Test plan',
        repoRoot: process.cwd(),
        taskDir: process.cwd(),
      })

      // Trigger error first
      errorCallback?.(new Error('Spawn ENOENT mock error'))
      // Then trigger close afterwards
      closeCallback?.(1)

      const result = await executionPromise

      expect(result.success).toBe(false)
      expect(result.summary).toContain('Claude Code process error')
      // Promise resolved cleanly without throwing or hanging
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PLANNER CONTEXT GATHERING
  // ─────────────────────────────────────────────────────────────────────────
  describe('Planner Context Gathering (orchestrator/roles/planner.ts)', () => {
    it('isSensitiveOrExcluded detects .env files, secrets, credentials, and excluded directories', () => {
      // Sensitive files
      expect(isSensitiveOrExcluded('.env')).toBe(true)
      expect(isSensitiveOrExcluded('.env.local')).toBe(true)
      expect(isSensitiveOrExcluded('.env.production')).toBe(true)
      expect(isSensitiveOrExcluded('config/secrets.json')).toBe(true)
      expect(isSensitiveOrExcluded('lib/credentials.ts')).toBe(true)
      expect(isSensitiveOrExcluded('jwt_token.txt')).toBe(true)
      expect(isSensitiveOrExcluded('id_rsa.key')).toBe(true)
      expect(isSensitiveOrExcluded('server.pem')).toBe(true)
      expect(isSensitiveOrExcluded('package-lock.json')).toBe(true)

      // Excluded directories
      expect(isSensitiveOrExcluded('node_modules/foo/index.js')).toBe(true)
      expect(isSensitiveOrExcluded('.git/config')).toBe(true)
      expect(isSensitiveOrExcluded('.next/server/pages.js')).toBe(true)
      expect(isSensitiveOrExcluded('orchestrator/tasks/2026-09-19/plan.md')).toBe(true)
      expect(isSensitiveOrExcluded('frontend/legacy.ts')).toBe(true)

      // Legitimate source files
      expect(isSensitiveOrExcluded('lib/billing/service.ts')).toBe(false)
      expect(isSensitiveOrExcluded('app/actions/billing.ts')).toBe(false)
      expect(isSensitiveOrExcluded('types/database.ts')).toBe(false)
    })

    it('extractTaskKeywords tokenizes and filters stopwords', () => {
      const keywords = extractTaskKeywords('Add a new billing quote endpoint for customer payments')
      expect(keywords).toContain('billing')
      expect(keywords).toContain('quote')
      expect(keywords).toContain('endpoint')
      expect(keywords).toContain('customer')
      expect(keywords).toContain('payments')
      expect(keywords).not.toContain('add')
      expect(keywords).not.toContain('for')
    })

    it('buildDirectoryHierarchy generates a structured directory tree', () => {
      const tree = buildDirectoryHierarchy(process.cwd(), 2)
      expect(tree).toContain('=== Project Directory Structure ===')
      expect(tree).toContain('app/')
      expect(tree).toContain('lib/')
      expect(tree).not.toContain('node_modules/')
      expect(tree).not.toContain('.git/')
    })

    it('findRelevantSourceFiles finds existing files matching task keywords', () => {
      const relevant = findRelevantSourceFiles(process.cwd(), 'commercial billing quote service and types')
      expect(relevant.length).toBeGreaterThan(0)
      const paths = relevant.map((r) => r.relPath)
      expect(paths.some((p) => p.includes('billing'))).toBe(true)
      // Verify sensitive files are never returned
      expect(paths.every((p) => !isSensitiveOrExcluded(p))).toBe(true)
    })

    it('gatherCodebaseContext keeps total context strictly within bounded limit', () => {
      const context = gatherCodebaseContext(process.cwd(), 'implement quote creation in billing service')
      expect(context).toContain('package.json')
      expect(context).toContain('=== Project Directory Structure ===')
      expect(context.length).toBeLessThanOrEqual(24_000)
      // Verify no sensitive file snippets were attached
      expect(context).not.toContain('=== .env')
      expect(context).not.toContain('=== .env.local')
      expect(context).not.toContain('=== .env.production')
    })
  })
})
