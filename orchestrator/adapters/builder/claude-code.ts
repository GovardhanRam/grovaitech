/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/builder/claude-code.ts
 *
 * Claude Code CLI Builder Adapter.
 *
 * Verified environment facts:
 *   - CLI location: C:\Users\govar\.local\bin\claude.exe
 *   - Version: 2.1.160 (Claude Code)
 *   - Non-interactive flag: -p / --print
 *   - Permission mode: --permission-mode acceptEdits
 *   - Auth status: NOT LOGGED IN (as of Phase 1 verification)
 *
 * The adapter checks auth before executing. If not logged in, it reports
 * the limitation and falls back to the ManualBuilderAdapter automatically.
 *
 * When you run `claude auth login` in your terminal, this adapter will
 * activate without any code changes.
 */

import { spawn, execSync } from 'child_process'
import type { BuilderAdapter, BuilderInput, BuilderResult } from './types'

/** Timeout for the Builder process in milliseconds */
const BUILDER_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

const REDACT_PATTERNS: [RegExp, string][] = [
  [/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_GEMINI_KEY]'],
  [/ghp_[0-9A-Za-z]{36}/g, '[REDACTED_GH_TOKEN]'],
  [/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED_API_KEY]'],
  [/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]'],
  [/sb_(publishable|secret)_[a-zA-Z0-9_-]+/g, '[REDACTED_SUPABASE_KEY]'],
]

function sanitize(text: string): string {
  let result = text
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function killProcessTree(pid: number | undefined): void {
  if (!pid) return
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    } catch {
      // Process may already have terminated
    }
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Process may already have terminated
    }
  }
}

export class ClaudeCodeBuilderAdapter implements BuilderAdapter {
  readonly name = 'Claude Code CLI'
  readonly adapterId = 'claude-code'

  private readonly cliBin: string
  private readonly spawnFn: typeof spawn

  constructor(cliBin = 'claude', spawnFn: typeof spawn = spawn) {
    this.cliBin = cliBin
    this.spawnFn = spawnFn
  }

  async checkAvailability(): Promise<{ available: boolean; reason?: string }> {
    return new Promise((resolve) => {
      let settled = false
      const finish = (res: { available: boolean; reason?: string }) => {
        if (settled) return
        settled = true
        resolve(res)
      }

      const proc = this.spawnFn(this.cliBin, ['auth', 'status', '--json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      })

      let stdout = ''
      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })

      proc.on('close', (code) => {
        try {
          // Auth status exits with code 1 when not logged in but still outputs JSON
          const parsed = JSON.parse(stdout.trim())
          if (parsed?.loggedIn === true) {
            finish({ available: true })
          } else {
            finish({
              available: false,
              reason:
                'Claude Code is not authenticated. Run `claude auth login` in your terminal to enable automated Builder. Until then, the manual fallback is active.',
            })
          }
        } catch {
          // If we can't parse auth output, the CLI may not be functional
          if (code !== 0 && code !== 1) {
            finish({ available: false, reason: `claude auth status exited with code ${code}` })
          } else {
            finish({ available: false, reason: 'Could not parse claude auth status output' })
          }
        }
      })

      proc.on('error', (err) => {
        finish({ available: false, reason: `claude CLI not found or not executable: ${err.message}` })
      })
    })
  }

  async execute(input: BuilderInput): Promise<BuilderResult> {
    const prompt = this.buildPrompt(input)

    return new Promise((resolve) => {
      const args = [
        '--print',
        '--output-format', 'text',
        '--permission-mode', 'acceptEdits',
        prompt,
      ]

      const proc = this.spawnFn(this.cliBin, args, {
        cwd: input.repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env },
      })

      let stdout = ''
      let stderr = ''
      let settled = false

      const finish = (result: BuilderResult) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }

      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

      const timer = setTimeout(() => {
        killProcessTree(proc.pid)
        finish({
          success: false,
          stdout: sanitize(stdout),
          stderr: sanitize(stderr + '\n[TIMEOUT] Builder exceeded ' + BUILDER_TIMEOUT_MS + 'ms limit'),
          exitCode: null,
          summary: 'Claude Code process timed out',
        })
      }, BUILDER_TIMEOUT_MS)

      proc.on('close', (code) => {
        const sanitizedOut = sanitize(stdout)
        const sanitizedErr = sanitize(stderr)
        const success = code === 0
        finish({
          success,
          stdout: sanitizedOut,
          stderr: sanitizedErr,
          exitCode: code,
          summary: success
            ? 'Claude Code completed successfully'
            : `Claude Code exited with code ${code}`,
        })
      })

      proc.on('error', (err) => {
        killProcessTree(proc.pid)
        finish({
          success: false,
          stdout: sanitize(stdout),
          stderr: sanitize(err.message),
          exitCode: null,
          summary: `Claude Code process error: ${err.message}`,
        })
      })
    })
  }

  private buildPrompt(input: BuilderInput): string {
    const lines: string[] = [
      'You are a coding agent implementing a specific task in the Grovaitech codebase.',
      '',
      '## Task',
      input.taskDescription,
      '',
      '## Implementation Plan',
      input.planContent,
      '',
      '## Instructions',
      '1. Implement EXACTLY what the plan describes — nothing more, nothing less.',
      '2. Only touch the files listed in the plan under "Affected Files".',
      '3. Follow existing TypeScript patterns in the codebase.',
      '4. Do NOT commit — the orchestrator handles git.',
      '5. Do NOT modify any file outside the plan scope.',
      '6. Do NOT add comments explaining what you did — just implement it correctly.',
      '7. When done, stop. Do not run tests yourself.',
    ]

    if (input.systemPrompt) {
      lines.unshift(input.systemPrompt, '')
    }

    return lines.join('\n')
  }
}
