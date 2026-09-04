/**
 * Grovaitech AI Platform
 * tests/unit/phase-5t-c5-certification-integration.test.ts
 *
 * Phase 5T-C5: Tenant Credential Certification Integration & Concurrency Guard Suite.
 * Validates the interaction between Phase 5T-C4 onboarding and Phase 5T-C3 certification,
 * proving optimistic concurrency guards, race condition immunity, tenant isolation,
 * and persistent adapter factory simulation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  onboardCredential,
  rotateCredential,
  revokeCredential,
  getSafeCredentialStatus,
} from '@/lib/integrations/onboarding'
import {
  certifyIntegration,
  type ProviderVerifier,
} from '@/lib/integrations/certification'
import {
  MemoryCredentialStore,
  setCredentialStore,
  resolveIntegrationCredential,
} from '@/lib/integrations/credentials'
import { resolveExternalAdapters } from '@/lib/integrations/factory'
import type { ExternalAdapterContext } from '@/lib/integrations/types'

describe('Phase 5T-C5: Tenant Credential Certification Integration & Concurrency Guards', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  let memoryStore: MemoryCredentialStore

  const clientId = 'client-c5-01'
  const deploymentId = 'dep-c5-01'
  const validPhoneId = '109988776655443'
  const validWabaId = 'waba_c5_998877'

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    memoryStore = new MemoryCredentialStore()
    setCredentialStore(memoryStore)

    // Base active deployment
    memoryStore.addDeployment({
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

  // 1. C4 Onboard -> CONFIGURED
  it('1. C4 onboard creates active credential in CONFIGURED certification status', async () => {
    const onboardRes = await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_c5_test_1',
        phoneNumberId: validPhoneId,
        wabaId: validWabaId,
      },
      customStore: memoryStore,
    })

    expect(onboardRes.success).toBe(true)
    expect(onboardRes.data?.status).toBe('active')
    expect(onboardRes.data?.certificationStatus).toBe('CONFIGURED')
    expect(onboardRes.data?.lastVerifiedAt).toBeNull()

    const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
    expect(stored).toBeDefined()
    expect(stored?.certification_status).toBe('CONFIGURED')
    expect(stored?.last_verified_at).toBeNull()
  })

  // 2. C3 Certification -> CERTIFIED
  it('2. C3 certification verifies CONFIGURED credential and transitions to CERTIFIED', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_c5_test_2',
        phoneNumberId: validPhoneId,
        wabaId: validWabaId,
      },
      customStore: memoryStore,
    })

    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(true)
    expect(certRes.status).toBe('CERTIFIED')
    expect(certRes.verifiedAt).toBeDefined()

    const safeStatus = await getSafeCredentialStatus({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })
    expect(safeStatus.certificationStatus).toBe('CERTIFIED')
    expect(safeStatus.lastVerifiedAt).not.toBeNull()
  })

  // 3. Certification updates exact credential
  it('3. certification updates exact credential record and records non-secret audit evidence', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'google_calendar',
      credentials: {
        calendarId: 'team@grovaitech.com',
        accessToken: 'ya29.calendar_token_123',
      },
      customStore: memoryStore,
    })

    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'google_calendar',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(true)
    const stored = await memoryStore.findCredential(clientId, deploymentId, 'google_calendar')
    expect(stored?.certification_status).toBe('CERTIFIED')
    expect(stored?.metadata?.certification_audit).toBeDefined()
    expect(stored?.metadata?.certification_audit?.passed).toBe(true)
    expect(stored?.metadata?.certification_audit?.calendarId).toBe('team@grovaitech.com')
  })

  // 4. Wrong client rejected
  it('4. wrong client is rejected with tenant mismatch', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_123',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    const certRes = await certifyIntegration({
      clientId: 'attacker-client-id',
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('ERROR')
    expect(certRes.error).toContain('Tenant mismatch')
  })

  // 5. Wrong deployment rejected
  it('5. non-existent deployment is rejected as NOT_CONFIGURED', async () => {
    const certRes = await certifyIntegration({
      clientId,
      deploymentId: 'non-existent-dep',
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('NOT_CONFIGURED')
    expect(certRes.error).toContain('was not found')
  })

  // 6. Wrong provider rejected
  it('6. wrong or unsupported provider is rejected with ERROR', async () => {
    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'unsupported_provider' as any,
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('ERROR')
    expect(certRes.error).toContain('Unsupported provider')
  })

  // 7. Revoked credential rejected
  it('7. revoked credential is rejected and cannot be certified', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_123',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    await revokeCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('REVOKED')
    expect(certRes.error).toContain('has been revoked')
  })

  // 8. Expired credential rejected
  it('8. expired credential is rejected and marked EXPIRED', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_123',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    // Artificially backdate expiry
    const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
    await memoryStore.saveCredential({
      ...stored!,
      expires_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    })

    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('EXPIRED')
    expect(certRes.error).toContain('expired at')
  })

  // 9. Paused deployment rejected
  it('9. paused deployment is rejected with RESTRICTED status', async () => {
    memoryStore.addDeployment({
      id: 'dep-paused',
      client_id: clientId,
      status: 'paused',
    })

    const certRes = await certifyIntegration({
      clientId,
      deploymentId: 'dep-paused',
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('RESTRICTED')
    expect(certRes.error).toContain('Must be "active"')
  })

  // 10. Rotation resets certification
  it('10. credential rotation resets certificationStatus to CONFIGURED and clears lastVerifiedAt', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_v1',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    let status = await getSafeCredentialStatus({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })
    expect(status.certificationStatus).toBe('CERTIFIED')

    // Rotate credential
    await rotateCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_v2',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    status = await getSafeCredentialStatus({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })
    expect(status.certificationStatus).toBe('CONFIGURED')
    expect(status.lastVerifiedAt).toBeNull()
  })

  // 11. Rotate-during-certification race guard
  it('11. rotate-during-certification aborts stale certification update and protects new CONFIGURED credential', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_v1',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    // Custom verifier simulating concurrent rotation while verification is running
    const raceVerifier: ProviderVerifier = async () => {
      // Rotate the credential concurrently during verification
      await rotateCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_v2_rotated',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      return {
        success: true,
        auditDetails: { check: 'slow_verification', passed: true },
      }
    }

    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customVerifier: raceVerifier,
      customStore: memoryStore,
    })

    // Stale certification must fail closed
    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('ERROR')
    expect(certRes.error).toContain('Certification aborted: Credential was rotated or modified concurrently.')

    // Verify stored credential remains CONFIGURED and was not erroneously marked CERTIFIED
    const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
    expect(stored?.certification_status).toBe('CONFIGURED')
    expect(stored?.last_verified_at).toBeNull()
  })

  // 12. Revoke-during-certification race guard
  it('12. revoke-during-certification aborts certification update and preserves REVOKED state', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_v1',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    // Custom verifier simulating concurrent revocation while verification is running
    const raceVerifier: ProviderVerifier = async () => {
      await revokeCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      return {
        success: true,
        auditDetails: { check: 'slow_verification', passed: true },
      }
    }

    const certRes = await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customVerifier: raceVerifier,
      customStore: memoryStore,
    })

    expect(certRes.success).toBe(false)
    expect(certRes.status).toBe('ERROR')
    expect(certRes.error).toContain('Certification aborted: Credential was rotated or modified concurrently.')

    const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
    expect(stored?.status).toBe('revoked')
    expect(stored?.certification_status).toBe('REVOKED')
  })

  // 13. Concurrent certification on unchanged credential remains safe
  it('13. concurrent certification runs on unchanged credential remain idempotent and safe', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_concurrent',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    // Run two certification requests in parallel
    const [res1, res2] = await Promise.all([
      certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      }),
      certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      }),
    ])

    // At least one succeeds; both complete with deterministic status
    expect(res1.success || res2.success).toBe(true)
    const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
    expect(stored?.certification_status).toBe('CERTIFIED')
  })

  // 14. Stale expectedUpdatedAt prevents certification overwrite
  it('14. stale expectedUpdatedAt guard explicitly rejects mutation in store', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'n8n',
      credentials: {
        webhookUrl: 'https://n8n.example.com/webhook',
        signingSecret: 'secret_n8n_key_123',
      },
      customStore: memoryStore,
    })

    const initial = await memoryStore.findCredential(clientId, deploymentId, 'n8n')
    expect(initial).toBeDefined()

    // Call updateCertificationStatus with wrong expectedUpdatedAt
    const success = await memoryStore.updateCertificationStatus(
      clientId,
      deploymentId,
      'n8n',
      {
        certification_status: 'CERTIFIED',
        last_verified_at: new Date().toISOString(),
      },
      {
        expectedCredentialId: initial!.id,
        expectedUpdatedAt: '1970-01-01T00:00:00.000Z', // Stale timestamp
      }
    )

    expect(success).toBe(false)
    const stored = await memoryStore.findCredential(clientId, deploymentId, 'n8n')
    expect(stored?.certification_status).toBe('CONFIGURED')
  })

  // 15. Adapter factory still returns simulated behavior even for CERTIFIED credential
  it('15. adapter factory still returns simulated execution even when credential is CERTIFIED', async () => {
    await onboardCredential({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      credentials: {
        accessToken: 'EAAB_token_certified',
        phoneNumberId: validPhoneId,
      },
      customStore: memoryStore,
    })

    await certifyIntegration({
      clientId,
      deploymentId,
      provider: 'meta_whatsapp',
      customStore: memoryStore,
    })

    const adapters = resolveExternalAdapters({
      clientId,
      deploymentId,
      deploymentStatus: 'active',
      executionMode: 'live',
      phoneNumberId: validPhoneId,
    })

    const mockCtx: ExternalAdapterContext = {
      clientId,
      deploymentId,
      businessOperationId: 'biz-op-c5-test',
      workflowExecutionId: 'wf-exec-c5-test',
      workflowStepId: 'step-1',
      idempotencyKey: 'idemp-key-c5-1',
      executionMode: 'live',
      channel: 'whatsapp',
      timestamp: new Date().toISOString(),
    }

    // Outbound template call
    expect(adapters.dispatchWhatsAppTemplate).toBeDefined()
    const result = await adapters.dispatchWhatsAppTemplate!(
      { recipient: '+919999988888', templateName: 'welcome_template' },
      mockCtx
    )

    // MUST remain simulated: zero live external Meta calls
    expect(result.status).toBe('simulated')
    expect(result.detail).toContain('[SIMULATED]')
    expect(result.detail).toContain('No verified live adapter is active')
  })
})
