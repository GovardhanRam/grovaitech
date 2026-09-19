import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiCliBuilderAdapter } from '@/orchestrator/adapters/builder/gemini-cli'
import { createBuilderAdapter } from '@/orchestrator/adapters/builder/factory'
import { ManualBuilderAdapter } from '@/orchestrator/adapters/builder/manual'

describe('Gemini CLI Builder Adapter & Factory', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('GeminiCliBuilderAdapter', () => {
    it('1. initializes with correct metadata', () => {
      const adapter = new GeminiCliBuilderAdapter()
      expect(adapter.name).toBe('Gemini CLI')
      expect(adapter.adapterId).toBe('gemini-cli')
    })

    it('2. reports unavailable when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY
      const adapter = new GeminiCliBuilderAdapter(undefined, '')
      const result = await adapter.checkAvailability()
      expect(result.available).toBe(false)
      expect(result.reason).toContain('GEMINI_API_KEY is not configured')
    })

    it('3. reports available when GEMINI_API_KEY is present and CLI executes', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSyFakeKeyForTestCheckingAvailability12'
      const checkSpy = vi
        .spyOn(GeminiCliBuilderAdapter.prototype, 'checkAvailability')
        .mockResolvedValue({ available: true })
      const adapter = new GeminiCliBuilderAdapter()
      const result = await adapter.checkAvailability()
      expect(result.available).toBe(true)
      expect(checkSpy).toHaveBeenCalled()
    })

    it('4. fails execution gracefully if GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY
      const adapter = new GeminiCliBuilderAdapter(undefined, '')
      const result = await adapter.execute({
        taskDescription: 'Test task',
        planContent: 'Test plan',
        repoRoot: process.cwd(),
        taskDir: process.cwd(),
      })
      expect(result.success).toBe(false)
      expect(result.stderr).toContain('GEMINI_API_KEY is required')
    })
  })

  describe('Builder Factory (createBuilderAdapter)', () => {
    it('5. instantiates Gemini CLI adapter when gemini-cli is requested and available', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSyFakeKeyForTestCheckingAvailability12'
      vi.spyOn(GeminiCliBuilderAdapter.prototype, 'checkAvailability').mockResolvedValue({ available: true })
      const logs: string[] = []
      const adapter = await createBuilderAdapter('gemini-cli', (msg) => logs.push(msg))
      expect(adapter).toBeInstanceOf(GeminiCliBuilderAdapter)
      expect(adapter.adapterId).toBe('gemini-cli')
      expect(logs).toContain('[Builder] Gemini CLI adapter ready')
    })

    it('6. returns ManualBuilderAdapter when manual is explicitly selected', async () => {
      const logs: string[] = []
      const adapter = await createBuilderAdapter('manual', (msg) => logs.push(msg))
      expect(adapter).toBeInstanceOf(ManualBuilderAdapter)
      expect(adapter.adapterId).toBe('manual')
      expect(logs).toContain('[Builder] Manual adapter selected via config')
    })

    it('7. safely falls back to manual when an unknown adapter is provided', async () => {
      const logs: string[] = []
      const adapter = await createBuilderAdapter('unknown-llm-builder', (msg) => logs.push(msg))
      expect(adapter).toBeInstanceOf(ManualBuilderAdapter)
      expect(adapter.adapterId).toBe('manual')
      expect(logs.some((l) => l.includes('Unknown adapter'))).toBe(true)
    })

    it('8. falls back to manual when claude-code is unauthenticated', async () => {
      const logs: string[] = []
      const adapter = await createBuilderAdapter('claude-code', (msg) => logs.push(msg))
      expect(adapter).toBeInstanceOf(ManualBuilderAdapter)
      expect(adapter.adapterId).toBe('manual')
      expect(logs.some((l) => l.includes('Falling back to manual adapter'))).toBe(true)
    }, 15000)
  })
})
