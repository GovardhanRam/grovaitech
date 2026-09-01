import { vi } from 'vitest'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MockDbResult<T = any> {
  data: T | null
  error: { message: string; code?: string } | null
}

export interface MockQueryBuilderOptions<T = any> {
  data?: T
  error?: { message: string; code?: string } | null
  singleData?: any
  singleError?: { message: string; code?: string } | null
}

export interface MockSupabaseTableOverride {
  data?: any
  error?: { message: string; code?: string } | null
  singleData?: any
  singleError?: { message: string; code?: string } | null
  handler?: (table: string) => any
}

export interface MockSupabaseConfig {
  tableOverrides?: Record<string, MockSupabaseTableOverride>
  defaultData?: any
  defaultError?: { message: string; code?: string } | null
  user?: { id: string; email?: string; [key: string]: any } | null
}

export interface MockGeminiFunctionCall {
  name: string
  args: Record<string, any>
}

export interface MockGeminiTurnResponse {
  text: string
  functionCalls: MockGeminiFunctionCall[]
}

export interface MockWorkflowAdapters {
  dispatchWhatsAppTemplate: ReturnType<typeof vi.fn>
  createCalendarEvent: ReturnType<typeof vi.fn>
}

// ─── 1. Database & Supabase Mocks ───────────────────────────────────────────

/**
 * Returns a standard successful Supabase database result envelope.
 */
export function mockDbSuccess<T>(data: T): MockDbResult<T> {
  return { data, error: null }
}

/**
 * Returns a standard error Supabase database result envelope.
 */
export function mockDbError(message: string, code?: string): MockDbResult<null> {
  return { data: null, error: { message, ...(code ? { code } : {}) } }
}

/**
 * Creates a chainable Supabase query builder mock that supports common
 * chaining operations (.select, .insert, .update, .delete, .eq, .order, .limit, .single).
 */
export function createMockQueryBuilder(options: MockQueryBuilderOptions = {}) {
  const defaultData = options.data !== undefined ? options.data : []
  const defaultError = options.error !== undefined ? options.error : null
  const singleData = options.singleData !== undefined ? options.singleData : (Array.isArray(defaultData) ? defaultData[0] ?? null : defaultData)
  const singleError = options.singleError !== undefined ? options.singleError : defaultError

  const builder: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }

  // Self-chaining methods that resolve by default
  const resolvedResponse = Promise.resolve({ data: defaultData, error: defaultError })
  const singleResponse = Promise.resolve({ data: singleData, error: singleError })

  builder.select.mockImplementation(() => builder)
  builder.insert.mockImplementation(() => builder)
  builder.update.mockImplementation(() => builder)
  builder.delete.mockImplementation(() => builder)
  builder.upsert.mockImplementation(() => builder)
  builder.eq.mockImplementation(() => builder)
  builder.neq.mockImplementation(() => builder)
  builder.in.mockImplementation(() => builder)
  builder.is.mockImplementation(() => builder)
  builder.order.mockImplementation(() => builder)
  builder.limit.mockImplementation(() => builder)
  builder.range.mockImplementation(() => builder)

  builder.single.mockImplementation(() => singleResponse)
  builder.maybeSingle.mockImplementation(() => singleResponse)

  // Attach then/catch to allow direct await on the builder chain
  builder.then = (onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) => {
    return resolvedResponse.then(onFulfilled, onRejected)
  }

  return builder
}

/**
 * Creates a complete mock Supabase client with auth and table dispatching.
 */
