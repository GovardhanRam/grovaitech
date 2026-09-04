/**
 * Grovaitech AI Platform
 * tests/unit/phase-5t-e2-whatsapp-provider.test.ts
 *
 * Phase 5T-E2: Tenant-Safe WhatsApp Provider Execution Test Suite.
 *
 * Validates the 35 required security boundaries and invariants:
 * 1. Tenant credential resolution
 * 2. Exact client/deployment/provider binding
 * 3. Global env token rejected
 * 4. Uncertified credential blocked
 * 5. Expired credential blocked
 * 6. Inactive deployment blocked
 * 7. Paused deployment blocked
 * 8. Suspended deployment blocked
 * 9. Model cannot spoof clientId
 * 10. Model cannot spoof deploymentId
 * 11. Model cannot spoof phone_number_id
 * 12. Customer phone never becomes phone_number_id
 * 13. Deterministic businessOperationId
 * 14. Deterministic idempotency key
 * 15. First claim obtains permission
 * 16. Duplicate succeeded operation produces cached replay
 * 17. Processing operation prevents duplicate dispatch
 * 18. Unknown operation prevents automatic retry
 * 19. Payload mismatch is rejected
 * 20. Meta success normalizes correctly
 * 21. Meta auth failure normalizes correctly
 * 22. Meta permission failure normalizes correctly
 * 23. Meta invalid parameter normalizes correctly
 * 24. Invalid recipient normalizes correctly
 * 25. Customer window failure normalizes correctly
 * 26. Rate limit normalizes correctly
 * 27. Meta 5xx normalizes correctly
 * 28. Timeout/connection ambiguity becomes unknown
 * 29. Raw Meta response is never returned
 * 30. Secret/token never appears in result
 * 31. safeFetch is always used
 * 32. Redirect/private-IP attempt is rejected
 * 33. No real Meta call occurs during tests
 * 34. Sandbox remains simulated
 * 35. Production live gate remains disabled
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  normalizeMetaError,
  getMetaGraphApiVersion,
  isWhatsAppConfigured,
  type MetaWhatsAppCredentials,
} from '@/lib/whatsapp/client'
import {
  dispatchTenantWhatsAppTextMessage,
  dispatchTenantWhatsAppTemplateMessage,
} from '@/lib/integrations/whatsapp-adapter'
import {
  MemoryCredentialStore,
  setCredentialStore,
} from '@/lib/integrations/credentials'
import {
  MemoryIdempotencyStore,
  setIdempotencyStore,
  IdempotencyPayloadMismatchError,
} from '@/lib/integrations/idempotency'
import { encryptSecret } from '@/lib/integrations/crypto'
import { generateOperationIdempotencyKey } from '@/lib/integrations/types'
import * as egressModule from '@/lib/integrations/egress'

describe('Phase 5T-E2: Tenant-Safe WhatsApp Provider Execution', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  let credStore: MemoryCredentialStore
  let idempStore: MemoryIdempotencyStore

  const testClientId = 'client-meta-001'
  const testDeploymentId = 'dep-meta-001'
  const testPhoneNumberId = '109988776655443'
  const testCustomerPhone = '+91 98765-43210'
  const testCleanCustomerPhone = '919876543210'
  const testInboundMessageId = 'wamid.HBgLMTIzNDU2Nzg5MA=='
  const testToken = 'EAABtesting_token_secret_meta_whatsapp_9988'

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS
    delete process.env.WHATSAPP_ACCESS_TOKEN
    delete process.env.META_WHATSAPP_TOKEN
    delete process.env.WHATSAPP_PHONE_NUMBER_ID
    delete process.env.META_PHONE_NUMBER_ID

    credStore = new MemoryCredentialStore()
    setCredentialStore(credStore)

    idempStore = new MemoryIdempotencyStore()
    setIdempotencyStore(idempStore)

    // Provision valid active deployment
    credStore.addDeployment({
      id: testDeploymentId,
      client_id: testClientId,
      status: 'active',
      runtime_config: {
        operating_parameters: {
          whatsapp_phone_number_id: testPhoneNumberId,
        },
      },
    })

    // Provision valid certified credential
    credStore.addCredential({
      id: 'cred-meta-001',
      client_id: testClientId,
      deployment_id: testDeploymentId,
      provider: 'meta_whatsapp',
      credential_type: 'system_user_token',
      encrypted_secret: encryptSecret(JSON.stringify({ accessToken: testToken })),
      key_version: 1,
      metadata: {
        phone_number_id: testPhoneNumberId,
        waba_id: 'waba-123456789',
      },
      status: 'active',
      certification_status: 'CERTIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: null,
      last_verified_at: new Date().toISOString(),
    })
  })

  afterEach(() => {
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS
    delete process.env.META_GRAPH_API_VERSION
    vi.restoreAllMocks()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Tenant Credential Resolution
  // ───────────────────────────────────────────────────────────────────────────
  it('1. resolves tenant credential strictly from credential store', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.outbound-001' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Hello, your appointment is confirmed.',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('succeeded')
    expect(result.providerOperationId).toBe('wamid.outbound-001')
    expect(safeFetchSpy).toHaveBeenCalledTimes(1)

    // Verify token used in safeFetch Authorization header matches decrypted secret
    const fetchArgs = safeFetchSpy.mock.calls[0]
    expect(fetchArgs[1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: `Bearer ${testToken}`,
      })
    )
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Exact Client / Deployment / Provider Binding
  // ───────────────────────────────────────────────────────────────────────────
  it('2. rejects dispatch when client_id does not match deployment client_id', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: 'client-attacker-spoof',
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Spoofed attempt',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('TENANT_MISMATCH')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Global Env Token Rejected in Live Mode
  // ───────────────────────────────────────────────────────────────────────────
  it('3. rejects dispatch when global env token is present but tenant credential is missing', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'
    process.env.WHATSAPP_ACCESS_TOKEN = 'global_env_secret_token_1234567890'

    // Deployment with no credential record
    credStore.addDeployment({
      id: 'dep-no-creds',
      client_id: 'client-no-creds',
      status: 'active',
      runtime_config: { operating_parameters: { whatsapp_phone_number_id: '999888' } },
    })

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: 'client-no-creds',
      deploymentId: 'dep-no-creds',
      to: testCustomerPhone,
      text: 'Should not use global token',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('LIVE_EXECUTION_BLOCKED')
    expect(result.safeMessage).toContain('Live execution rejected')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Uncertified Credential Blocked
  // ───────────────────────────────────────────────────────────────────────────
  it('4. blocks live execution when certification status is CONFIGURED instead of CERTIFIED', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    // Overwrite credential with CONFIGURED
    credStore.addCredential({
      id: 'cred-meta-001',
      client_id: testClientId,
      deployment_id: testDeploymentId,
      provider: 'meta_whatsapp',
      credential_type: 'system_user_token',
      encrypted_secret: encryptSecret(JSON.stringify({ accessToken: testToken })),
      key_version: 1,
      metadata: { phone_number_id: testPhoneNumberId },
      status: 'active',
      certification_status: 'CONFIGURED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Uncertified dispatch',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('LIVE_EXECUTION_BLOCKED')
    expect(result.safeMessage).toContain('CERTIFIED')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Expired Credential Blocked
  // ───────────────────────────────────────────────────────────────────────────
  it('5. blocks live execution when credential has expired', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    credStore.addCredential({
      id: 'cred-meta-001',
      client_id: testClientId,
      deployment_id: testDeploymentId,
      provider: 'meta_whatsapp',
      credential_type: 'system_user_token',
      encrypted_secret: encryptSecret(JSON.stringify({ accessToken: testToken })),
      key_version: 1,
      metadata: { phone_number_id: testPhoneNumberId },
      status: 'active',
      certification_status: 'CERTIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
    })

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Expired dispatch',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('LIVE_EXECUTION_BLOCKED')
    expect(result.safeMessage?.toLowerCase()).toContain('expired')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 6, 7, 8. Inactive, Paused, Suspended Deployment Blocked
  // ───────────────────────────────────────────────────────────────────────────
  it('6. blocks dispatch when deployment status is inactive', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    credStore.addDeployment({
      id: testDeploymentId,
      client_id: testClientId,
      status: 'inactive',
    })

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Inactive test',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('DEPLOYMENT_INACTIVE')
  })

  it('7. blocks dispatch when deployment status is paused', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    credStore.addDeployment({
      id: testDeploymentId,
      client_id: testClientId,
      status: 'paused',
    })

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Paused test',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('DEPLOYMENT_INACTIVE')
  })

  it('8. blocks dispatch when deployment status is suspended', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    credStore.addDeployment({
      id: testDeploymentId,
      client_id: testClientId,
      status: 'suspended',
    })

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Suspended test',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('DEPLOYMENT_INACTIVE')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 9, 10, 11. Model Cannot Spoof Identity Parameters
  // ───────────────────────────────────────────────────────────────────────────
  it('9. model/caller cannot spoof clientId to access foreign deployment', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: 'foreign-tenant-victim',
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Cross tenant attack',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('TENANT_MISMATCH')
  })

  it('10. non-existent deploymentId fails closed immediately', async () => {
    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: 'non-existent-dep-id',
      to: testCustomerPhone,
      text: 'Invalid deployment',
      inboundMessageId: testInboundMessageId,
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('DEPLOYMENT_NOT_FOUND')
  })

  it('11. sender phone_number_id is strictly derived from deployment and verified against credential', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.outbound-phone-check' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Phone binding check',
      inboundMessageId: testInboundMessageId,
    })

    expect(safeFetchSpy).toHaveBeenCalledTimes(1)
    const targetUrl = safeFetchSpy.mock.calls[0][0]
    // Verifies path contains the server-verified testPhoneNumberId, NOT a caller override
    expect(targetUrl).toContain(`/${testPhoneNumberId}/messages`)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 12. Customer Phone Never Becomes phone_number_id
  // ───────────────────────────────────────────────────────────────────────────
  it('12. verifies customer phone number is placed strictly in payload body "to" and never in URL path', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.outbound-cust-check' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: '+91-98765-43210',
      text: 'Recipient isolation check',
      inboundMessageId: testInboundMessageId,
    })

    const targetUrl = safeFetchSpy.mock.calls[0][0]
    const requestOptions = safeFetchSpy.mock.calls[0][1]
    const parsedBody = JSON.parse(requestOptions?.body as string)

    expect(targetUrl).not.toContain('9876543210')
    expect(targetUrl).toContain(testPhoneNumberId)
    expect(parsedBody.to).toBe('919876543210')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 13 & 14. Deterministic businessOperationId and Idempotency Key
  // ───────────────────────────────────────────────────────────────────────────
  it('13. constructs deterministic businessOperationId from deploymentId and inboundMessageId', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.outbound-idemp' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Deterministic key test',
      inboundMessageId: testInboundMessageId,
    })

    const expectedBizOpId = `wa_reply_${testDeploymentId}_${testInboundMessageId}`
    const expectedKey = generateOperationIdempotencyKey({
      businessOperationId: expectedBizOpId,
      workflowStepId: 'whatsapp_turn_reply',
      operationName: 'meta_whatsapp_send_text',
      entityId: testCleanCustomerPhone,
      discriminator: `inbound_${testInboundMessageId}`,
    })

    const record = await idempStore.findByKey(expectedKey)
    expect(record).not.toBeNull()
    expect(record?.business_operation_id).toBe(expectedBizOpId)
    expect(record?.status).toBe('succeeded')
  })

  it('14. produces identical idempotency key across independent turn invocations for the same inbound message', () => {
    const key1 = generateOperationIdempotencyKey({
      businessOperationId: `wa_reply_${testDeploymentId}_${testInboundMessageId}`,
      workflowStepId: 'whatsapp_turn_reply',
      operationName: 'meta_whatsapp_send_text',
      entityId: testCleanCustomerPhone,
      discriminator: `inbound_${testInboundMessageId}`,
    })

    const key2 = generateOperationIdempotencyKey({
      businessOperationId: `wa_reply_${testDeploymentId}_${testInboundMessageId}`,
      workflowStepId: 'whatsapp_turn_reply',
      operationName: 'meta_whatsapp_send_text',
      entityId: testCleanCustomerPhone,
      discriminator: `inbound_${testInboundMessageId}`,
    })

    expect(key1).toBe(key2)
    expect(key1.startsWith('idemp_meta_whatsapp_send_text_')).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 15. First Claim Obtains Permission
  // ───────────────────────────────────────────────────────────────────────────
  it('15. grants execution permission to first claim and updates status to succeeded', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.first-claim' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'First claim test',
      inboundMessageId: 'inbound-first-claim',
    })

    expect(result.status).toBe('succeeded')
    expect(result.providerOperationId).toBe('wamid.first-claim')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 16. Duplicate Succeeded Operation Produces Cached Replay
  // ───────────────────────────────────────────────────────────────────────────
  it('16. replays cached result on duplicate delivery without secondary Meta call', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.cached-replay-test' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    // First attempt: executes live call
    const res1 = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Duplicate delivery test',
      inboundMessageId: 'inbound-dup-test',
    })

    expect(res1.status).toBe('succeeded')
    expect(res1.providerOperationId).toBe('wamid.cached-replay-test')
    expect(safeFetchSpy).toHaveBeenCalledTimes(1)

    // Second attempt (e.g. Meta webhook retry): must return cached replay
    const res2 = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Duplicate delivery test',
      inboundMessageId: 'inbound-dup-test',
    })

    expect(res2.status).toBe('succeeded')
    expect(res2.providerOperationId).toBe('wamid.cached-replay-test')
    expect(res2.safeMessage).toContain('cached')
    // Crucial: safeFetch was NOT called again!
    expect(safeFetchSpy).toHaveBeenCalledTimes(1)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 17. Processing Operation Prevents Duplicate Dispatch
  // ───────────────────────────────────────────────────────────────────────────
  it('17. prevents second dispatch when an operation is currently in-flight / processing', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockImplementation(async () => {
      // Artificially simulate concurrent second caller during slow network call
      const concurrentRes = await dispatchTenantWhatsAppTextMessage({
        clientId: testClientId,
        deploymentId: testDeploymentId,
        to: testCustomerPhone,
        text: 'Concurrent message',
        inboundMessageId: 'inbound-concurrent-test',
      })

      expect(concurrentRes.safeMessage).toContain('in-flight')

      return {
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.concurrent-done' }] }),
      } as any
    })

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    const res1 = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Concurrent message',
      inboundMessageId: 'inbound-concurrent-test',
    })

    expect(res1.status).toBe('succeeded')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 18. Unknown Operation Prevents Automatic Retry
  // ───────────────────────────────────────────────────────────────────────────
  it('18. blocks automatic retry and returns unknown when prior attempt resulted in unknown status', async () => {
    let callCount = 0
    vi.spyOn(egressModule, 'safeFetch').mockImplementation(async () => {
      callCount++
      const timeoutErr: any = new Error('Egress request timed out after 8000ms')
      timeoutErr.name = 'AbortError'
      throw timeoutErr
    })

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    // First attempt: times out after dispatch -> transitions to 'unknown'
    const res1 = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Timeout message',
      inboundMessageId: 'inbound-timeout-test',
    })

    expect(res1.status).toBe('unknown')
    expect(res1.errorCode).toBe('PROVIDER_TIMEOUT_OR_DISCONNECT')
    expect(callCount).toBe(1)

    // Second attempt (webhook retry): must be blocked due to unknown prior status
    const res2 = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Timeout message',
      inboundMessageId: 'inbound-timeout-test',
    })

    expect(res2.status).toBe('unknown')
    expect(res2.errorCode).toBe('RECONCILIATION_REQUIRED')
    expect(res2.safeMessage).toContain('unknown state')
    // No second network request made!
    expect(callCount).toBe(1)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 19. Payload Mismatch is Rejected
  // ───────────────────────────────────────────────────────────────────────────
  it('19. rejects duplicate claim when request payload text has been tampered/mutated', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.tamper-test' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Original message text',
      inboundMessageId: 'inbound-tamper-test',
    })

    // Retry with exact same messageId but altered text
    await expect(
      dispatchTenantWhatsAppTextMessage({
        clientId: testClientId,
        deploymentId: testDeploymentId,
        to: testCustomerPhone,
        text: 'Mutated message text',
        inboundMessageId: 'inbound-tamper-test',
      })
    ).rejects.toThrow(IdempotencyPayloadMismatchError)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 20. Meta Success Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('20. normalizes successful Meta 200 response into ProviderExecutionResult', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        messaging_product: 'whatsapp',
        contacts: [{ input: '919876543210', wa_id: '919876543210' }],
        messages: [{ id: 'wamid.HBgLMTIzNDU2' }],
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('succeeded')
    expect(result.provider).toBe('meta_whatsapp')
    expect(result.providerOperationId).toBe('wamid.HBgLMTIzNDU2')
    expect(result.safeMessage).toBe('WhatsApp text message successfully delivered to provider.')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 21. Meta Auth Failure Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('21. normalizes Meta 401 / OAuth error into AUTH_INVALID_TOKEN', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: 'Invalid OAuth access token.',
          type: 'OAuthException',
          code: 190,
          fbtrace_id: 'AQb0Y',
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: 'invalid_expired_oauth_token_12345',
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('AUTH_INVALID_TOKEN')
    expect(result.retryable).toBe(false)
    expect(result.safeMessage).toContain('authentication failed')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 22. Meta Permission Failure Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('22. normalizes Meta 403 permission failure into PERMISSION_DENIED', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          message: 'Permission denied to access this WABA.',
          type: 'OAuthException',
          code: 200,
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('PERMISSION_DENIED')
    expect(result.retryable).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 23. Meta Invalid Parameter Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('23. normalizes Meta 400 parameter failure into INVALID_PARAMETER', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Parameter value is invalid.',
          type: 'OAuthException',
          code: 100,
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('INVALID_PARAMETER')
    expect(result.retryable).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 24. Invalid Recipient Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('24. normalizes Meta code 131026 into INVALID_RECIPIENT', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Message undeliverable.',
          code: 131026,
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('INVALID_RECIPIENT')
    expect(result.retryable).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 25. Customer Window Failure Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('25. normalizes Meta code 131047 into CUSTOMER_WINDOW_EXPIRED', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Customer re-engagement window expired.',
          code: 131047,
          error_subcode: 2494010,
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('CUSTOMER_WINDOW_EXPIRED')
    expect(result.retryable).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 26. Rate Limit Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('26. normalizes Meta code 80007 into RATE_LIMIT_EXCEEDED with retryable true', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          message: 'Rate limit hit.',
          code: 80007,
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED')
    expect(result.retryable).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 27. Meta 5xx Normalization
  // ───────────────────────────────────────────────────────────────────────────
  it('27. normalizes Meta HTTP 500 error into META_SERVICE_UNAVAILABLE with retryable true', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: { message: 'Internal server error.' },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('META_SERVICE_UNAVAILABLE')
    expect(result.retryable).toBe(true)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 28. Timeout / Connection Ambiguity Becomes Unknown
  // ───────────────────────────────────────────────────────────────────────────
  it('28. timeout after dispatch normalizes to unknown status', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockImplementation(async () => {
      const abortErr: any = new Error('Egress request timed out after 8000ms')
      abortErr.name = 'AbortError'
      throw abortErr
    })

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('unknown')
    expect(result.errorCode).toBe('PROVIDER_TIMEOUT_OR_DISCONNECT')
    expect(result.retryable).toBe(false)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 29 & 30. Zero Raw Meta Response or Secret Leaked
  // ───────────────────────────────────────────────────────────────────────────
  it('29. ensures raw Meta error response envelope is never returned in result', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Internal Meta diagnostic string',
          fbtrace_id: 'secret_trace_ABC123',
          type: 'OAuthException',
          code: 100,
        },
      }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('secret_trace_ABC123')
    expect(serialized).not.toContain('fbtrace_id')
    expect(result.safeMessage).toBe('Meta WhatsApp request rejected due to invalid parameters.')
  })

  it('30. ensures access token never appears anywhere in the ProviderExecutionResult', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.9988' }] }),
    } as any)

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'Test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain(testToken)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 31. safeFetch is Always Used
  // ───────────────────────────────────────────────────────────────────────────
  it('31. dispatches exclusively through safeFetch egress wrapper', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.safefetch-check' }] }),
    } as any)

    await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'SafeFetch verify',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(safeFetchSpy).toHaveBeenCalledTimes(1)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 32. Redirect / Private IP Egress Violation Rejected
  // ───────────────────────────────────────────────────────────────────────────
  it('32. catches and normalizes EgressSecurityError when egress guard triggers', async () => {
    vi.spyOn(egressModule, 'safeFetch').mockRejectedValue(
      new egressModule.EgressSecurityError('Egress blocked: Restricted private IPv4')
    )

    const result = await sendWhatsAppTextMessage({
      to: testCustomerPhone,
      text: 'SSRF test',
      credentials: {
        accessToken: testToken,
        fromPhoneNumberId: testPhoneNumberId,
      },
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('EGRESS_SECURITY_VIOLATION')
    expect(result.safeMessage).toContain('Egress security violation')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 33. No Real Meta Call Occurs During Tests
  // ───────────────────────────────────────────────────────────────────────────
  it('33. verifies safeFetch mock intercepts any external HTTP invocation', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.intercepted' }] }),
    } as any)

    process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS = 'true'

    await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Intercepted call',
      inboundMessageId: 'inbound-intercept-001',
    })

    expect(safeFetchSpy).toHaveBeenCalledTimes(1)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 34. Sandbox Mode Remains Simulated
  // ───────────────────────────────────────────────────────────────────────────
  it('34. sandbox execution mode deterministically simulates without live egress', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch')

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Sandbox test message',
      inboundMessageId: 'inbound-sandbox-001',
      executionMode: 'sandbox',
    })

    expect(result.status).toBe('simulated')
    expect(result.providerOperationId?.startsWith('sim-wa-')).toBe(true)
    // safeFetch MUST NOT be called in sandbox mode
    expect(safeFetchSpy).not.toHaveBeenCalled()
  })

  // ───────────────────────────────────────────────────────────────────────────
  // 35. Production Live Gate Remains Disabled
  // ───────────────────────────────────────────────────────────────────────────
  it('35. live execution is blocked when ENABLE_LIVE_EXTERNAL_ADAPTERS is not true', async () => {
    const safeFetchSpy = vi.spyOn(egressModule, 'safeFetch')
    delete process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS

    const result = await dispatchTenantWhatsAppTextMessage({
      clientId: testClientId,
      deploymentId: testDeploymentId,
      to: testCustomerPhone,
      text: 'Live disabled test',
      inboundMessageId: 'inbound-live-gate-001',
      executionMode: 'live',
    })

    expect(result.status).toBe('failed')
    expect(result.errorCode).toBe('LIVE_EXECUTION_BLOCKED')
    expect(result.safeMessage).toContain('ENABLE_LIVE_EXTERNAL_ADAPTERS !== true')
    expect(safeFetchSpy).not.toHaveBeenCalled()
  })
})
