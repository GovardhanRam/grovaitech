import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  certifyIntegration,
  defaultWhatsAppVerifier,
  defaultCalendarVerifier,
  defaultN8nVerifier,
} from '@/lib/integrations/certification'
import {
  MemoryCredentialStore,
  setCredentialStore,
} from '@/lib/integrations/credentials'
import { encryptSecret } from '@/lib/integrations/crypto'
import { resolveExternalAdapters } from '@/lib/integrations/factory'
import type { IntegrationCredentialRecord, ExternalAdapterContext } from '@/lib/integrations/types'

describe('Phase 5T-C3: Provider Certification Boundary', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  let memoryStore: MemoryCredentialStore

  const clientId = 'client-certified-01'
  const deploymentId = 'dep-certified-01'
  const validPhoneId = '109988776655443'

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    memoryStore = new MemoryCredentialStore()
    setCredentialStore(memoryStore)

    // Setup active deployment with bound whatsapp_phone_number_id
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

  // ── 1. Tenant Lifecycle & Input Boundary Checks ──────────────────────────────
  describe('Tenant Lifecycle & Input Bounds', () => {
    it('1. unconfigured credential cannot certify', async () => {
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('NOT_CONFIGURED')
      expect(result.error).toContain('No credential record found')
    })

    it('2. wrong tenant cannot certify (client mismatch)', async () => {
      memoryStore.addCredential({
        id: 'cred-wa-1',
        client_id: 'client-other',
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId: 'client-attacker',
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('Tenant mismatch')
    })

    it('3. wrong deployment cannot certify (credential belongs to different deployment)', async () => {
      memoryStore.addDeployment({
        id: 'dep-second-02',
        client_id: clientId,
        status: 'active',
      })

      // Credential exists for dep-certified-01, but we attempt to certify dep-second-02
      memoryStore.addCredential({
        id: 'cred-wa-1',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId: 'dep-second-02',
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('NOT_CONFIGURED')
    })

    it('4. inactive deployment cannot certify', async () => {
      memoryStore.addDeployment({
        id: 'dep-inactive',
        client_id: clientId,
        status: 'inactive',
      })

      memoryStore.addCredential({
        id: 'cred-wa-inact',
        client_id: clientId,
        deployment_id: 'dep-inactive',
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId: 'dep-inactive',
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('RESTRICTED')
      expect(result.error).toContain('Must be "active"')
    })

    it('5. paused deployment cannot certify', async () => {
      memoryStore.addDeployment({
        id: 'dep-paused',
        client_id: clientId,
        status: 'paused',
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId: 'dep-paused',
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('RESTRICTED')
      expect(result.error).toContain('Must be "active"')
    })

    it('6. suspended deployment cannot certify', async () => {
      memoryStore.addDeployment({
        id: 'dep-suspended',
        client_id: clientId,
        status: 'suspended',
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId: 'dep-suspended',
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('RESTRICTED')
    })

    it('21. certification cannot proceed for missing deployment', async () => {
      const result = await certifyIntegration({
        clientId,
        deploymentId: 'dep-does-not-exist',
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('NOT_CONFIGURED')
      expect(result.error).toContain('was not found')
    })

    it('22. certification provider/capability mismatch is rejected', async () => {
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'unknown_provider' as any,
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('Unsupported provider')
    })
  })

  // ── 2. Credential Status & Expiry Rejections ─────────────────────────────────
  describe('Credential Status & Expiry Gating', () => {
    it('7. revoked credential cannot certify', async () => {
      memoryStore.addCredential({
        id: 'cred-wa-revoked',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'revoked',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('REVOKED')
      expect(result.error).toContain('revoked')
    })

    it('8. expired credential cannot certify', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString()
      memoryStore.addCredential({
        id: 'cred-wa-expired',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: pastDate,
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('EXPIRED')
      expect(result.error).toContain('expired')
    })

    it('9. configured-but-uncertified credential cannot be treated as certified before certification runs', async () => {
      memoryStore.addCredential({
        id: 'cred-wa-configured',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'active',
        certification_status: 'CONFIGURED', // Not certified yet
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const recordBefore = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(recordBefore?.certification_status).toBe('CONFIGURED')

      const adapters = resolveExternalAdapters({
        clientId,
        deploymentId,
        deploymentStatus: 'active',
        executionMode: 'live',
        phoneNumberId: validPhoneId,
      })

      const ctx: ExternalAdapterContext = {
        clientId,
        deploymentId,
        businessOperationId: 'biz-1',
        workflowExecutionId: 'exec-1',
        workflowStepId: 's1',
        idempotencyKey: 'idemp-1',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const res = await adapters.dispatchWhatsAppTemplate!({ recipient: '+919999999999' }, ctx)
      expect(res.detail).toContain('[SIMULATED:uncertified]')
    })

    it('25. already-revoked certification cannot be treated as live', async () => {
      memoryStore.addCredential({
        id: 'cred-wa-rev-cert',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_123' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId },
        status: 'active',
        certification_status: 'REVOKED',
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

      const ctx: ExternalAdapterContext = {
        clientId,
        deploymentId,
        businessOperationId: 'biz-1',
        workflowExecutionId: 'exec-1',
        workflowStepId: 's1',
        idempotencyKey: 'idemp-1',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const res = await adapters.dispatchWhatsAppTemplate!({ recipient: '+919999999999' }, ctx)
      expect(res.detail).toContain('[SIMULATED:uncertified]')
    })
  })

  // ── 3. Certification Execution & Audit Verification ──────────────────────────
  describe('Safe Provider Verification & Certification State Updates', () => {
    beforeEach(() => {
      memoryStore.addCredential({
        id: 'cred-wa-valid',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_12345' })),
        key_version: 1,
        metadata: { phone_number_id: validPhoneId, waba_id: 'waba_test_999' },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })

    it('10. successful mocked provider verification produces CERTIFIED', async () => {
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('CERTIFIED')
      expect(result.verifiedAt).toBeDefined()

      // Verify that database was durably updated to CERTIFIED
      const updatedCred = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(updatedCred?.certification_status).toBe('CERTIFIED')
      expect(updatedCred?.last_verified_at).toBe(result.verifiedAt)
    })

    it('11. failed provider verification does not produce CERTIFIED and records ERROR', async () => {
      const failingVerifier = vi.fn().mockResolvedValue({
        success: false,
        auditDetails: { check: 'mock_handshake_failed' },
        error: 'Meta Graph API endpoint rejected token credentials with 401 Unauthorized.',
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customVerifier: failingVerifier,
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('rejected token credentials')

      const updatedCred = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(updatedCred?.certification_status).toBe('ERROR')
    })

    it('12. WhatsApp certification cannot send messages (read-only verification)', async () => {
      const postSpy = vi.fn()
      // Use default WhatsApp verifier
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.auditDetails?.verificationMode).toBe('read_only_metadata')
      expect(postSpy).not.toHaveBeenCalled()
    })

    it('13. Calendar certification cannot create events (read-only configuration verification)', async () => {
      memoryStore.addCredential({
        id: 'cred-cal-valid',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'ya29.valid_cal_token' })),
        key_version: 1,
        metadata: { calendar_id: 'sales@agency.com' },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('CERTIFIED')
      expect(result.auditDetails?.verificationMode).toBe('read_only_configuration')
      expect(result.auditDetails?.calendarId).toBe('sales@agency.com')
    })

    it('14. n8n certification cannot dispatch customer data', async () => {
      memoryStore.addCredential({
        id: 'cred-n8n-valid',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'n8n',
        credential_type: 'webhook_secret',
        encrypted_secret: encryptSecret(JSON.stringify({ secretKey: 'super_secret_hmac_key_123' })),
        key_version: 1,
        metadata: { webhook_url: 'https://n8n.client.com/webhook/test' },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'n8n',
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('CERTIFIED')
      expect(result.auditDetails?.hasSigningSecret).toBe(true)
    })

    it('15. decrypted credentials never appear in CertificationResult', async () => {
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      const json = JSON.stringify(result)
      expect(json).not.toContain('valid_meta_token_12345')
      expect((result as any).credentials).toBeUndefined()
    })

    it('16. caller cannot spoof tenant identity', async () => {
      const result = await certifyIntegration({
        clientId: 'spoofed-attacker-client',
        deploymentId: deploymentId, // deploymentId belongs to client-certified-01
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('Tenant mismatch')
    })

    it('17. WhatsApp phone_number_id mismatch is rejected by certification', async () => {
      // Credential has phone_number_id = 999999999999, but deployment has 109988776655443
      memoryStore.addCredential({
        id: 'cred-wa-mismatch',
        client_id: clientId,
        deployment_id: deploymentId,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_meta_token_12345' })),
        key_version: 1,
        metadata: { phone_number_id: '999999999999' },
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('ERROR')
      expect(result.error).toContain('WhatsApp phone_number_id mismatch')
    })

    it('19. certification does not activate the integration (adapter remains simulated)', async () => {
      // Run certification
      const certResult = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })
      expect(certResult.status).toBe('CERTIFIED')

      // Resolve adapters for the deployment
      const adapters = resolveExternalAdapters({
        clientId,
        deploymentId,
        deploymentStatus: 'active',
        executionMode: 'live',
        phoneNumberId: validPhoneId,
      })

      const ctx: ExternalAdapterContext = {
        clientId,
        deploymentId,
        businessOperationId: 'biz-test-op',
        workflowExecutionId: 'exec-test-attempt',
        workflowStepId: 's1',
        idempotencyKey: 'idemp_test_op_123',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      // Even when CERTIFIED, real adapter execution is disabled in foundation phase
      const adapterOutcome = await adapters.dispatchWhatsAppTemplate!({ recipient: '+919876543210' }, ctx)
      expect(adapterOutcome.status).toBe('simulated')
      expect(adapterOutcome.detail).toContain('No verified live adapter is active')
    })

    it('20. live runtime still refuses uncertified integrations', async () => {
      // Deployment without certified calendar
      const adapters = resolveExternalAdapters({
        clientId,
        deploymentId,
        deploymentStatus: 'active',
        executionMode: 'live',
      })

      const ctx: ExternalAdapterContext = {
        clientId,
        deploymentId,
        businessOperationId: 'biz-cal-op',
        workflowExecutionId: 'exec-cal-attempt',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_cal_123',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const outcome = await adapters.createCalendarEvent!({ date: 'tomorrow' }, ctx)
      expect(outcome.status).toBe('simulated')
      expect(outcome.detail).toContain('[SIMULATED:uncertified]')
    })

    it('23 & 24. successful certification records last_verified_at and audit metadata contains no secret', async () => {
      const result = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      const cred = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')

      expect(cred?.last_verified_at).toBe(result.verifiedAt)
      expect(cred?.metadata?.certification_audit).toBeDefined()
      expect(JSON.stringify(cred?.metadata?.certification_audit)).not.toContain('valid_meta_token_12345')
      expect(cred?.metadata?.certification_audit?.phoneNumberId).toBe(validPhoneId)
    })
  })
})
