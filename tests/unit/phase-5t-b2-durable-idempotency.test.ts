import { describe, it, expect, beforeEach } from 'vitest'
import {
  createRequestFingerprint,
  canonicalizeJson,
  sanitizeResultPayload,
} from '@/lib/integrations/fingerprint'
import {
  claimExternalOperation,
  transitionToProcessing,
  completeExternalOperation,
  failExternalOperation,
  markExternalOperationUnknown,
  MemoryIdempotencyStore,
  setIdempotencyStore,
  IdempotencyPayloadMismatchError,
  TenantMismatchError,
  InvalidStatusTransitionError,
} from '@/lib/integrations/idempotency'
import type { ExternalAdapterContext } from '@/lib/integrations/types'

describe('Phase 5T-B2: Durable External Side-Effect Idempotency Persistence', () => {
  let memoryStore: MemoryIdempotencyStore

  beforeEach(() => {
    memoryStore = new MemoryIdempotencyStore()
    setIdempotencyStore(memoryStore)
  })

  // ── 1. Canonical Payload Fingerprinting ─────────────────────────────────────
  describe('Canonical Request Payload Fingerprinting', () => {
    it('1. generates identical fingerprint regardless of top-level key order (determinism)', () => {
      const payloadA = { recipient: '+919876543210', template: 'site_visit', attempt: 1 }
      const payloadB = { template: 'site_visit', attempt: 1, recipient: '+919876543210' }

      const hashA = createRequestFingerprint(payloadA)
      const hashB = createRequestFingerprint(payloadB)

      expect(hashA).toBe(hashB)
      expect(hashA).toMatch(/^[a-f0-9]{64}$/)
    })

    it('2. generates identical fingerprint for deeply nested objects with different key order', () => {
      const nestedA = {
        meta: {
          client: 'client-apex',
          params: { b: 2, a: 1, inner: { z: 26, y: 25 } },
        },
        items: [1, 2, 3],
      }
      const nestedB = {
        items: [1, 2, 3],
        meta: {
          params: { a: 1, inner: { y: 25, z: 26 }, b: 2 },
          client: 'client-apex',
        },
      }

      expect(createRequestFingerprint(nestedA)).toBe(createRequestFingerprint(nestedB))
    })

    it('3. generates different fingerprint when payload content is mutated', () => {
      const payloadA = { recipient: '+919876543210', slot: 'Saturday 10 AM' }
      const payloadB = { recipient: '+919876543210', slot: 'Saturday 11 AM' }

      expect(createRequestFingerprint(payloadA)).not.toBe(createRequestFingerprint(payloadB))
    })

    it('4. distinguishes array element ordering strictly', () => {
      const arrayA = { tags: ['vip', 'weekend'] }
      const arrayB = { tags: ['weekend', 'vip'] }

      expect(createRequestFingerprint(arrayA)).not.toBe(createRequestFingerprint(arrayB))
    })

    it('5. distinguishes null values from missing/undefined fields', () => {
      const withNull = { customerName: 'Ramesh', note: null }
      const withoutNote = { customerName: 'Ramesh' }

      expect(createRequestFingerprint(withNull)).not.toBe(createRequestFingerprint(withoutNote))
    })
  })

  // ── 2. Atomic Claim & Duplicate Behavior ────────────────────────────────────
  describe('Atomic Claim & Concurrency Semantics', () => {
    const validLiveContext: ExternalAdapterContext = {
      clientId: 'client-test-01',
      deploymentId: 'dep-test-01',
      businessOperationId: 'biz-site-visit-101',
      workflowExecutionId: 'exec-attempt-001',
      workflowStepId: 's2',
      idempotencyKey: 'idemp_whatsapp_template_hash101',
      executionMode: 'live',
      channel: 'whatsapp',
      timestamp: new Date().toISOString(),
    }

    const samplePayload = { recipient: '+919876543210', template: 'site_visit' }

    it('6. grants execution permission to the first atomic claim', async () => {
      const result = await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(result.hasExecutionPermission).toBe(true)
      expect(result.status).toBe('claimed')
      expect(result.operationId).toBeDefined()
    })

    it('7. denies execution permission on duplicate claim with same key', async () => {
      // First claim: winner
      const claim1 = await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })
      expect(claim1.hasExecutionPermission).toBe(true)

      // Second claim: loser/duplicate
      const claim2 = await claimExternalOperation({
        context: {
          ...validLiveContext,
          workflowExecutionId: 'exec-attempt-002', // different retry attempt
        },
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(claim2.hasExecutionPermission).toBe(false)
      expect(claim2.operationId).toBe(claim1.operationId)
      expect(claim2.inFlight).toBe(true)
    })

    it('8. replays cached result when previous operation succeeded', async () => {
      const claim = await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      await transitionToProcessing(claim.operationId, validLiveContext)
      await completeExternalOperation(
        claim.operationId,
        {
          providerOperationId: 'wamid.HBgL123456789',
          resultPayload: { status: 'sent', messageId: 'wamid.HBgL123456789' },
        },
        validLiveContext
      )

      // Duplicate request arrives later
      const duplicate = await claimExternalOperation({
        context: {
          ...validLiveContext,
          workflowExecutionId: 'exec-retry-attempt-003',
        },
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(duplicate.hasExecutionPermission).toBe(false)
      expect(duplicate.status).toBe('succeeded')
      expect(duplicate.cached).toBe(true)
      expect(duplicate.providerOperationId).toBe('wamid.HBgL123456789')
      expect(duplicate.resultPayload?.status).toBe('sent')
    })

    it('9. replays cached terminal failure when previous operation failed', async () => {
      const claim = await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      await transitionToProcessing(claim.operationId, validLiveContext)
      await failExternalOperation(
        claim.operationId,
        { code: 'INVALID_TEMPLATE', message: 'Template not approved by provider' },
        validLiveContext
      )

      const duplicate = await claimExternalOperation({
        context: {
          ...validLiveContext,
          workflowExecutionId: 'exec-retry-attempt-004',
        },
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(duplicate.hasExecutionPermission).toBe(false)
      expect(duplicate.status).toBe('failed')
      expect(duplicate.cached).toBe(true)
      expect(duplicate.errorCode).toBe('INVALID_TEMPLATE')
      expect(duplicate.errorMessage).toContain('Template not approved')
    })

    it('10. blocks duplicate execution when previous operation is currently processing', async () => {
      const claim = await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      await transitionToProcessing(claim.operationId, validLiveContext)

      const duplicate = await claimExternalOperation({
        context: { ...validLiveContext, workflowExecutionId: 'exec-concurrent-attempt' },
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(duplicate.hasExecutionPermission).toBe(false)
      expect(duplicate.status).toBe('processing')
      expect(duplicate.inFlight).toBe(true)
    })

    it('11. blocks duplicate execution when previous operation is in unknown state (reconciliation required)', async () => {
      const claim = await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      await transitionToProcessing(claim.operationId, validLiveContext)
      await markExternalOperationUnknown(claim.operationId, 'Gateway timeout after 5000ms', validLiveContext)

      const duplicate = await claimExternalOperation({
        context: { ...validLiveContext, workflowExecutionId: 'exec-retry-after-timeout' },
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(duplicate.hasExecutionPermission).toBe(false)
      expect(duplicate.status).toBe('unknown')
      expect(duplicate.reconciliationRequired).toBe(true)
    })

    it('12. throws IdempotencyPayloadMismatchError when duplicate key arrives with mutated payload', async () => {
      await claimExternalOperation({
        context: validLiveContext,
        payload: { recipient: '+919876543210', template: 'site_visit' },
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      const mutatedPayload = { recipient: '+919999999999', template: 'site_visit' }

      await expect(
        claimExternalOperation({
          context: validLiveContext,
          payload: mutatedPayload,
          provider: 'meta_whatsapp',
          operationName: 'whatsapp_template',
        })
      ).rejects.toThrow(IdempotencyPayloadMismatchError)
    })

    it('13. throws TenantMismatchError when same key is claimed by a different clientId', async () => {
      await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      const differentTenantContext: ExternalAdapterContext = {
        ...validLiveContext,
        clientId: 'client-attacker-999',
      }

      await expect(
        claimExternalOperation({
          context: differentTenantContext,
          payload: samplePayload,
          provider: 'meta_whatsapp',
          operationName: 'whatsapp_template',
        })
      ).rejects.toThrow(TenantMismatchError)
    })

    it('14. throws TenantMismatchError when same key is claimed by a different deploymentId', async () => {
      await claimExternalOperation({
        context: validLiveContext,
        payload: samplePayload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      const differentDeploymentContext: ExternalAdapterContext = {
        ...validLiveContext,
        deploymentId: 'dep-other-deployment-777',
      }

      await expect(
        claimExternalOperation({
          context: differentDeploymentContext,
          payload: samplePayload,
          provider: 'meta_whatsapp',
          operationName: 'whatsapp_template',
        })
      ).rejects.toThrow(TenantMismatchError)
    })
  })

  // ── 3. State Machine & Status Transitions ────────────────────────────────────
  describe('Status Transitions & Safety Constraints', () => {
    const validLiveContext: ExternalAdapterContext = {
      clientId: 'client-test-01',
      deploymentId: 'dep-test-01',
      businessOperationId: 'biz-cal-201',
      workflowExecutionId: 'exec-attempt-201',
      workflowStepId: 's3',
      idempotencyKey: 'idemp_calendar_event_hash201',
      executionMode: 'live',
      channel: 'web_chat',
      timestamp: new Date().toISOString(),
    }

    it('15. allows valid sequential transitions: claimed -> processing -> succeeded', async () => {
      const claim = await claimExternalOperation({
        context: validLiveContext,
        payload: { title: 'Site Visit Booking' },
        provider: 'google_calendar',
        operationName: 'calendar_event',
      })

      await transitionToProcessing(claim.operationId, validLiveContext)
      const inFlightRec = await memoryStore.findByKey(validLiveContext.idempotencyKey)
      expect(inFlightRec?.status).toBe('processing')

      await completeExternalOperation(
        claim.operationId,
        { providerOperationId: 'cal_event_9988' },
        validLiveContext
      )
      const completedRec = await memoryStore.findByKey(validLiveContext.idempotencyKey)
      expect(completedRec?.status).toBe('succeeded')
      expect(completedRec?.completed_at).toBeDefined()
    })

    it('16. strictly blocks invalid status transitions (e.g. unknown -> processing)', async () => {
      const claim = await claimExternalOperation({
        context: validLiveContext,
        payload: { title: 'Site Visit Booking' },
        provider: 'google_calendar',
        operationName: 'calendar_event',
      })

      await transitionToProcessing(claim.operationId, validLiveContext)
      await markExternalOperationUnknown(claim.operationId, 'Gateway timeout', validLiveContext)

      // Attempting to transition from unknown to processing must throw InvalidStatusTransitionError
      await expect(
        transitionToProcessing(claim.operationId, validLiveContext)
      ).rejects.toThrow(InvalidStatusTransitionError)
    })
  })

  // ── 4. Secret Sanitization & Sandbox Isolation ──────────────────────────────
  describe('Result Sanitization & Sandbox Boundaries', () => {
    it('17. redacts secrets, tokens, and authorization headers from result_payload', () => {
      const rawProviderResult = {
        id: 'msg-12345',
        status: 'accepted',
        access_token: 'EAAB_sensitive_meta_token_123',
        authorization: 'Bearer secret_token',
        secret: 'api_secret_val',
        headers: {
          'Authorization': 'Bearer 99999',
          'Content-Type': 'application/json',
        },
      }

      const sanitized = sanitizeResultPayload(rawProviderResult)

      expect(sanitized.id).toBe('msg-12345')
      expect(sanitized.status).toBe('accepted')
      expect(sanitized.access_token).toBe('[REDACTED_SECRET]')
      expect(sanitized.authorization).toBe('[REDACTED_SECRET]')
      expect(sanitized.secret).toBe('[REDACTED_SECRET]')
      expect(sanitized.headers.Authorization).toBe('[REDACTED_SECRET]')
      expect(sanitized.headers['Content-Type']).toBe('application/json')
    })

    it('18. sandbox operations NEVER write to durable storage', async () => {
      const sandboxContext: ExternalAdapterContext = {
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        businessOperationId: 'biz-sandbox-999',
        workflowExecutionId: 'exec-sandbox-001',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_sandbox_op_123',
        executionMode: 'sandbox',
        timestamp: new Date().toISOString(),
      }

      const claim = await claimExternalOperation({
        context: sandboxContext,
        payload: { test: true },
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      expect(claim.hasExecutionPermission).toBe(true)
      expect(claim.isSandbox).toBe(true)

      // Verify that NO row was written to the store
      const record = await memoryStore.findByKey('idemp_sandbox_op_123')
      expect(record).toBeNull()
    })
  })

  // ── 5. Concurrent Claim Race Condition Simulation ────────────────────────────
  describe('Concurrent Claim Race Condition Simulation', () => {
    it('19 & 20. guarantees exactly ONE winner among concurrent simultaneous claims for the same key', async () => {
      const concurrentContext: ExternalAdapterContext = {
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        businessOperationId: 'biz-concurrent-301',
        workflowExecutionId: 'exec-attempt-concurrent',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_concurrent_race_301',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const payload = { recipient: '+919876543210', template: 'race_test' }

      // 5 concurrent requests arrive simultaneously with the same idempotency key
      const results = await Promise.all([
        claimExternalOperation({ context: concurrentContext, payload, provider: 'meta_whatsapp', operationName: 'whatsapp_template' }),
        claimExternalOperation({ context: concurrentContext, payload, provider: 'meta_whatsapp', operationName: 'whatsapp_template' }),
        claimExternalOperation({ context: concurrentContext, payload, provider: 'meta_whatsapp', operationName: 'whatsapp_template' }),
        claimExternalOperation({ context: concurrentContext, payload, provider: 'meta_whatsapp', operationName: 'whatsapp_template' }),
        claimExternalOperation({ context: concurrentContext, payload, provider: 'meta_whatsapp', operationName: 'whatsapp_template' }),
      ])

      const winners = results.filter((r) => r.hasExecutionPermission)
      const losers = results.filter((r) => !r.hasExecutionPermission)

      expect(winners.length).toBe(1)
      expect(losers.length).toBe(4)

      // Winner holds the operationId
      const winnerId = winners[0].operationId
      expect(winnerId).toBeDefined()

      // All losers receive the same operationId and inFlight status
      for (const loser of losers) {
        expect(loser.operationId).toBe(winnerId)
        expect(loser.inFlight).toBe(true)
      }
    })
  })
})
