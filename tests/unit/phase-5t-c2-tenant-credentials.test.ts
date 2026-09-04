import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'crypto'
import {
  encryptSecret,
  decryptSecret,
  type EncryptedEnvelope,
} from '@/lib/integrations/crypto'
import {
  resolveIntegrationCredential,
  MemoryCredentialStore,
  setCredentialStore,
  resolveWhatsAppCredentials,
} from '@/lib/integrations/credentials'
import {
  buildClientRuntimeConfig,
  sanitizeRuntimeParameters,
} from '@/lib/deployment/runtime-config'
import { resolveExternalAdapters } from '@/lib/integrations/factory'
import type { IntegrationCredentialRecord, ExternalAdapterContext } from '@/lib/integrations/types'

describe('Phase 5T-C2: Tenant Credential Foundation & Cryptographic Boundary', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' // 32-byte hex
  let memoryStore: MemoryCredentialStore

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    memoryStore = new MemoryCredentialStore()
    setCredentialStore(memoryStore)
  })

  // ── 1. Cryptographic Security (AES-256-GCM) ──────────────────────────────────
  describe('AES-256-GCM Cryptographic Boundary', () => {
    it('23. fails closed when ciphertext or auth tag is tampered', () => {
      const plaintext = 'super_secret_token_12345'
      const envelopeJson = encryptSecret(plaintext)
      const envelope: EncryptedEnvelope = JSON.parse(envelopeJson)

      // Tamper with ciphertext
      const tamperedCiphertext = envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.endsWith('00') ? '11' : '00')
      const tamperedEnvelope = JSON.stringify({ ...envelope, ciphertext: tamperedCiphertext })

      expect(() => decryptSecret(tamperedEnvelope)).toThrow(/Authentication tag validation failed/)

      // Tamper with tag
      const tamperedTag = envelope.tag.slice(0, -2) + 'ff'
      const tamperedEnvelope2 = JSON.stringify({ ...envelope, tag: tamperedTag })

      expect(() => decryptSecret(tamperedEnvelope2)).toThrow(/Authentication tag validation failed/)
    })

    it('24. fails closed when wrong master key is used for decryption', () => {
      const plaintext = 'api_key_secret_abc'
      const envelopeJson = encryptSecret(plaintext)

      const WRONG_KEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'

      expect(() =>
        decryptSecret(envelopeJson, { customMasterKey: WRONG_KEY })
      ).toThrow(/Authentication tag validation failed/)
    })

    it('25. produces different ciphertext for repeated encryptions due to random IV', () => {
      const plaintext = 'same_secret_payload'
      const enc1 = JSON.parse(encryptSecret(plaintext)) as EncryptedEnvelope
      const enc2 = JSON.parse(encryptSecret(plaintext)) as EncryptedEnvelope

      expect(enc1.iv).not.toBe(enc2.iv)
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext)
      expect(enc1.tag).not.toBe(enc2.tag)
    })

    it('26. successfully decrypts to original secret in trusted server-only context', () => {
      const rawSecret = JSON.stringify({
        accessToken: 'EAAB_test_token_123456789',
        systemUserId: 'sys_user_999',
      })
      const encrypted = encryptSecret(rawSecret)
      const decrypted = decryptSecret(encrypted)

      expect(decrypted).toBe(rawSecret)
      const parsed = JSON.parse(decrypted)
      expect(parsed.accessToken).toBe('EAAB_test_token_123456789')
    })

    it('validates 64-character hexadecimal and 32-byte UTF-8 master keys deterministically', () => {
      const plaintext = 'test_payload_deterministic_keys'

      // 1. 64-hex key (32 bytes)
      const hexKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
      const encHex = encryptSecret(plaintext, { customMasterKey: hexKey })
      const decHex = decryptSecret(encHex, { customMasterKey: hexKey })
      expect(decHex).toBe(plaintext)

      // 2. Exactly 32-byte UTF-8 key
      const utf8Key = '12345678901234567890123456789012' // exactly 32 chars
      const encUtf8 = encryptSecret(plaintext, { customMasterKey: utf8Key })
      const decUtf8 = decryptSecret(encUtf8, { customMasterKey: utf8Key })
      expect(decUtf8).toBe(plaintext)

      // 3. Fails closed on invalid length (e.g. 16 bytes or 31 bytes)
      expect(() => encryptSecret(plaintext, { customMasterKey: 'short_key_16_byt' })).toThrow(
        /ENCRYPTION_MASTER_KEY must be exactly 32 bytes/
      )

      const savedKey = process.env.ENCRYPTION_MASTER_KEY
      try {
        delete process.env.ENCRYPTION_MASTER_KEY
        expect(() => encryptSecret(plaintext)).toThrow(
          /ENCRYPTION_MASTER_KEY is not configured/
        )
      } finally {
        process.env.ENCRYPTION_MASTER_KEY = savedKey
      }
    })
  })

  // ── 2. Credential Resolution & Lifecycle Gating ──────────────────────────────
  describe('Tenant Credential Resolver & Certification Gating', () => {
    const clientIdA = 'client-alpha'
    const deploymentIdA1 = 'dep-alpha-01'
    const deploymentIdA2 = 'dep-alpha-02'
    const clientIdB = 'client-beta'
    const deploymentIdB = 'dep-beta-01'

    const validWhatsAppSecret = JSON.stringify({
      accessToken: 'EAAB_alpha_token_live',
      fromPhoneNumberId: '109988776655443',
    })

    const sampleMetadata = {
      phone_number_id: '109988776655443',
      waba_id: 'waba_alpha_99',
    }

    beforeEach(() => {
      // Setup deployment A1
      memoryStore.addDeployment({ id: deploymentIdA1, client_id: clientIdA, status: 'active' })
      // Setup deployment A2 (same client, different deployment)
      memoryStore.addDeployment({ id: deploymentIdA2, client_id: clientIdA, status: 'active' })
      // Setup deployment B
      memoryStore.addDeployment({ id: deploymentIdB, client_id: clientIdB, status: 'active' })

      // Add certified credential for Deployment A1
      memoryStore.addCredential({
        id: 'cred-a1-wa',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'meta_whatsapp',
        credential_type: 'system_user_token',
        encrypted_secret: encryptSecret(validWhatsAppSecret),
        key_version: 1,
        metadata: sampleMetadata,
        status: 'active',
        certification_status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })

    it('1. resolves valid certified credential for same tenant and deployment', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('CERTIFIED')
      expect(outcome.source).toBe('deployment')
      expect(outcome.credentials).toBeDefined()
      expect((outcome.credentials as any).accessToken).toBe('EAAB_alpha_token_live')
      expect(outcome.metadata?.phone_number_id).toBe('109988776655443')
    })

    it('2. denies cross-client credential request (Client B requesting Client A credential)', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdB,
        deploymentId: deploymentIdA1, // Client B tries to pass Client A deployment
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('ERROR')
      expect(outcome.reason).toContain('Tenant mismatch')
      expect(outcome.credentials).toBeUndefined()
    })

    it('3. denies cross-deployment credential request (same client, wrong deployment)', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA2, // Deployment A2 has no credential yet
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('NOT_CONFIGURED')
      expect(outcome.credentials).toBeUndefined()
    })

    it('4. denies resolution when credential record does not exist', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdB,
        deploymentId: deploymentIdB,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('NOT_CONFIGURED')
      expect(outcome.credentials).toBeUndefined()
    })

    it('5. denies resolution when deployment is inactive', async () => {
      memoryStore.addDeployment({ id: 'dep-inactive', client_id: clientIdA, status: 'inactive' })
      memoryStore.addCredential({
        id: 'cred-inactive',
        client_id: clientIdA,
        deployment_id: 'dep-inactive',
        provider: 'meta_whatsapp',
        credential_type: 'token',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'active',
        certification_status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: 'dep-inactive',
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('RESTRICTED')
      expect(outcome.reason).toContain('inactive')
      expect(outcome.credentials).toBeUndefined()
    })

    it('6. denies resolution when deployment is paused', async () => {
      memoryStore.addDeployment({ id: 'dep-paused', client_id: clientIdA, status: 'paused' })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: 'dep-paused',
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('RESTRICTED')
      expect(outcome.reason).toContain('paused')
    })

    it('7. denies resolution when deployment is suspended', async () => {
      memoryStore.addDeployment({ id: 'dep-suspended', client_id: clientIdA, status: 'suspended' })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: 'dep-suspended',
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('RESTRICTED')
      expect(outcome.reason).toContain('suspended')
    })

    it('8. denies resolution when credential status is revoked', async () => {
      memoryStore.addCredential({
        id: 'cred-revoked',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'revoked',
        certification_status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('REVOKED')
      expect(outcome.credentials).toBeUndefined()
    })

    it('9. denies resolution when credential status is suspended', async () => {
      memoryStore.addCredential({
        id: 'cred-suspended',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'n8n',
        credential_type: 'webhook_key',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'suspended',
        certification_status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'n8n',
        requiredCapability: 'pipeline',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('RESTRICTED')
      expect(outcome.reason).toContain('suspended')
    })

    it('10. denies resolution when credential has expired', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString()
      memoryStore.addCredential({
        id: 'cred-expired',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'active',
        certification_status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: pastTime,
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('EXPIRED')
      expect(outcome.reason).toContain('expired')
    })

    it('11. denies resolution when credential is near expiry within 60s safety buffer', async () => {
      const nearExpiryTime = new Date(Date.now() + 30000).toISOString() // Expires in 30 seconds
      memoryStore.addCredential({
        id: 'cred-near-expiry',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'active',
        certification_status: 'CERTIFIED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: nearExpiryTime,
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('RESTRICTED')
      expect(outcome.reason).toContain('60s safety buffer')
    })

    it('12. CONFIGURED credential cannot authorize live adapter (requires CERTIFIED)', async () => {
      memoryStore.addCredential({
        id: 'cred-configured-only',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'active',
        certification_status: 'CONFIGURED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('CONFIGURED')
      expect(outcome.reason).toContain('requires "CERTIFIED"')
      expect(outcome.credentials).toBeUndefined()
    })

    it('13. ERROR credential cannot authorize live adapter', async () => {
      memoryStore.addCredential({
        id: 'cred-error-state',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret('secret'),
        key_version: 1,
        metadata: {},
        status: 'active',
        certification_status: 'ERROR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('ERROR')
      expect(outcome.credentials).toBeUndefined()
    })

    it('14. CERTIFIED credential passes authorization successfully', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('CERTIFIED')
      expect(outcome.credentials).toBeDefined()
    })

    it('15. Provider/capability mismatch is strictly denied (meta_whatsapp -> scheduling)', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'meta_whatsapp',
        requiredCapability: 'scheduling' as any, // Invalid capability for WhatsApp
        executionMode: 'live',
      })

      expect(outcome.status).toBe('ERROR')
      expect(outcome.reason).toContain('Capability mismatch')
      expect(outcome.credentials).toBeUndefined()
    })

    it('16 & 17. Model or caller supplied accessToken cannot override server resolver', async () => {
      // Malicious payload attempting to pass override credentials
      const maliciousCallerOptions: any = {
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
        accessToken: 'HACKED_MODEL_OVERRIDE_TOKEN',
        overrideCredential: { accessToken: 'INJECTED_TOKEN' },
      }

      const outcome = await resolveIntegrationCredential(maliciousCallerOptions)

      // Must resolve server-stored secret, completely ignoring caller injected fields
      expect(outcome.status).toBe('CERTIFIED')
      expect((outcome.credentials as any).accessToken).toBe('EAAB_alpha_token_live')
      expect((outcome.credentials as any).accessToken).not.toBe('HACKED_MODEL_OVERRIDE_TOKEN')
    })

    it('18 & 19. Sandbox mode performs zero credential DB lookups and zero decryption', async () => {
      let queriedDb = false
      const spyingStore = {
        async findCredential() {
          queriedDb = true
          return null
        },
        async findDeployment() {
          queriedDb = true
          return null
        },
      }

      const outcome = await resolveIntegrationCredential({
        clientId: 'any-client',
        deploymentId: 'any-dep',
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'sandbox',
        customStore: spyingStore,
      })

      expect(queriedDb).toBe(false)
      expect(outcome.status).toBe('CONFIGURED')
      expect(outcome.metadata?.sandbox).toBe(true)
      expect(outcome.credentials).toBeUndefined()
    })

    it('20. Global WhatsApp token fallback is strictly rejected in production live mode', () => {
      const originalEnv = process.env.NODE_ENV
      const originalToken = process.env.WHATSAPP_ACCESS_TOKEN
      const originalPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
      try {
        ;(process.env as any).NODE_ENV = 'production'
        process.env.WHATSAPP_ACCESS_TOKEN = 'EAAB_global_meta_token_production'
        process.env.WHATSAPP_PHONE_NUMBER_ID = '109988776655443'

        // Calling legacy resolver without deploymentId in production
        const result = resolveWhatsAppCredentials({})
        expect(result.status).toBe('RESTRICTED')
        expect(result.reason).toContain('Global WhatsApp token fallback is strictly prohibited in production')
      } finally {
        ;(process.env as any).NODE_ENV = originalEnv
        process.env.WHATSAPP_ACCESS_TOKEN = originalToken
        process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneId
      }
    })

    it('21. Secret plaintext never appears in returned metadata or logs', async () => {
      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })

      const metadataString = JSON.stringify(outcome.metadata || {})
      expect(metadataString).not.toContain('EAAB_alpha_token_live')
      expect(outcome.metadata?.phone_number_id).toBe('109988776655443')
    })

    it('27. Multiple deployments of same client remain isolated', async () => {
      // Deployment A1 has Meta WhatsApp certified
      const outcomeA1 = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })
      expect(outcomeA1.status).toBe('CERTIFIED')

      // Deployment A2 of the same client does NOT have WhatsApp credential
      const outcomeA2 = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA2,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
      })
      expect(outcomeA2.status).toBe('NOT_CONFIGURED')
    })

    it('28. Certification is strictly required even when credentials and deployment are otherwise valid', async () => {
      memoryStore.addCredential({
        id: 'cred-uncertified-google',
        client_id: clientIdA,
        deployment_id: deploymentIdA1,
        provider: 'google_calendar',
        credential_type: 'oauth',
        encrypted_secret: encryptSecret(JSON.stringify({ accessToken: 'valid_google_token' })),
        key_version: 1,
        metadata: { calendar_id: 'sales@branch.com' },
        status: 'active', // Active status
        certification_status: 'CONFIGURED', // But not yet certified!
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const outcome = await resolveIntegrationCredential({
        clientId: clientIdA,
        deploymentId: deploymentIdA1,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: 'live',
      })

      expect(outcome.status).toBe('CONFIGURED')
      expect(outcome.credentials).toBeUndefined()
    })
  })

  // ── 3. Runtime Config Secret Protection ──────────────────────────────────────
  describe('Runtime Config Secret Sanitization Guard', () => {
    it('22. Strips sensitive keys (tokens, secrets, passwords) from runtime_config while preserving public identifiers', () => {
      const maliciousParams = {
        phone_number_id: '109988776655443',
        whatsapp_phone_number_id: '109988776655443',
        calendar_id: 'primary',
        waba_id: 'waba_9999',
        access_token: 'LEAKED_ACCESS_TOKEN',
        accessToken: 'LEAKED_ACCESS_TOKEN_2',
        secret_key: 'MY_SECRET_KEY',
        password: 'admin_password_123',
        api_key: 'API_KEY_ABCD',
        custom_param: 'valid_operational_value',
      }

      const sanitized = sanitizeRuntimeParameters(maliciousParams)

      // Allowed public identifiers preserved
      expect(sanitized.phone_number_id).toBe('109988776655443')
      expect(sanitized.whatsapp_phone_number_id).toBe('109988776655443')
      expect(sanitized.calendar_id).toBe('primary')
      expect(sanitized.waba_id).toBe('waba_9999')
      expect(sanitized.custom_param).toBe('valid_operational_value')

      // Forbidden secrets stripped
      expect(sanitized.access_token).toBeUndefined()
      expect(sanitized.accessToken).toBeUndefined()
      expect(sanitized.secret_key).toBeUndefined()
      expect(sanitized.password).toBeUndefined()
      expect(sanitized.api_key).toBeUndefined()
    })

    it('buildClientRuntimeConfig produces clean operating_parameters with zero secret leakage', () => {
      const cfg = buildClientRuntimeConfig({
        deploymentId: 'dep-test',
        clientId: 'client-test',
        prospect: {
          company_name: 'Apex Real Estate',
          industry: 'Real Estate',
        },
        employeeSlug: 'real-estate-lead-receptionist',
        workflowId: 'wf-001',
        whatsappPhoneNumberId: '109988776655443',
      })

      expect(cfg.operating_parameters?.whatsapp_phone_number_id).toBe('109988776655443')
      expect(JSON.stringify(cfg)).not.toContain('token')
      expect(JSON.stringify(cfg)).not.toContain('secret')
    })
  })

  // ── 4. Factory Adapter Integration ───────────────────────────────────────────
  describe('Adapter Factory Certification Verification', () => {
    const liveContext: ExternalAdapterContext = {
      clientId: 'client-test-01',
      deploymentId: 'dep-test-01',
      businessOperationId: 'biz-op-501',
      workflowExecutionId: 'exec-attempt-501',
      workflowStepId: 's2',
      idempotencyKey: 'idemp_whatsapp_501',
      executionMode: 'live',
      timestamp: new Date().toISOString(),
    }

    it('returns simulated adapter with uncertified reason when provider credential is not certified', async () => {
      const adapters = resolveExternalAdapters({
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        deploymentStatus: 'active',
        executionMode: 'live',
      })

      // In this test context, google_calendar is not certified
      const calResult = await adapters.createCalendarEvent!({ date: 'tomorrow' }, liveContext)

      expect(calResult.status).toBe('simulated')
      expect(calResult.detail).toContain('[SIMULATED:uncertified]')
      expect(calResult.detail).toContain('Calendar adapter not certified')
    })
  })
})
