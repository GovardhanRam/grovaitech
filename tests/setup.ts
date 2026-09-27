/**
 * Grovaitech AI Platform
 * tests/setup.ts
 *
 * Global Test Environment Initialization & Database Safety Guard.
 * Strictly prevents automated tests from mutating or connecting to live production Supabase databases.
 */

// 1. Force safe test environment variables
const env = process.env as Record<string, string | undefined>
env.NODE_ENV = 'test'
env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder-test-project.supabase.co'
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder-test-anon-key'
env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-test-service-role-key'
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'test-gemini-api-key'
}

// 2. Live database safety guard
const LIVE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co/i

export function assertSafeDatabaseUrl(url?: string): void {
  if (!url) return
  const isSafeMock =
    url.includes('mock') ||
    url.includes('placeholder') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1')

  if (!isSafeMock && LIVE_URL_PATTERN.test(url)) {
    throw new Error(
      `[DATABASE SAFETY GUARD] Automated test attempted to connect to live Supabase URL: "${url}". Tests must use mock/isolated databases.`
    )
  }
}

// 3. Mock Database Fixture Protection
// Preserves pristine fixture state and prevents automated test runs from permanently dirtying lib/supabase/mock-db.json
import fs from 'fs'
import path from 'path'
import { afterAll } from 'vitest'

const MOCK_DB_PATH = path.normalize(path.join(process.cwd(), 'lib', 'supabase', 'mock-db.json'))
let pristineDbSnapshot: string | null = null

try {
  if (fs.existsSync(MOCK_DB_PATH)) {
    pristineDbSnapshot = fs.readFileSync(MOCK_DB_PATH, 'utf-8')
  }
} catch {
  // Fail-soft if file inaccessible during test initialization
}

export function restoreMockDbFixture(): void {
  if (pristineDbSnapshot !== null) {
    try {
      fs.writeFileSync(MOCK_DB_PATH, pristineDbSnapshot, 'utf-8')
    } catch {
      // Fail-soft if teardown write encounters file lock
    }
  }
}

afterAll(() => {
  restoreMockDbFixture()
})

process.on('exit', () => {
  restoreMockDbFixture()
})
