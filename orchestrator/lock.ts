/**
 * Grovaitech AI Development Orchestrator
 * orchestrator/lock.ts
 *
 * Process lock to prevent multiple concurrent orchestrator runs
 * from editing the same working tree simultaneously.
 *
 * The lock file is at orchestrator/.lock (gitignored).
 * It stores the current PID so a stale lock (process dead) is auto-cleaned.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export function getLockPath(repoRoot: string): string {
  return join(repoRoot, 'orchestrator', '.lock')
}

export function acquireLock(repoRoot: string): void {
  const lockPath = getLockPath(repoRoot)

  if (existsSync(lockPath)) {
    const raw = readFileSync(lockPath, 'utf-8').trim()
    const existingPid = parseInt(raw, 10)

    if (!isNaN(existingPid)) {
      // Check if the process is still running
      try {
        process.kill(existingPid, 0) // Signal 0 = check existence only
        throw new Error(
          `Orchestrator is already running (PID ${existingPid}).\n` +
          `Only one orchestrator run may edit the working tree at a time.\n` +
          `If the previous run crashed, delete: ${lockPath}`,
        )
      } catch (err: any) {
        if (err.code === 'ESRCH') {
          // Process is dead — stale lock, safe to overwrite
          console.warn(`[lock] Stale lock found for PID ${existingPid} — cleaning up`)
        } else {
          throw err // Re-throw if it's our "already running" error
        }
      }
    }
  }

  writeFileSync(lockPath, String(process.pid), 'utf-8')
}

export function releaseLock(repoRoot: string): void {
  const lockPath = getLockPath(repoRoot)
  try {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath)
    }
  } catch {
    // Non-fatal
  }
}

/** Register cleanup handlers so the lock is always released on exit */
export function registerLockCleanup(repoRoot: string): void {
  const release = () => releaseLock(repoRoot)
  process.on('exit', release)
  process.on('SIGINT', () => { release(); process.exit(130) })
  process.on('SIGTERM', () => { release(); process.exit(143) })
  process.on('uncaughtException', (err) => {
    console.error('[orchestrator] Uncaught exception:', err.message)
    release()
    process.exit(1)
  })
}
