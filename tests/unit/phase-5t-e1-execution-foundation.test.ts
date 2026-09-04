/**
 * Grovaitech AI Platform
 * tests/unit/phase-5t-e1-execution-foundation.test.ts
 *
 * Phase 5T-E1: External Execution Foundation Unit Test Suite.
 * Validates:
 * 1. Normalized provider execution result contract
 * 2. Durable operation lifecycle state transitions (claim -> processing -> succeeded / failed / unknown)
 * 3. Unknown-state semantics (cannot automatically retry / reconciliation required)
 * 4. Strict Live Execution Gate (all 8 conditions enforced)
 * 5. Safe Egress Foundation (SSRF prevention, RFC1918, link-local metadata, loopback, IPv6, redirects, timeouts)
 * 6. Provider Result Sanitization (secrets scrubbed recursively)
 * 7. Factory integration with deterministic simulated lifecycle
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  type ProviderExecutionResult,
  type ExternalAdapterContext,
  assertLiveExternalExecutionAllowed,
} from '@/lib/integrations/types'
import {
  validateEgressUrl,
  safeFetch,
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  EgressSecurityError,
} from '@/lib/integrations/egress'
import {
  sanitizeResultPayload,
  canonicalizeJson,
} from '@/lib/integrations/fingerprint'
import {
  claimExternalOperation,
  transitionToProcessing,
  completeExternalOperation,
  failExternalOperation,
  markExternalOperationUnknown,
  MemoryIdempotencyStore,
  setIdempotencyStore,
  InvalidStatusTransitionError,
} from '@/lib/integrations/idempotency'
import {
  resolveExternalAdapters,
} from '@/lib/integrations/factory'
import {
  MemoryCredentialStore,
  setCredentialStore,
} from '@/lib/integrations/credentials'
import { encryptSecret } from '@/lib/integrations/crypto'

describe('Phase 5T-E1: External Execution Foundation', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  let idempStore: MemoryIdempotencyStore
  let credStore: MemoryCredentialStore

  const clientId = 'client-e1-test'
  const deploymentId = 'dep-e1-test'
  const validPhoneId = '109988776655443'

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS

    idempStore = new MemoryIdempotencyStore()
    setIdempotencyStore(idempStore)

    credStore = new MemoryCredentialStore()
    setCredentialStore(credStore)

    credStore.addDeployment({
      id: deploymentId,
      client_id: clientId,
      status: 'active',
      runtime_config: {
        operating_parameters: {
          whatsapp_phone_number_id: validPhoneId,
        },
      },
    })
  })

  afterEach(() => {
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS
    vi.restoreAllMocks()
  })

  // Helper to build valid ExternalAdapterContext
  function makeContext(overrides: Partial<ExternalAdapterContext> = {}): ExternalAdapterContext {
    return {
      clientId,
      deploymentId,
      workflowExecutionId: 'wf-exec-001',
      businessOperationId: 'biz-op-001',
      workflowStepId: 'step-001',
      idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      executionMode: 'live',
      channel: 'whatsapp',
      timestamp: new Date().toISOString(),
      ...overrides,
    }
  }

  // =========================================================================
  // 1. Normalized Provider Result Tests
  // =========================================================================
  it('1. successful normalized simulated result conforms to contract', () => {
    const res: ProviderExecutionResult = {
      status: 'simulated',
      provider: 'meta_whatsapp',
      providerOperationId: 'sim-wa-12345',
      safeMessage: 'Simulated WhatsApp message prepared',
      completedAt: new Date().toISOString(),
    }
    expect(res.status).toBe('simulated')
    expect(res.provider).toBe('meta_whatsapp')
    expect(res.providerOperationId).toBe('sim-wa-12345')
  })

  it('2. failed normalized result conforms to contract', () => {
    const res: ProviderExecutionResult = {
      status: 'failed',
      provider: 'google_calendar',
      errorCode: 'SCHEDULE_CONFLICT',
      safeMessage: 'Calendar slot occupied',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
    expect(res.status).toBe('failed')
    expect(res.errorCode).toBe('SCHEDULE_CONFLICT')
    expect(res.retryable).toBe(false)
  })

  it('3. unknown normalized result conforms to contract', () => {
    const res: ProviderExecutionResult = {
      status: 'unknown',
      provider: 'n8n',
      errorCode: 'NETWORK_TIMEOUT',
      safeMessage: 'Socket timeout after request dispatch',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
    expect(res.status).toBe('unknown')
    expect(res.errorCode).toBe('NETWORK_TIMEOUT')
  })

  it('4. simulated normalized result conforms to contract', () => {
    const res: ProviderExecutionResult = {
      status: 'succeeded',
      provider: 'meta_whatsapp',
      providerOperationId: 'wamid.HBgL123456789',
      safeMessage: 'Message delivered',
      completedAt: new Date().toISOString(),
    }
    expect(res.status).toBe('succeeded')
  })

  it('5. provider operation ID is allowed and non-secret', () => {
    const res: ProviderExecutionResult = {
      status: 'succeeded',
      provider: 'google_calendar',
      providerOperationId: 'gcal_event_9988776655',
    }
    expect(res.providerOperationId).toBe('gcal_event_9988776655')
  })

  // =========================================================================
  // 2. Provider Result Sanitization
  // =========================================================================
  it('6. secret fields sanitized at top level', () => {
    const raw = {
      token: 'secret-token-123',
      access_token: 'secret-access-token',
      apiKey: 'secret-api-key',
      safeField: 'normal value',
    }
    const sanitized = sanitizeResultPayload(raw)
    expect(sanitized.token).toBe('[REDACTED_SECRET]')
    expect(sanitized.access_token).toBe('[REDACTED_SECRET]')
    expect(sanitized.apiKey).toBe('[REDACTED_SECRET]')
    expect(sanitized.safeField).toBe('normal value')
  })

  it('7. nested secret fields sanitized recursively', () => {
    // When a parent key itself is sensitive (e.g. "credentials"), it is replaced with '[REDACTED_SECRET]'
    const rawWithSensitiveContainer = {
      data: {
        credentials: {
          password: 'supersecretpassword',
          private_key: '-----BEGIN PRIVATE KEY-----',
        },
        meta: {
          recipient: '+1234567890',
        },
      },
    }
    const sanitizedContainer = sanitizeResultPayload(rawWithSensitiveContainer)
    expect(sanitizedContainer.data.credentials).toBe('[REDACTED_SECRET]')
    expect(sanitizedContainer.data.meta.recipient).toBe('+1234567890')

    // When child fields inside a safe object are sensitive, individual child fields are redacted
    const rawWithSensitiveChildren = {
      data: {
        auth_info: {
          password: 'supersecretpassword',
          private_key: '-----BEGIN PRIVATE KEY-----',
          username: 'agent_grovaitech',
        },
      },
    }
    const sanitizedChildren = sanitizeResultPayload(rawWithSensitiveChildren)
    expect(sanitizedChildren.data.auth_info.password).toBe('[REDACTED_SECRET]')
    expect(sanitizedChildren.data.auth_info.private_key).toBe('[REDACTED_SECRET]')
    expect(sanitizedChildren.data.auth_info.username).toBe('agent_grovaitech')
  })

  // =========================================================================
  // 3. Durable Operation Lifecycle Transitions
  // =========================================================================
  it('8. claim happens before execution boundary and grants permission', async () => {
    const ctx = makeContext()
    const payload = { recipient: '+1234567890', body: 'Hello' }

    const claim = await claimExternalOperation({
      context: ctx,
      payload,
      provider: 'meta_whatsapp',
      operationName: 'whatsapp_template',
    })

    expect(claim.hasExecutionPermission).toBe(true)
    expect(claim.status).toBe('claimed')
    expect(claim.operationId).toBeDefined()

    const stored = await idempStore.findByKey(ctx.idempotencyKey)
    expect(stored).not.toBeNull()
    expect(stored?.status).toBe('claimed')
  })

  it('9. processing transition succeeds from claimed state', async () => {
    const ctx = makeContext()
    const claim = await claimExternalOperation({
      context: ctx,
      payload: { test: true },
      provider: 'meta_whatsapp',
      operationName: 'whatsapp_template',
    })

    await transitionToProcessing(claim.operationId!, ctx)
    const stored = await idempStore.findByKey(ctx.idempotencyKey)
    expect(stored?.status).toBe('processing')
  })

  it('10. success completion transitions processing to succeeded', async () => {
    const ctx = makeContext()
    const claim = await claimExternalOperation({
      context: ctx,
      payload: { test: true },
      provider: 'meta_whatsapp',
      operationName: 'whatsapp_template',
    })

    await transitionToProcessing(claim.operationId!, ctx)
    await completeExternalOperation(
      claim.operationId!,
      {
        providerOperationId: 'wamid.123',
        resultPayload: { recipient: '+123', token: 'leak' },
      },
      ctx
    )

    const stored = await idempStore.findByKey(ctx.idempotencyKey)
    expect(stored?.status).toBe('succeeded')
    expect(stored?.provider_operation_id).toBe('wamid.123')
    expect(stored?.result_payload.token).toBe('[REDACTED_SECRET]')
  })

  it('11. failure completion transitions processing to failed', async () => {
    const ctx = makeContext()
    const claim = await claimExternalOperation({
      context: ctx,
      payload: { test: true },
      provider: 'google_calendar',
      operationName: 'calendar_event',
    })

    await transitionToProcessing(claim.operationId!, ctx)
    await failExternalOperation(
      claim.operationId!,
      { code: 'CALENDAR_ERROR', message: 'Slot unavailable' },
      ctx
    )

    const stored = await idempStore.findByKey(ctx.idempotencyKey)
    expect(stored?.status).toBe('failed')
    expect(stored?.error_code).toBe('CALENDAR_ERROR')
    expect(stored?.error_message).toBe('Slot unavailable')
  })

  it('12. unknown transition transitions processing to unknown', async () => {
    const ctx = makeContext()
    const claim = await claimExternalOperation({
      context: ctx,
      payload: { test: true },
      provider: 'n8n',
      operationName: 'n8n_webhook',
    })

    await transitionToProcessing(claim.operationId!, ctx)
    await markExternalOperationUnknown(claim.operationId!, 'Socket hang up after 5000ms', ctx)

    const stored = await idempStore.findByKey(ctx.idempotencyKey)
    expect(stored?.status).toBe('unknown')
    expect(stored?.error_code).toBe('UNKNOWN_OUTCOME')
  })

  it('13. unknown state cannot auto-retry and requires reconciliation', async () => {
    const ctx = makeContext()
    const payload = { recipient: '+123' }
    const claim = await claimExternalOperation({
      context: ctx,
      payload,
      provider: 'meta_whatsapp',
      operationName: 'whatsapp_template',
    })

    await transitionToProcessing(claim.operationId!, ctx)
    await markExternalOperationUnknown(claim.operationId!, 'Timeout', ctx)

    // Replay with identical key & payload
    const replayClaim = await claimExternalOperation({
      context: ctx,
      payload,
      provider: 'meta_whatsapp',
      operationName: 'whatsapp_template',
    })

    expect(replayClaim.hasExecutionPermission).toBe(false)
    expect(replayClaim.status).toBe('unknown')
    expect(replayClaim.reconciliationRequired).toBe(true)

    // Verify invalid transition: cannot move unknown -> processing
    await expect(transitionToProcessing(claim.operationId!, ctx)).rejects.toThrow(
      InvalidStatusTransitionError
    )
  })

  // =========================================================================
  // 4. Live Execution Gate
  // =========================================================================
  it('14. live gate rejects when ENABLE_LIVE_EXTERNAL_ADAPTERS is not true', () => {
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS
    const ctx = makeContext()
    const result = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'active',
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('ENABLE_LIVE_EXTERNAL_ADAPTERS')
  })

  it('15. live gate rejects when executionMode is sandbox', () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    const ctx = makeContext({ executionMode: 'sandbox' })
    const result = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'active',
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('sandbox')
  })

  it('16. live gate rejects when deployment is inactive', () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    const ctx = makeContext()
    const result = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'paused',
      credentialStatus: 'active',
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('deployment status')
  })

  it('17. live gate rejects when credential is revoked or expired', () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    const ctx = makeContext()
    const resRevoked = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'revoked',
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(resRevoked.allowed).toBe(false)

    const resExpired = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'active',
      credentialExpiresAt: new Date(Date.now() - 10000).toISOString(),
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(resExpired.allowed).toBe(false)
    expect(resExpired.reason).toContain('credential expired')
  })

  it('18. live gate rejects when certification status is not CERTIFIED', () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    const ctx = makeContext()
    const result = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'active',
      certificationStatus: 'CONFIGURED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('CONFIGURED')
  })

  it('19. live gate rejects when idempotency claim is denied', () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    const ctx = makeContext()
    const result = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'active',
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: false,
      claimStatus: 'processing',
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('idempotency claim')
  })

  it('20. live gate allows execution when ALL 8 conditions are satisfied', () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    const ctx = makeContext()
    const result = assertLiveExternalExecutionAllowed({
      context: ctx,
      deploymentStatus: 'active',
      credentialStatus: 'active',
      credentialExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      certificationStatus: 'CERTIFIED',
      hasExecutionPermission: true,
      claimStatus: 'claimed',
    })
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  // =========================================================================
  // 5. Safe Egress Foundation
  // =========================================================================
  it('21. egress requires HTTPS protocol', async () => {
    const res = await validateEgressUrl('http://api.example.com/webhook')
    expect(res.valid).toBe(false)
    expect(res.reason).toContain('https:')
  })

  it('22. egress blocks localhost and local domain aliases', async () => {
    const res1 = await validateEgressUrl('https://localhost/api')
    expect(res1.valid).toBe(false)
    expect(res1.reason).toContain('Restricted hostname')

    const res2 = await validateEgressUrl('https://app.internal/webhook')
    expect(res2.valid).toBe(false)

    const res3 = await validateEgressUrl('https://metadata.google.internal/computeMetadata/v1')
    expect(res3.valid).toBe(false)
  })

  it('23. egress blocks loopback IPs (127.0.0.0/8 and 0.0.0.0/8)', async () => {
    const res1 = await validateEgressUrl('https://127.0.0.1/api')
    expect(res1.valid).toBe(false)
    expect(res1.reason).toContain('private or reserved')

    const res2 = await validateEgressUrl('https://127.0.1.50/api')
    expect(res2.valid).toBe(false)

    expect(isPrivateOrReservedIPv4('127.0.0.1')).toBe(true)
    expect(isPrivateOrReservedIPv4('0.0.0.0')).toBe(true)
  })

  it('24. egress blocks RFC1918 private IPs (10.x, 172.16.x, 192.168.x)', async () => {
    expect(isPrivateOrReservedIPv4('10.0.0.1')).toBe(true)
    expect(isPrivateOrReservedIPv4('10.255.255.254')).toBe(true)
    expect(isPrivateOrReservedIPv4('172.16.0.1')).toBe(true)
    expect(isPrivateOrReservedIPv4('172.31.255.254')).toBe(true)
    expect(isPrivateOrReservedIPv4('192.168.1.1')).toBe(true)

    // Public IPs should pass check
    expect(isPrivateOrReservedIPv4('8.8.8.8')).toBe(false)
    expect(isPrivateOrReservedIPv4('1.1.1.1')).toBe(false)

    const res = await validateEgressUrl('https://192.168.0.10/webhook')
    expect(res.valid).toBe(false)
  })

  it('25. egress blocks cloud metadata IP 169.254.169.254 and link-local range', async () => {
    expect(isPrivateOrReservedIPv4('169.254.169.254')).toBe(true)
    expect(isPrivateOrReservedIPv4('169.254.1.1')).toBe(true)

    const res = await validateEgressUrl('https://169.254.169.254/latest/meta-data')
    expect(res.valid).toBe(false)
    expect(res.reason).toContain('private or reserved')
  })

  it('26. egress blocks IPv6 private and loopback ranges (::1, fc00::, fe80::)', async () => {
    expect(isPrivateOrReservedIPv6('::1')).toBe(true)
    expect(isPrivateOrReservedIPv6('fc00::1')).toBe(true)
    expect(isPrivateOrReservedIPv6('fd12:3456:789a::1')).toBe(true)
    expect(isPrivateOrReservedIPv6('fe80::1')).toBe(true)

    // Public IPv6
    expect(isPrivateOrReservedIPv6('2607:f8b0:4005:805::200e')).toBe(false)

    const res = await validateEgressUrl('https://[::1]/webhook')
    expect(res.valid).toBe(false)
  })

  it('27. safeFetch rejects redirected responses to prevent redirect-based SSRF', async () => {
    // Mock global fetch to verify redirect: 'error' option
    const originalFetch = global.fetch
    let capturedOptions: any = null
    global.fetch = vi.fn().mockImplementation(async (_url, options) => {
      capturedOptions = options
      return new Response('ok', { status: 200 })
    })

    try {
      await safeFetch('https://api.example.com/webhook', {
        lookupFn: async () => ['93.184.216.34'], // example.com public IP
      })
      expect(capturedOptions.redirect).toBe('error')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('28. safeFetch enforces bounded timeout and aborts slow requests', async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockImplementation(async (_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })

    try {
      await expect(
        safeFetch('https://api.example.com/webhook', {
          timeoutMs: 500,
          lookupFn: async () => ['93.184.216.34'],
        })
      ).rejects.toThrow('timed out')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('29. safeFetch rejects SSRF target before initiating any network request', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    await expect(safeFetch('http://169.254.169.254/meta-data')).rejects.toThrow(
      EgressSecurityError
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // =========================================================================
  // 6. Factory Integration with Deterministic Lifecycle
  // =========================================================================
  it('30. factory executes deterministic lifecycle (claimed -> processing -> succeeded) while remaining simulated', async () => {
    // Add encrypted credential in CERTIFIED status
    const encryptedSecret = encryptSecret(
      JSON.stringify({
        accessToken: 'EAAG_test_token_12345',
        fromPhoneNumberId: validPhoneId,
      }),
      { customMasterKey: TEST_MASTER_KEY }
    )

    credStore.addCredential({
      id: 'cred-wa-e1',
      client_id: clientId,
      deployment_id: deploymentId,
      provider: 'meta_whatsapp',
      credential_type: 'whatsapp_business_account',
      encrypted_secret: encryptedSecret,
      key_version: 1,
      metadata: { phone_number_id: validPhoneId, status: 'active' },
      status: 'active',
      certification_status: 'CERTIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const adapters = resolveExternalAdapters({
      clientId,
      deploymentId,
      deploymentStatus: 'active',
      executionMode: 'live',
      phoneNumberId: validPhoneId,
    })

    const ctx = makeContext()
    const res = await adapters.dispatchWhatsAppTemplate!(
      { recipient: '+1234567890' },
      ctx
    )

    // Factory remains strictly simulated
    expect(res.status).toBe('simulated')
    expect(res.detail).toContain('[SIMULATED]')

    // Verify durable operation completed through claimed -> processing -> succeeded
    const record = await idempStore.findByKey(ctx.idempotencyKey)
    expect(record).not.toBeNull()
    expect(record?.status).toBe('succeeded')
    expect(record?.provider_operation_id).toBeDefined()
    expect(record?.result_payload.simulated).toBe(true)
    expect(record?.result_payload.gateAllowed).toBe(false) // ENABLE_LIVE_EXTERNAL_ADAPTERS is off!
  })
})
