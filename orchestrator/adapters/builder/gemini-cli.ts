/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/adapters/builder/gemini-cli.ts
 *
 * Gemini CLI Builder Adapter.
 *
 * Runs Google Gemini CLI (@google/gemini-cli) in non-interactive headless mode:
 *   gemini -p "<prompt>" --yolo --skip-trust --output-format text
 *
 * Requirements:
 *   - Implements BuilderAdapter interface.
 *   - Uses verified Gemini CLI installed on this machine.
 *   - Runs with cwd set to the repository root.
 *   - Passes GEMINI_API_KEY through the child-process environment.
 *   - Never prints or logs the API key; redacts keys from stdout/stderr.
 *   - Accurately captures stdout, stderr, and exit codes.
 *   - Accurately detects failures without reporting false successes.
 *   - Safely terminates process tree on timeout and resolves promise exactly once.
 */

import { spawn, execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import type { BuilderAdapter, BuilderInput, BuilderResult } from './types'

/** Timeout for the Builder process in milliseconds (10 minutes) */
const BUILDER_TIMEOUT_MS = 10 * 60 * 1000

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

function resolveInvocation(cliBin: string): { command: string; baseArgs: string[] } {
  if (process.platform === 'win32') {
    const candidates = [
      process.env.APPDATA ? join(process.env.APPDATA, 'npm', 'node_modules', '@google', 'gemini-cli', 'bundle', 'gemini.js') : '',
      'C:\\Users\\govar\\AppData\\Roaming\\npm\\node_modules\\@google\\gemini-cli\\bundle\\gemini.js',
    ].filter(Boolean)

    for (const cand of candidates) {
      if (existsSync(cand)) {
        return { command: process.execPath, baseArgs: [cand] }
      }
    }

    return { command: 'cmd.exe', baseArgs: ['/c', cliBin] }
  }

  return { command: cliBin, baseArgs: [] }
}

export class GeminiCliBuilderAdapter implements BuilderAdapter {
  readonly name = 'Gemini CLI'
  readonly adapterId = 'gemini-cli'

  private readonly cliBin: string
  private readonly apiKey?: string

  constructor(cliBin = process.platform === 'win32' ? 'gemini.cmd' : 'gemini', apiKey?: string) {
    this.cliBin = cliBin
    this.apiKey = apiKey
  }

  async checkAvailability(): Promise<{ available: boolean; reason?: string }> {
    const key = this.apiKey ?? process.env.GEMINI_API_KEY
    if (!key) {
      return {
        available: false,
        reason: 'GEMINI_API_KEY is not configured in environment or .env.local',
      }
    }

    return new Promise((resolve) => {
      const { command, baseArgs } = resolveInvocation(this.cliBin)
      const args = [...baseArgs, '--version']

      const proc = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      })

      let stdout = ''
      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })

      proc.on('close', (code) => {
        if (code === 0 && stdout.trim().length > 0) {
          resolve({ available: true })
        } else {
          resolve({
            available: false,
            reason: `Gemini CLI check failed with exit code ${code}`,
          })
        }
      })

      proc.on('error', (err) => {
        resolve({
          available: false,
          reason: `Gemini CLI not found or not executable: ${err.message}`,
        })
      })
    })
  }

  async execute(input: BuilderInput): Promise<BuilderResult> {
    const prompt = this.buildPrompt(input)
    const key = this.apiKey ?? process.env.GEMINI_API_KEY

    if (!key) {
      return {
        success: false,
        stdout: '',
        stderr: 'GEMINI_API_KEY is required to run Gemini CLI Builder',
        exitCode: null,
        summary: 'Builder failed: GEMINI_API_KEY missing',
      }
    }

    return new Promise((resolve) => {
      const { command, baseArgs } = resolveInvocation(this.cliBin)
      const cliArgs = [
        '-p', prompt,
        '--yolo',
        '--skip-trust',
        '--output-format', 'text',
      ]
      const args = [...baseArgs, ...cliArgs]

      const env = {
        ...process.env,
        GEMINI_API_KEY: key,
        GEMINI_CLI_TRUST_WORKSPACE: 'true',
      }

      const proc = spawn(command, args, {
        cwd: input.repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env,
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
          summary: 'Gemini CLI process timed out',
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
            ? 'Gemini CLI completed successfully'
            : `Gemini CLI exited with code ${code}`,
        })
      })

      proc.on('error', (err) => {
        killProcessTree(proc.pid)
        finish({
          success: false,
          stdout: sanitize(stdout),
          stderr: sanitize(err.message),
          exitCode: null,
          summary: `Gemini CLI process error: ${err.message}`,
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