export function createMockSupabaseClient(config: MockSupabaseConfig = {}) {
  const defaultUser = config.user !== undefined ? config.user : { id: 'usr-test-001', email: 'test@example.com' }

  return {
    from: vi.fn((tableName: string) => {
      if (config.tableOverrides && config.tableOverrides[tableName]) {
        const override = config.tableOverrides[tableName]
        if (override.handler) {
          return override.handler(tableName)
        }
        return createMockQueryBuilder({
          data: override.data,
          error: override.error,
          singleData: override.singleData,
          singleError: override.singleError,
        })
      }

      return createMockQueryBuilder({
        data: config.defaultData,
        error: config.defaultError,
      })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: defaultUser ? { user: defaultUser } : { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: defaultUser ? { session: { user: defaultUser } } : { session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: defaultUser ? { user: defaultUser, session: {} } : { user: null, session: null },
        error: null,
      }),
    },
  }
}

// ─── 2. Gemini & AI Engine Mocks ────────────────────────────────────────────

/**
 * Creates a mocked Gemini AI client instance with standard method stubs.
 */
export function createMockGeminiInstance(overrides: {
  generateContentWithTools?: ReturnType<typeof vi.fn>
  generateText?: ReturnType<typeof vi.fn>
  generateContent?: ReturnType<typeof vi.fn>
  getEmbeddings?: ReturnType<typeof vi.fn>
} = {}) {
  return {
    generateContentWithTools: overrides.generateContentWithTools ?? vi.fn(),
    generateText: overrides.generateText ?? vi.fn(),
    generateContent: overrides.generateContent ?? vi.fn(),
    getEmbeddings: overrides.getEmbeddings ?? vi.fn().mockResolvedValue(new Array(768).fill(0.01)),
  }
}

/**
 * Creates a mock Gemini turn result containing a tool/function call.
 */
export function mockGeminiToolCall(
  name: string,
  args: Record<string, any>,
  text = ''
): MockGeminiTurnResponse {
  return {
    text,
    functionCalls: [{ name, args }],
  }
}

/**
 * Creates a mock Gemini turn result containing pure conversational text.
 */
export function mockGeminiTextResponse(text: string): MockGeminiTurnResponse {
  return {
    text,
    functionCalls: [],
  }
}

/**
 * Creates a mock embedding vector of specified dimension.
 */
export function mockEmbeddingsVector(dimensions = 768, fillValue = 0.05): number[] {
  return new Array(dimensions).fill(fillValue)
}

// ─── 3. Workflow Execution Adapters ─────────────────────────────────────────

/**
 * Creates live/mock workflow execution adapters with default successful responses.
 */
export function createMockWorkflowAdapters(
  overrides?: Partial<MockWorkflowAdapters>
): MockWorkflowAdapters {
  return {
    dispatchWhatsAppTemplate:
      overrides?.dispatchWhatsAppTemplate ??
      vi.fn().mockResolvedValue({
        status: 'success',
        detail: 'Verified WhatsApp template dispatched.',
      }),
    createCalendarEvent:
      overrides?.createCalendarEvent ??
      vi.fn().mockResolvedValue({
        status: 'success',
        detail: 'Verified calendar event created.',
      }),
  }
}

/**
 * Creates workflow execution adapters where specified steps fail.
 */
export function createFailingWorkflowAdapters(
  failingStep: 'whatsapp' | 'calendar' | 'all' = 'all',
  errorMessage = 'Simulated integration failure'
): MockWorkflowAdapters {
  return {
    dispatchWhatsAppTemplate: vi.fn().mockImplementation(async () => {
      if (failingStep === 'whatsapp' || failingStep === 'all') {
        return { status: 'failed', detail: errorMessage }
      }
      return { status: 'success', detail: 'Verified WhatsApp template dispatched.' }
    }),
    createCalendarEvent: vi.fn().mockImplementation(async () => {
      if (failingStep === 'calendar' || failingStep === 'all') {
        return { status: 'failed', detail: errorMessage }
      }
      return { status: 'success', detail: 'Verified calendar event created.' }
    }),
  }
}

// ─── 4. Server Action & Lead Operation Responses ────────────────────────────

/**
 * Returns a standard server action success response envelope.
 */
export function mockActionSuccess<T>(data: T, extra: Record<string, any> = {}) {
  return {
    success: true as const,
    data,
    ...extra,
  }
}

/**
 * Returns a standard server action failure response envelope.
 */
export function mockActionError(error: string, code?: string) {
  return {
    success: false as const,
    error,
    ...(code ? { code } : {}),
  }
}

/**
 * Creates a mock lead action response conforming to createLead return shape.
 */
export function mockLeadActionResult(
  leadData: Record<string, any> = {},
  isUpdate = false
) {
  return {
    success: true as const,
    data: {
      id: 'lead-mock-001',
      lead_status: 'qualified',
      lead_score: 'warm',
      ...leadData,
    },
    isUpdate,
  }
}

// ─── 5. Test Environment Utilities ──────────────────────────────────────────

/**
 * Resets all mocks, environment variables stubs, and global stubs in Vitest.
 */
export function resetTestEnvironment() {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
}

/**
 * Creates a mocked global fetch response.
 */
export function mockFetchResponse(
  body: any,
  options: { ok?: boolean; status?: number; statusText?: string } = {}
) {
  const ok = options.ok ?? (options.status ? options.status >= 200 && options.status < 300 : true)
  const status = options.status ?? (ok ? 200 : 500)
  const statusText = options.statusText ?? (ok ? 'OK' : 'Internal Server Error')

  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })
}
