/**
 * Grovaitech AI Platform
 * tests/unit/phase-5t-c4-credential-onboarding.test.ts
 *
 * Comprehensive Unit Test Suite for Phase 5T-C4: Provider Credential Onboarding.
 * Validates onboarding, encryption, rotation recertification reset, revocation,
 * provider-specific validation, lifecycle gating, cross-tenant isolation,
 * API route handlers, and secret zero-leakage invariants.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  onboardCredential,
  rotateCredential,
  revokeCredential,
  getSafeCredentialStatus,
  sanitizeMetadata,
  validateProviderPayload,
} from '@/lib/integrations/onboarding'
import {
  MemoryCredentialStore,
  setCredentialStore,
  resolveIntegrationCredential,
} from '@/lib/integrations/credentials'
import { certifyIntegration } from '@/lib/integrations/certification'
import { decryptSecret } from '@/lib/integrations/crypto'
import { NextRequest } from 'next/server'
import { POST, GET, DELETE } from '@/app/api/integrations/credentials/route'

describe('Phase 5T-C4: Provider Credential Onboarding', () => {
  const TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  let memoryStore: MemoryCredentialStore

  const clientId = 'client-onboard-01'
  const deploymentId = 'dep-onboard-01'
  const validPhoneId = '109988776655443'
  const validWabaId = 'waba_998877'

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY
    memoryStore = new MemoryCredentialStore()
    setCredentialStore(memoryStore)

    // Setup base active deployment
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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. WhatsApp Onboarding & Validation
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. WhatsApp Credential Onboarding', () => {
    it('1. successfully onboards valid WhatsApp credential with immediate AES-256-GCM encryption', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_test_access_token_12345',
          phoneNumberId: validPhoneId,
          wabaId: validWabaId,
        },
        metadata: {
          environment: 'production-tenant',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.provider).toBe('meta_whatsapp')
      expect(result.data?.clientId).toBe(clientId)
      expect(result.data?.deploymentId).toBe(deploymentId)
      expect(result.data?.status).toBe('active')
      expect(result.data?.certificationStatus).toBe('CONFIGURED')
      expect(result.data?.credentialConfigured).toBe(true)
      expect(result.data?.lastVerifiedAt).toBeNull()

      // Inspect persisted store record
      const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(stored).toBeDefined()
      expect(stored?.encrypted_secret).toBeDefined()
      expect(stored?.encrypted_secret).not.toContain('EAAB_test_access_token_12345')

      // Verify decryptable with master key
      const decrypted = JSON.parse(decryptSecret(stored!.encrypted_secret))
      expect(decrypted.accessToken).toBe('EAAB_test_access_token_12345')
      expect(decrypted.phoneNumberId).toBe(validPhoneId)
    })

    it('2. rejects WhatsApp onboarding when access token is missing or empty', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('WhatsApp requires a valid non-empty access token')
    })

    it('3. rejects WhatsApp onboarding when phoneNumberId is missing', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_123',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('WhatsApp requires a valid phone_number_id')
    })

    it('4. rejects WhatsApp onboarding if phoneNumberId does not match deployment operating parameters', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_123',
          phoneNumberId: '999999999999999', // Mismatched ID
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('WhatsApp phone_number_id mismatch')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Google Calendar Onboarding & Validation
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Google Calendar Credential Onboarding', () => {
    it('5. successfully onboards valid Google Calendar credentials', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        credentials: {
          calendarId: 'primary_calendar_123@group.calendar.google.com',
          accessToken: 'ya29.test_oauth_access_token_abc',
          refreshToken: '1//refresh_token_xyz',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.data?.provider).toBe('google_calendar')
      expect(result.data?.certificationStatus).toBe('CONFIGURED')
      expect(result.data?.credentialConfigured).toBe(true)
      expect(result.data?.metadata.calendar_id).toBe('primary_calendar_123@group.calendar.google.com')

      const stored = await memoryStore.findCredential(clientId, deploymentId, 'google_calendar')
      expect(stored?.credential_type).toBe('oauth2_token')
      const decrypted = JSON.parse(decryptSecret(stored!.encrypted_secret))
      expect(decrypted.refreshToken).toBe('1//refresh_token_xyz')
    })

    it('6. rejects Google Calendar onboarding when calendarId is missing', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        credentials: {
          accessToken: 'ya29.test_token',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('Google Calendar requires a valid calendarId')
    })

    it('7. rejects Google Calendar onboarding when auth token/key is missing', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        credentials: {
          calendarId: 'test@calendar.google.com',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('Google Calendar requires an OAuth token or service account credentials')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 3. n8n Onboarding & Validation
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. n8n Credential Onboarding', () => {
    it('8. successfully onboards valid n8n credentials', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'n8n',
        credentials: {
          webhookUrl: 'https://n8n.tenant-workflows.example.com/webhook/lead-pipeline',
          signingSecret: 'secret_signing_key_99999',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(true)
      expect(result.data?.provider).toBe('n8n')
      expect(result.data?.certificationStatus).toBe('CONFIGURED')
      expect(result.data?.metadata.webhook_url).toBe('https://n8n.tenant-workflows.example.com/webhook/lead-pipeline')

      const stored = await memoryStore.findCredential(clientId, deploymentId, 'n8n')
      expect(stored?.credential_type).toBe('api_key')
    })

    it('9. rejects n8n onboarding when webhookUrl is not HTTPS', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'n8n',
        credentials: {
          webhookUrl: 'http://insecure.n8n.internal/webhook',
          signingSecret: 'secret_12345678',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('n8n requires a valid HTTPS webhookUrl')
    })

    it('10. rejects n8n onboarding when signingSecret is shorter than 8 characters', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'n8n',
        credentials: {
          webhookUrl: 'https://n8n.example.com/webhook',
          signingSecret: 'short',
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_FAILED')
      expect(result.error).toContain('signingSecret or apiKey of at least 8 characters')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Duplicate Active Rejection & Conflict Prevention
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Duplicate Active Rejection', () => {
    it('11. onboardCredential rejects if an active credential already exists for the provider', async () => {
      // First onboarding
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_1',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      // Attempt second onboarding without rotation
      const secondResult = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_2',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      expect(secondResult.success).toBe(false)
      expect(secondResult.errorCode).toBe('CREDENTIAL_CONFLICT')
      expect(secondResult.error).toContain('Active credential already exists')
      expect(secondResult.error).toContain('rotation is required')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Credential Rotation & Recertification Invariant
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Credential Rotation', () => {
    it('12. rotateCredential replaces secret, resets certificationStatus to CONFIGURED, and clears lastVerifiedAt', async () => {
      // 1. Initial onboard
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_initial_token',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      // 2. Perform C3 certification to make it CERTIFIED
      const certResult = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })
      expect(certResult.success).toBe(true)
      expect(certResult.status).toBe('CERTIFIED')

      // Verify it was certified in store
      let stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(stored?.certification_status).toBe('CERTIFIED')
      expect(stored?.last_verified_at).toBeDefined()
      const originalVerifiedAt = stored?.last_verified_at

      // 3. Now rotate credential
      const rotateResult = await rotateCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_new_rotated_token_999',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      expect(rotateResult.success).toBe(true)
      expect(rotateResult.data?.certificationStatus).toBe('CONFIGURED')
      expect(rotateResult.data?.lastVerifiedAt).toBeNull()

      // Verify in store
      stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(stored?.certification_status).toBe('CONFIGURED')
      expect(stored?.last_verified_at).toBeNull()

      const decrypted = JSON.parse(decryptSecret(stored!.encrypted_secret))
      expect(decrypted.accessToken).toBe('EAAB_new_rotated_token_999')
    })

    it('13. rotateCredential rejects if credential does not already exist', async () => {
      const result = await rotateCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('CREDENTIAL_NOT_FOUND')
      expect(result.error).toContain('No existing credential found')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Credential Revocation
  // ──────────────────────────────────────────────────────────────────────────
  describe('6. Credential Revocation', () => {
    it('14. revokeCredential sets status to revoked and certificationStatus to REVOKED', async () => {
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_to_revoke',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const revokeResult = await revokeCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(revokeResult.success).toBe(true)
      expect(revokeResult.data?.status).toBe('revoked')
      expect(revokeResult.data?.certificationStatus).toBe('REVOKED')
      expect(revokeResult.data?.credentialConfigured).toBe(false)

      const stored = await memoryStore.findCredential(clientId, deploymentId, 'meta_whatsapp')
      expect(stored?.status).toBe('revoked')
      expect(stored?.certification_status).toBe('REVOKED')
    })

    it('15. live runtime resolution immediately fails closed on revoked credential', async () => {
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_to_revoke',
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

      const resolution = await resolveIntegrationCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: 'live',
        customStore: memoryStore,
      })

      expect(resolution.status).toBe('REVOKED')
      expect(resolution.credentials).toBeUndefined()
    })

    it('16. revokeCredential rejects if credential does not exist', async () => {
      const result = await revokeCredential({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('CREDENTIAL_NOT_FOUND')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Cross-Tenant & Lifecycle Gating
  // ──────────────────────────────────────────────────────────────────────────
  describe('7. Multi-Tenant Isolation & Lifecycle Bounds', () => {
    it('17. rejects onboarding if deployment does not exist', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId: 'non-existent-dep',
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('DEPLOYMENT_NOT_FOUND')
    })

    it('18. rejects onboarding if deployment belongs to a different client (cross-tenant spoofing)', async () => {
      const result = await onboardCredential({
        clientId: 'attacker-client-99',
        deploymentId, // deploymentId belongs to clientId ('client-onboard-01')
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('UNAUTHORIZED')
      expect(result.error).toContain('Cross-tenant access forbidden')
    })

    it('19. rejects onboarding if deployment lifecycle status is inactive/paused/suspended/failed', async () => {
      const testStatuses = ['inactive', 'paused', 'suspended', 'failed', 'terminated']
      for (const st of testStatuses) {
        memoryStore.addDeployment({
          id: `dep-status-${st}`,
          client_id: clientId,
          status: st,
        })

        const result = await onboardCredential({
          clientId,
          deploymentId: `dep-status-${st}`,
          provider: 'meta_whatsapp',
          credentials: {
            accessToken: 'EAAB_token',
            phoneNumberId: validPhoneId,
          },
          customStore: memoryStore,
        })

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('DEPLOYMENT_INACTIVE')
        expect(result.error).toContain(`in state "${st}"`)
      }
    })

    it('20. allows onboarding for provisioned, configured, and active deployments', async () => {
      const allowed = ['provisioned', 'configured', 'active']
      for (const st of allowed) {
        const dId = `dep-allowed-${st}`
        memoryStore.addDeployment({
          id: dId,
          client_id: clientId,
          status: st,
        })

        const result = await onboardCredential({
          clientId,
          deploymentId: dId,
          provider: 'n8n',
          credentials: {
            webhookUrl: 'https://n8n.example.com/webhook',
            signingSecret: 'supersecretkey123',
          },
          customStore: memoryStore,
        })

        expect(result.success).toBe(true)
        expect(result.data?.status).toBe('active')
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Secret Zero-Leakage & Safe Metadata
  // ──────────────────────────────────────────────────────────────────────────
  describe('8. Secret Zero-Leakage Invariants', () => {
    it('21. sanitizeMetadata strips token, secret, password, key, auth fields', () => {
      const raw = {
        phone_number_id: '12345',
        api_token: 'secret_token_val',
        signing_secret: 'secret_key_val',
        password: 'pass',
        auth_header: 'Bearer 123',
        safe_tag: 'test',
      }
      const safe = sanitizeMetadata(raw)
      expect(safe.phone_number_id).toBe('12345')
      expect(safe.safe_tag).toBe('test')
      expect(safe.api_token).toBeUndefined()
      expect(safe.signing_secret).toBeUndefined()
      expect(safe.password).toBeUndefined()
      expect(safe.auth_header).toBeUndefined()
    })

    it('22. onboardCredential return object never contains raw secrets or token fragments', async () => {
      const rawToken = 'EAAB_very_secret_token_1234567890'
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: rawToken,
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain(rawToken)
      expect(serialized).not.toContain('••••')
      expect(serialized).not.toContain('7890')
      expect(serialized).not.toContain('encrypted_secret')
      expect(result.data?.credentialConfigured).toBe(true)
    })

    it('23. getSafeCredentialStatus never returns secret tokens or masked fragments', async () => {
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_secret_token_xyz',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const status = await getSafeCredentialStatus({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })

      expect(status.provider).toBe('meta_whatsapp')
      expect(status.credentialConfigured).toBe(true)
      expect(status.certificationStatus).toBe('CONFIGURED')
      expect(status.metadata.phone_number_id).toBe(validPhoneId)
      const serialized = JSON.stringify(status)
      expect(serialized).not.toContain('EAAB_secret_token_xyz')
      expect(serialized).not.toContain('••••')
      expect((status as any).encrypted_secret).toBeUndefined()
    })

    it('24. getSafeCredentialStatus returns not_configured for unconfigured provider', async () => {
      const status = await getSafeCredentialStatus({
        clientId,
        deploymentId,
        provider: 'google_calendar',
        customStore: memoryStore,
      })

      expect(status.status).toBe('not_configured')
      expect(status.certificationStatus).toBe('NOT_CONFIGURED')
      expect(status.credentialConfigured).toBe(false)
      expect(status.lastVerifiedAt).toBeNull()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Input & Provider Bounds
  // ──────────────────────────────────────────────────────────────────────────
  describe('9. Input Bounds & Unsupported Providers', () => {
    it('25. rejects unsupported provider during onboarding', async () => {
      const result = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'unsupported_crm' as any,
        credentials: { key: '123' },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INVALID_PROVIDER')
      expect(result.error).toContain('Unsupported provider "unsupported_crm"')
    })

    it('26. rejects onboarding with missing clientId or deploymentId', async () => {
      const result = await onboardCredential({
        clientId: '',
        deploymentId: '',
        provider: 'meta_whatsapp',
        credentials: { accessToken: '123' },
        customStore: memoryStore,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('UNAUTHORIZED')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 10. End-to-End Certification Transition
  // ──────────────────────────────────────────────────────────────────────────
  describe('10. Lifecycle Transition: Onboard -> Certify -> Rotate', () => {
    it('27. onboard credential starts in CONFIGURED state, certifies to CERTIFIED, and rotation forces back to CONFIGURED', async () => {
      // Step A: Onboard
      const onboardRes = await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_step_a',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })
      expect(onboardRes.data?.certificationStatus).toBe('CONFIGURED')

      // Step B: Certify
      const certifyRes = await certifyIntegration({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })
      expect(certifyRes.status).toBe('CERTIFIED')

      let status = await getSafeCredentialStatus({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })
      expect(status.certificationStatus).toBe('CERTIFIED')
      expect(status.lastVerifiedAt).not.toBeNull()

      // Step C: Rotate
      const rotateRes = await rotateCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_token_step_c',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })
      expect(rotateRes.data?.certificationStatus).toBe('CONFIGURED')
      expect(rotateRes.data?.lastVerifiedAt).toBeNull()

      status = await getSafeCredentialStatus({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        customStore: memoryStore,
      })
      expect(status.certificationStatus).toBe('CONFIGURED')
      expect(status.lastVerifiedAt).toBeNull()
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 11. REST API Route Handlers (/api/integrations/credentials)
  // ──────────────────────────────────────────────────────────────────────────
  describe('11. REST API Route Handlers', () => {
    it('28. POST route fails closed with 401 if operator is unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          deploymentId,
          provider: 'meta_whatsapp',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.errorCode).toBe('UNAUTHENTICATED')
    })

    it('29. GET route fails closed with 401 if operator is unauthenticated', async () => {
      const req = new NextRequest(`http://localhost:3000/api/integrations/credentials?clientId=${clientId}&deploymentId=${deploymentId}&provider=meta_whatsapp`, {
        method: 'GET',
      })

      const res = await GET(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.errorCode).toBe('UNAUTHENTICATED')
    })

    it('30. DELETE route fails closed with 401 if operator is unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'DELETE',
        body: JSON.stringify({
          clientId,
          deploymentId,
          provider: 'meta_whatsapp',
        }),
      })

      const res = await DELETE(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.errorCode).toBe('UNAUTHENTICATED')
    })

    it('31. POST route with valid mock operator session onboards credential (201 Created)', async () => {
      const sessionData = JSON.stringify({ id: 'op-123', email: 'op@example.com', role: 'admin' })
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'POST',
        headers: {
          cookie: `grovaitech_session=${encodeURIComponent(sessionData)}`,
        },
        body: JSON.stringify({
          action: 'onboard',
          clientId,
          deploymentId,
          provider: 'meta_whatsapp',
          credentials: {
            accessToken: 'EAAB_route_token_123',
            phoneNumberId: validPhoneId,
          },
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data?.provider).toBe('meta_whatsapp')
      expect(body.data?.credentialConfigured).toBe(true)
    })

    it('32. POST route with action rotate rotates credential (200 OK)', async () => {
      // First onboard directly in store
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_route_token_1',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const sessionData = JSON.stringify({ id: 'op-123', email: 'op@example.com', role: 'admin' })
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'POST',
        headers: {
          cookie: `grovaitech_session=${encodeURIComponent(sessionData)}`,
        },
        body: JSON.stringify({
          action: 'rotate',
          clientId,
          deploymentId,
          provider: 'meta_whatsapp',
          credentials: {
            accessToken: 'EAAB_route_token_rotated',
            phoneNumberId: validPhoneId,
          },
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data?.certificationStatus).toBe('CONFIGURED')
    })

    it('33. GET route with valid session returns safe credential status (200 OK)', async () => {
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_get_test_token',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const sessionData = JSON.stringify({ id: 'op-123', email: 'op@example.com', role: 'admin' })
      const req = new NextRequest(
        `http://localhost:3000/api/integrations/credentials?clientId=${clientId}&deploymentId=${deploymentId}&provider=meta_whatsapp`,
        {
          method: 'GET',
          headers: {
            cookie: `grovaitech_session=${encodeURIComponent(sessionData)}`,
          },
        }
      )

      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data?.provider).toBe('meta_whatsapp')
      expect(body.data?.credentialConfigured).toBe(true)
      expect(body.data?.metadata.phone_number_id).toBe(validPhoneId)
      expect(JSON.stringify(body)).not.toContain('EAAB_get_test_token')
    })

    it('34. DELETE route with valid session revokes credential (200 OK)', async () => {
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_del_test_token',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const sessionData = JSON.stringify({ id: 'op-123', email: 'op@example.com', role: 'admin' })
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'DELETE',
        headers: {
          cookie: `grovaitech_session=${encodeURIComponent(sessionData)}`,
        },
        body: JSON.stringify({
          clientId,
          deploymentId,
          provider: 'meta_whatsapp',
        }),
      })

      const res = await DELETE(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data?.status).toBe('revoked')
      expect(body.data?.certificationStatus).toBe('REVOKED')
    })

    it('35. POST route returns 409 conflict when onboarding active duplicate', async () => {
      await onboardCredential({
        clientId,
        deploymentId,
        provider: 'meta_whatsapp',
        credentials: {
          accessToken: 'EAAB_existing',
          phoneNumberId: validPhoneId,
        },
        customStore: memoryStore,
      })

      const sessionData = JSON.stringify({ id: 'op-123', email: 'op@example.com', role: 'admin' })
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'POST',
        headers: {
          cookie: `grovaitech_session=${encodeURIComponent(sessionData)}`,
        },
        body: JSON.stringify({
          action: 'onboard',
          clientId,
          deploymentId,
          provider: 'meta_whatsapp',
          credentials: {
            accessToken: 'EAAB_dup',
            phoneNumberId: validPhoneId,
          },
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.errorCode).toBe('CREDENTIAL_CONFLICT')
    })

    it('36. POST route returns 403 when deployment belongs to another client', async () => {
      const sessionData = JSON.stringify({ id: 'op-123', email: 'op@example.com', role: 'admin' })
      const req = new NextRequest('http://localhost:3000/api/integrations/credentials', {
        method: 'POST',
        headers: {
          cookie: `grovaitech_session=${encodeURIComponent(sessionData)}`,
        },
        body: JSON.stringify({
          action: 'onboard',
          clientId: 'wrong-client',
          deploymentId,
          provider: 'meta_whatsapp',
          credentials: {
            accessToken: 'EAAB_test',
            phoneNumberId: validPhoneId,
          },
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.errorCode).toBe('UNAUTHORIZED')
    })
  })
})
