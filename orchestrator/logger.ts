/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/logger.ts
 *
 * Structured JSON logger. Writes to stdout (for human reading)
 * and appends structured entries to run.log in the task directory.
 * Sanitizes API keys, tokens, and JWTs from all log output.
 */

import { appendFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'step'

export interface LogEntry {
  ts: string
  level: LogLevel
  message: string
  data?: unknown
}

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

function safeStringify(value: unknown): string {
  try {
    return sanitize(JSON.stringify(value, null, 2) ?? '')
  } catch {
    return '[unserializable]'
  }
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  info:  ' INFO ',
  warn:  ' WARN ',
  error: 'ERROR ',
  debug: 'DEBUG ',
  step:  ' STEP ',
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[90m',   // gray
  step:  '\x1b[32m',   // green
}

const RESET = '\x1b[0m'

export class Logger {
  private logFile: string | null = null

  setLogFile(path: string): void {
    mkdirSync(dirname(path), { recursive: true })
    this.logFile = path
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    const ts = new Date().toISOString()
    const sanitizedMsg = sanitize(message)
    const entry: LogEntry = { ts, level, message: sanitizedMsg, ...(data !== undefined ? { data } : {}) }

    // Human-readable console output
    const color = LEVEL_COLORS[level]
    const label = LEVEL_LABELS[level]
    const prefix = `${color}[${label}]${RESET}`
    if (data !== undefined) {
      console.log(`${prefix} ${sanitizedMsg}\n${safeStringify(data)}`)
    } else {
      console.log(`${prefix} ${sanitizedMsg}`)
    }

    // Structured log file
    if (this.logFile) {
      try {
        appendFileSync(this.logFile, JSON.stringify(entry) + '\n', 'utf-8')
      } catch {
        // Non-fatal — log file write failure should not stop execution
      }
    }
  }

  info(message: string, data?: unknown): void { this.write('info', message, data) }
  warn(message: string, data?: unknown): void { this.write('warn', message, data) }
  error(message: string, data?: unknown): void { this.write('error', message, data) }
  debug(message: string, data?: unknown): void { this.write('debug', message, data) }

  step(stepName: string, description?: string): void {
    const msg = description ? `${stepName}: ${description}` : stepName
    this.write('step', msg)
    console.log('')
  }
}

export const logger = new Logger()
