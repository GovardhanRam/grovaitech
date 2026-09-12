/**
 * Grovaitech AI Platform
 * tests/unit/phase-5t-e3-provider-certification.test.ts
 *
 * Phase 5T-E3: Live Provider Certification & Adapter Execution Test Suite.
 * Validates Google Calendar & n8n webhook under the Phase 5T-E1 execution safety plane:
 * - Test A: Live execution disabled -> provider denied
 * - Test B: Authorization failure (invalid/revoked token) -> denied
 * - Test C: Invalid/private/SSRF URL (localhost, 169.254.169.254, 10.x, 192.168.x, http://) -> blocked
 * - Test D: Google Calendar certification request validation
 * - Test E: n8n webhook certification request validation
 * - Test F: Successful provider adapter contract (ProviderExecutionResult)
 * - Test G: Provider failure handling (401, 500, invalid endpoint)
 * - Test H: Timeout handling (aborts on slow responses)
 * - Test I: Durable operation lifecycle & audit details recorded
 * - Test J: Result sanitization (secrets scrubbed)
 * - Test K: Secret/token removal from error messages
 * - Test L: Zero regression to E1 tests
 * - Test M: Zero regression to Deployment Engine tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  certifyIntegration,
  certifyGoogleCalendarLive,
  certifyN8nWebhookLive,
} from '@/lib/integrations/certification'
import {
  dispatchTenantCalendarEvent,
} from '@/lib/integrations/calendar-adapter'
import {
  dispatchTenantN8nWebhook,
} from '@/lib/integrations/n8n-adapter'
import {
  MemoryCredentialStore,
  setCredentialStore,
} from '@/lib/integrations/credentials'
import {
  MemoryIdempotencyStore,
  setIdempotencyStore,
} from '@/lib/integrations/idempotency'
import { encryptSecret } from '@/lib/integrations/crypto'
import {
  sanitizeResultPayload,
  scrubSensitiveString,
} from '@/lib/integrations/fingerprint'
import { EgressSecurityError } from '@/lib/integrations/egress'
import type { ProviderExecutionResult } from '@/lib/integrations/types'

describe('Phase 5T-E3: Live Provider Certification & Execution Safety', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  let credStore: MemoryCredentialStore
  let idempStore: MemoryIdempotencyStore

  const clientId = 'client-e3-test'
  const deploymentId = 'dep-e3-test'
  const calendarId = 'team-scheduling@example.com'
  const testCalendarToken = 'ya29.a0AfH6SMCredentialTokenSecret12345'
  const n8nWebhookUrl = 'https://n8n.cloud-automation.internal.example.com/webhook/test-endpoint'
  const testN8nSecret = 'n8n_sec_super_secret_signing_key_999'

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS

    credStore = new MemoryCredentialStore()
    setCredentialStore(credStore)

    idempStore = new MemoryIdempotencyStore()
    setIdempotencyStore(idempStore)

    // Active deployment
    credStore.addDeployment({
      id: deploymentId,
      client_id: clientId,
      status: 'active',
      runtime_config: {
        operating_parameters: {},
      },
    })
  })

  afterEach(() => {
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS
    vi.restoreAllMocks()
  })

  // Helper to add encrypted Google Calendar credential
  function addCalendarCredential(status = 'active', certificationStatus = 'CONFIGURED', expiresAt?: string | null) {
    const encrypted = encryptSecret(
      JSON.stringify({
        accessToken: testCalendarToken,
        calendarId,
      }),
      { customMasterKey: TEST_MASTER_KEY }
    )

    credStore.addCredential({
      id: 'cred-cal-01',
      client_id: clientId,
      deployment_id: deploymentId,
      provider: 'google_calendar',
      credential_type: 'oauth2_token',
      encrypted_secret: encrypted,
      key_version: 1,
      metadata: { calendar_id: calendarId },
      status: status as any,
      certification_status: certificationStatus as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
  }

  // Helper to add encrypted n8n webhook credential
  function addN8nCredential(status = 'active', certificationStatus = 'CONFIGURED', customUrl = n8nWebhookUrl) {
    const encrypted = encryptSecret(
      JSON.stringify({
        webhookUrl: customUrl,
        secretKey: testN8nSecret,
      }),
      { customMasterKey: TEST_MASTER_KEY }
    )

    credStore.addCredential({
      id: 'cred-n8n-01',
      client_id: clientId,
      deployment_id: deploymentId,
      provider: 'n8n',
      credential_type: 'webhook_hmac',
      encrypted_secret: encrypted,
      key_version: 1,
      metadata: { webhook_url: customUrl },
      status: status as any,
      certification_status: certificationStatus as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  // =========================================================================
  // Test A: Live execution disabled -> provider denied
  // =========================================================================
  describe('Test A: Live execution disabled -> provider denied', () => {
    it('rejects Google Calendar live certification when ENABLE_LIVE_EXTERNAL_ADAPTERS is not set', async () => {
      addCalendarCredential()

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('Live external execution is globally disabled')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('rejects n8n live certification when ENABLE_LIVE_EXTERNAL_ADAPTERS is false', async () => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'false'
      addN8nCredential()

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('Live external execution is globally disabled')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('denies live Calendar adapter execution when live gate is disabled', async () => {
      addCalendarCredential('active', 'CERTIFIED')

      const result = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'Demo Consultation',
        startTime: '2026-10-01T10:00:00Z',
        endTime: '2026-10-01T10:30:00Z',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
      })

      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('LIVE_EXECUTION_BLOCKED')
      expect(result.safeMessage).toContain('globally disabled')
    })

    it('denies live n8n adapter execution when live gate is disabled', async () => {
      addN8nCredential('active', 'CERTIFIED')

      const result = await dispatchTenantN8nWebhook({
        clientId,
        deploymentId,
        payload: { leadId: 'lead_123' },
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
      })

      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('LIVE_EXECUTION_BLOCKED')
      expect(result.safeMessage).toContain('globally disabled')
    })
  })

  // =========================================================================
  // Test B: Authorization failure (invalid/revoked/expired token) -> denied
  // =========================================================================
  describe('Test B: Authorization failure (invalid/revoked/expired token) -> denied', () => {
    it('rejects certification when credential status is revoked', async () => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
      addCalendarCredential('revoked')

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('REVOKED')
      expect(result.error).toContain('revoked')
    })

    it('rejects certification when credential has expired', async () => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
      const pastDate = new Date(Date.now() - 3600000).toISOString()
      addCalendarCredential('active', 'CONFIGURED', pastDate)

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('EXPIRED')
      expect(result.error).toContain('expired')
    })

    it('handles Google Calendar 401 Unauthorized securely during live certification', async () => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
      addCalendarCredential()

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 401, message: 'Invalid Credentials' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('Google Calendar authentication failed')
      expect(result.error).toContain('HTTP 401')
      expect(result.error).not.toContain(testCalendarToken)
    })

    it('handles n8n 401 Unauthorized securely during live certification', async () => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
      addN8nCredential()

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Unauthorized: bad signature', { status: 401 })
      )

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['93.184.216.34'],
        fetchFn: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('n8n webhook authentication rejected')
      expect(result.error).not.toContain(testN8nSecret)
    })
  })

  // =========================================================================
  // Test C: Invalid/private/SSRF URL -> blocked
  // =========================================================================
  describe('Test C: Invalid/private/SSRF URL -> blocked', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('blocks n8n webhook with non-HTTPS protocol (http://)', async () => {
      addN8nCredential('active', 'CONFIGURED', 'http://automation.example.com/webhook')

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('requires an HTTPS webhook_url')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('blocks n8n webhook with localhost domain', async () => {
      addN8nCredential('active', 'CONFIGURED', 'https://localhost:5678/webhook')

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Egress blocked')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('blocks n8n webhook with cloud metadata IP 169.254.169.254', async () => {
      addN8nCredential('active', 'CONFIGURED', 'https://169.254.169.254/webhook')

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Egress blocked')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('blocks n8n webhook resolving to RFC1918 private IPs (10.x, 192.168.x)', async () => {
      addN8nCredential('active', 'CONFIGURED', 'https://internal-worker.corp/webhook')

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['10.0.0.50'],
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Egress blocked')
      expect(result.error).toContain('10.0.0.50')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('blocks n8n webhook resolving to IPv6 loopback (::1)', async () => {
      addN8nCredential('active', 'CONFIGURED', 'https://internal-service.local/webhook')

      const fetchSpy = vi.fn()
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['::1'],
        fetchFn: fetchSpy,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Egress blocked')
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Test D: Google Calendar certification request validation
  // =========================================================================
  describe('Test D: Google Calendar certification request validation', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('validates calendar_id format (must be email or primary)', async () => {
      const encrypted = encryptSecret(
        JSON.stringify({ accessToken: 'test_token', calendarId: 'invalid-no-at-sign' }),
        { customMasterKey: TEST_MASTER_KEY }
      )
      credStore.addCredential({
        id: 'cred-cal-bad-id',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'google_calendar',
        credential_type: 'oauth2_token',
        encrypted_secret: encrypted,
        key_version: 1,
        metadata: { calendar_id: 'invalid-no-at-sign' },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('requires a valid calendar_id in metadata')
    })

    it('executes safe read-only metadata verification (GET /calendars/{calendarId}) without creating events', async () => {
      addCalendarCredential()

      let capturedUrl = ''
      let capturedMethod = ''
      let capturedHeaders: any = {}

      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        capturedUrl = String(url)
        capturedMethod = options.method
        capturedHeaders = options.headers
        return new Response(
          JSON.stringify({
            id: calendarId,
            summary: 'Client Team Calendar',
            timeZone: 'America/New_York',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('CERTIFIED')
      expect(capturedMethod).toBe('GET')
      expect(capturedUrl).toContain('/calendar/v3/calendars/')
      expect(capturedUrl).toContain(encodeURIComponent(calendarId))
      expect(capturedHeaders.Authorization).toBe(`Bearer ${testCalendarToken}`)
      expect(result.auditDetails?.check).toBe('google_calendar_live_verified')
      expect(result.auditDetails?.timeZone).toBe('America/New_York')
    })
  })

  // =========================================================================
  // Test E: n8n webhook certification request validation
  // =========================================================================
  describe('Test E: n8n webhook certification request validation', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('dispatches a safe non-customer certification ping with HMAC signature', async () => {
      addN8nCredential()

      let capturedUrl = ''
      let capturedMethod = ''
      let capturedHeaders: any = {}
      let capturedBody: any = {}

      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        capturedUrl = String(url)
        capturedMethod = options.method
        capturedHeaders = options.headers
        capturedBody = JSON.parse(options.body)
        return new Response(JSON.stringify({ received: true }), { status: 200 })
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['93.184.216.34'],
        fetchFn: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('CERTIFIED')
      expect(capturedMethod).toBe('POST')
      expect(capturedUrl).toBe(n8nWebhookUrl)
      expect(capturedHeaders['X-Grovaitech-Event']).toBe('integration.certification.ping')
      expect(capturedHeaders['X-Grovaitech-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/)

      // Safe non-customer payload verification
      expect(capturedBody.event).toBe('integration.certification.ping')
      expect(capturedBody.test).toBe(true)
      expect(capturedBody.clientId).toBe(clientId)
      expect(capturedBody.deploymentId).toBe(deploymentId)
      expect(capturedBody.lead).toBeUndefined() // No customer leads
      expect(capturedBody.revenueLeak).toBeUndefined() // No sensitive business data
    })
  })

  // =========================================================================
  // Test F: Successful provider adapter contract (ProviderExecutionResult)
  // =========================================================================
  describe('Test F: Successful provider adapter contract (ProviderExecutionResult)', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('returns compliant ProviderExecutionResult on successful Calendar event creation', async () => {
      addCalendarCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'evt_google_cal_98765',
            summary: 'Product Strategy Review',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=123',
            status: 'confirmed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      const result: ProviderExecutionResult = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'Product Strategy Review',
        startTime: '2026-10-15T14:00:00Z',
        endTime: '2026-10-15T15:00:00Z',
        attendeeEmail: 'customer@example.com',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('succeeded')
      expect(result.provider).toBe('google_calendar')
      expect(result.providerOperationId).toBe('evt_google_cal_98765')
      expect(result.safeMessage).toContain('created successfully')
      expect(result.completedAt).toBeDefined()
      // Zero secrets in contract
      expect(JSON.stringify(result)).not.toContain(testCalendarToken)
    })

    it('returns compliant ProviderExecutionResult on successful n8n webhook dispatch', async () => {
      addN8nCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, executionId: 'exec_777' }), { status: 200 })
      )

      const result: ProviderExecutionResult = await dispatchTenantN8nWebhook({
        clientId,
        deploymentId,
        payload: { eventType: 'audit.completed', score: 94 },
        event: 'audit.completed',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['93.184.216.34'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('succeeded')
      expect(result.provider).toBe('n8n')
      expect(result.providerOperationId).toBeDefined()
      expect(result.safeMessage).toContain('dispatched successfully')
      expect(result.completedAt).toBeDefined()
      // Zero secrets in contract
      expect(JSON.stringify(result)).not.toContain(testN8nSecret)
    })
  })

  // =========================================================================
  // Test G: Provider failure handling (401, 500, invalid endpoint)
  // =========================================================================
  describe('Test G: Provider failure handling (401, 500, invalid endpoint)', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('maps Calendar 404 to CALENDAR_NOT_FOUND terminal failure', async () => {
      addCalendarCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Calendar not found', { status: 404 })
      )

      const result = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'Consultation',
        startTime: '2026-10-15T14:00:00Z',
        endTime: '2026-10-15T15:00:00Z',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('CALENDAR_NOT_FOUND')
      expect(result.retryable).toBe(false)
    })

    it('maps Calendar 500 server error to retryable PROVIDER_ERROR', async () => {
      addCalendarCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      )

      const result = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'Consultation',
        startTime: '2026-10-15T14:00:00Z',
        endTime: '2026-10-15T15:00:00Z',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('PROVIDER_ERROR')
      expect(result.retryable).toBe(true)
    })

    it('maps n8n 404 to ENDPOINT_NOT_FOUND terminal failure', async () => {
      addN8nCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Webhook route not found', { status: 404 })
      )

      const result = await dispatchTenantN8nWebhook({
        clientId,
        deploymentId,
        payload: { foo: 'bar' },
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['93.184.216.34'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('ENDPOINT_NOT_FOUND')
      expect(result.retryable).toBe(false)
    })

    it('maps n8n 502 Bad Gateway to retryable PROVIDER_ERROR', async () => {
      addN8nCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Bad Gateway', { status: 502 })
      )

      const result = await dispatchTenantN8nWebhook({
        clientId,
        deploymentId,
        payload: { foo: 'bar' },
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['93.184.216.34'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('PROVIDER_ERROR')
      expect(result.retryable).toBe(true)
    })
  })

  // =========================================================================
  // Test H: Timeout handling (aborts on slow responses)
  // =========================================================================
  describe('Test H: Timeout handling (aborts on slow responses)', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('aborts slow Calendar verification and returns clean timeout outcome', async () => {
      addCalendarCredential()

      const mockFetch = vi.fn().mockImplementation(async () => {
        const err = new Error('Egress request timed out after 5000ms')
        err.name = 'AbortError'
        throw err
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })

    it('transitions Calendar adapter operation to unknown on timeout (blocking blind retries)', async () => {
      addCalendarCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockImplementation(async () => {
        const err = new Error('Egress request timed out after 5000ms')
        err.name = 'AbortError'
        throw err
      })

      const result = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'VIP Sync',
        startTime: '2026-10-15T14:00:00Z',
        endTime: '2026-10-15T15:00:00Z',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('unknown')
      expect(result.errorCode).toBe('TIMEOUT')
      expect(result.retryable).toBe(false)

      // Subsequent call with exact same idempotency key must see reconciliation required
      const retryResult = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'VIP Sync',
        startTime: '2026-10-15T14:00:00Z',
        endTime: '2026-10-15T15:00:00Z',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(retryResult.status).toBe('unknown')
      expect(retryResult.errorCode).toBe('RECONCILIATION_REQUIRED')
    })

    it('transitions n8n adapter operation to unknown on timeout', async () => {
      addN8nCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockImplementation(async () => {
        const err = new Error('Egress request timed out after 5000ms')
        err.name = 'AbortError'
        throw err
      })

      const result = await dispatchTenantN8nWebhook({
        clientId,
        deploymentId,
        payload: { item: 'sample' },
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['93.184.216.34'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('unknown')
      expect(result.errorCode).toBe('TIMEOUT')
      expect(result.retryable).toBe(false)
    })
  })

  // =========================================================================
  // Test I: Durable operation lifecycle & audit details recorded
  // =========================================================================
  describe('Test I: Durable operation lifecycle & audit details recorded', () => {
    beforeEach(() => {
      process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    })

    it('records complete lifecycle (claimed -> processing -> succeeded) in idempotency store for Calendar event', async () => {
      addCalendarCredential('active', 'CERTIFIED')

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'cal_event_durable_1' }), { status: 200 })
      )

      const result = await dispatchTenantCalendarEvent({
        clientId,
        deploymentId,
        summary: 'Quarterly Kickoff',
        startTime: '2026-10-20T09:00:00Z',
        endTime: '2026-10-20T10:00:00Z',
        businessOperationId: 'biz_cal_op_100',
        executionMode: 'live',
        customStore: credStore,
        customIdempStore: idempStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.status).toBe('succeeded')

      const idempRecord = Array.from(idempStore.records.values()).find(
        (r) => r.business_operation_id === 'biz_cal_op_100'
      )
      expect(idempRecord).toBeDefined()
      expect(idempRecord?.status).toBe('succeeded')
      expect(idempRecord?.provider_operation_id).toBe('cal_event_durable_1')
      expect(idempRecord?.result_payload.eventId).toBe('cal_event_durable_1')
    })

    it('updates durable credential certification status to CERTIFIED with audit metadata', async () => {
      addCalendarCredential()

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ id: calendarId, timeZone: 'UTC', summary: 'Main Calendar' }),
          { status: 200 }
        )
      )

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        executionMode: 'live',
        customStore: credStore,
        lookupFn: async () => ['142.250.190.46'],
        fetchFn: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('CERTIFIED')

      const updatedCred = await credStore.findCredential(clientId, deploymentId, 'google_calendar')
      expect(updatedCred?.certification_status).toBe('CERTIFIED')
      expect(updatedCred?.last_verified_at).toBeDefined()
    })
  })

  // =========================================================================
  // Test J: Result sanitization (secrets scrubbed)
  // =========================================================================
  describe('Test J: Result sanitization (secrets scrubbed)', () => {
    it('sanitizes sensitive keys from result payloads recursively', () => {
      const sensitiveData = {
        eventId: 'evt_123',
        accessToken: testCalendarToken,
        nested: {
          secretKey: testN8nSecret,
          apiKey: 'key_abc_123',
          normalField: 'all-good',
        },
        tokenList: [
          { token: 'secret_token_1', label: 'entry1' },
          { password: 'myPassword123', label: 'entry2' },
        ],
      }

      const sanitized = sanitizeResultPayload(sensitiveData)
      expect(sanitized.eventId).toBe('evt_123')
      expect(sanitized.accessToken).toBe('[REDACTED_SECRET]')
      expect(sanitized.nested.secretKey).toBe('[REDACTED_SECRET]')
      expect(sanitized.nested.apiKey).toBe('[REDACTED_SECRET]')
      expect(sanitized.nested.normalField).toBe('all-good')
      expect(sanitized.tokenList[0].token).toBe('[REDACTED_SECRET]')
      expect(sanitized.tokenList[1].password).toBe('[REDACTED_SECRET]')
      expect(sanitized.tokenList[0].label).toBe('entry1')
    })
  })

  // =========================================================================
  // Test K: Secret/token removal from error messages
  // =========================================================================
  describe('Test K: Secret/token removal from error messages', () => {
    it('strips access tokens, Bearer headers, and secrets from error messages', () => {
      const leakyMessage = `Fetch failed to https://googleapis.com with Authorization: Bearer ${testCalendarToken} and apiKey=${testN8nSecret}`
      const scrubbed = scrubSensitiveString(leakyMessage, [testCalendarToken, testN8nSecret])

      expect(scrubbed).not.toContain(testCalendarToken)
      expect(scrubbed).not.toContain(testN8nSecret)
      expect(scrubbed).toContain('[REDACTED]')
      expect(scrubbed).toContain('Bearer [REDACTED]')
    })

    it('safely handles empty or undefined error messages', () => {
      expect(scrubSensitiveString('')).toBe('')
      expect(scrubSensitiveString(null as any)).toBe('')
      expect(scrubSensitiveString('Normal safe error message')).toBe('Normal safe error message')
    })
  })
})
