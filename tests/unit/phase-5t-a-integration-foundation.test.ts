import { describe, it, expect } from 'vitest'
import {
  generateOperationIdempotencyKey,
  type ExternalAdapterContext,
  type OperationIdentityParams,
  validateLiveAdapterContext,
} from '@/lib/integrations/types'
import {
  resolveWhatsAppCredentials,
  resolveGoogleCalendarCredentials,
  resolveN8nCredentials,
} from '@/lib/integrations/credentials'
import { resolveExternalAdapters } from '@/lib/integrations/factory'
import {
  executeRealEstateWorkflow,
  type WorkflowExecutionAdapters,
} from '@/lib/workflows/executor'
import type { ExtractedRealEstateLead } from '@/lib/leads/extractor'
import type { DeploymentStatus } from '@/lib/deployment/types'

describe('Phase 5T-A: External Integration Safety Foundation', () => {
  // ── 1. Retry-Stable Idempotency & Operation Identity ─────────────────────────
  describe('Retry-Stable Operation Idempotency Key', () => {
    const baseParams: OperationIdentityParams = {
      businessOperationId: 'biz-site-visit-lead-101',
      workflowExecutionId: 'exec-attempt-01',
      workflowStepId: 's2',
      operationName: 'whatsapp_template',
      entityId: '+919876543210',
      discriminator: 'first_touch',
    }

    it('A. generates identical idempotency keys when the same business operation is retried in a new execution attempt', () => {
      // Attempt 1
      const keyAttempt1 = generateOperationIdempotencyKey({
        ...baseParams,
        workflowExecutionId: 'exec-attempt-1788526000000-aaa',
      })

      // Attempt 2 (retry with a completely different execution attempt ID / timestamp)
      const keyAttempt2 = generateOperationIdempotencyKey({
        ...baseParams,
        workflowExecutionId: 'exec-attempt-1788526999999-zzz',
      })

      expect(keyAttempt1).toBe(keyAttempt2)
      expect(keyAttempt1).toMatch(/^idemp_whatsapp_template_[a-f0-9]{32}$/)
    })

    it('B. generates different keys when businessOperationId differs', () => {
      const key1 = generateOperationIdempotencyKey(baseParams)
      const key2 = generateOperationIdempotencyKey({
        ...baseParams,
        businessOperationId: 'biz-site-visit-lead-999',
      })
      expect(key1).not.toBe(key2)
    })

    it('C. generates different keys when workflowStepId differs', () => {
      const key1 = generateOperationIdempotencyKey(baseParams)
      const key2 = generateOperationIdempotencyKey({
        ...baseParams,
        workflowStepId: 's3',
      })
      expect(key1).not.toBe(key2)
    })

    it('D. generates different keys when operationName differs', () => {
      const key1 = generateOperationIdempotencyKey(baseParams)
      const key2 = generateOperationIdempotencyKey({
        ...baseParams,
        operationName: 'calendar_event',
      })
      expect(key1).not.toBe(key2)
      expect(key2).toMatch(/^idemp_calendar_event_[a-f0-9]{32}$/)
    })

    it('generates different keys when entityId differs', () => {
      const key1 = generateOperationIdempotencyKey(baseParams)
      const key2 = generateOperationIdempotencyKey({
        ...baseParams,
        entityId: '+919999988888',
      })
      expect(key1).not.toBe(key2)
    })

    it('trims whitespace cleanly across all segments', () => {
      const trimmed = generateOperationIdempotencyKey(baseParams)
      const untrimmed = generateOperationIdempotencyKey({
        businessOperationId: '  biz-site-visit-lead-101  ',
        workflowStepId: ' s2 ',
        operationName: ' WHATSAPP_TEMPLATE ',
        entityId: ' +919876543210 ',
        discriminator: ' first_touch ',
      })
      expect(untrimmed).toBe(trimmed)
    })

    it('throws error when neither businessOperationId nor workflowExecutionId is provided', () => {
      expect(() =>
        generateOperationIdempotencyKey({
          workflowStepId: 's2',
          operationName: 'whatsapp_template',
        })
      ).toThrow(/requires either businessOperationId or workflowExecutionId/)
    })
  })

  // ── 2. Credential Resolution Boundary & Semantics ───────────────────────────
  describe('Server-Only Credential Resolution Boundary & Semantics', () => {
    it('resolveGoogleCalendarCredentials returns NOT_CONFIGURED without OAuth/service account', () => {
      const result = resolveGoogleCalendarCredentials({
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
      })
      expect(result.status).toBe('NOT_CONFIGURED')
      expect(result.source).toBe('none')
      expect(result.credentials).toBeUndefined()
      expect(result.reason).toContain('not configured')
    })

    it('resolveWhatsAppCredentials returns RESTRICTED/global for global-only environment tokens (NOT tenant-safe)', () => {
      const origToken = process.env.WHATSAPP_ACCESS_TOKEN
      const origPhone = process.env.WHATSAPP_PHONE_NUMBER_ID
      try {
        process.env.WHATSAPP_ACCESS_TOKEN = 'EAABtesting_token_valid_length_string_12345'
        process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890'
        const result = resolveWhatsAppCredentials({
          clientId: 'client-test-01',
          // deploymentId is omitted -> global scope only
        })
        expect(result.status).toBe('RESTRICTED')
        expect(result.source).toBe('global')
        expect(result.reason).toContain('not tenant-isolated')
      } finally {
        if (origToken) {
          process.env.WHATSAPP_ACCESS_TOKEN = origToken
        } else {
          delete process.env.WHATSAPP_ACCESS_TOKEN
        }
        if (origPhone) {
          process.env.WHATSAPP_PHONE_NUMBER_ID = origPhone
        } else {
          delete process.env.WHATSAPP_PHONE_NUMBER_ID
        }
      }
    })

    it('resolveWhatsAppCredentials recognizes deployment-scoped credentials as CONFIGURED/deployment', () => {
      const origToken = process.env.WHATSAPP_ACCESS_TOKEN
      try {
        process.env.WHATSAPP_ACCESS_TOKEN = 'EAABtesting_token_valid_length_string_12345'
        const result = resolveWhatsAppCredentials({
          clientId: 'client-test-01',
          deploymentId: 'dep-test-01',
          phoneNumberId: 'dep-phone-987654',
        })
        expect(result.status).toBe('CONFIGURED')
        expect(result.source).toBe('deployment')
        expect(result.credentials?.fromPhoneNumberId).toBe('dep-phone-987654')
        expect(result.credentials?.accessToken).toBe('EAABtesting_token_valid_length_string_12345')
      } finally {
        if (origToken) {
          process.env.WHATSAPP_ACCESS_TOKEN = origToken
        } else {
          delete process.env.WHATSAPP_ACCESS_TOKEN
        }
      }
    })

    it('resolveWhatsAppCredentials handles missing or placeholder tokens safely', () => {
      const origToken = process.env.WHATSAPP_ACCESS_TOKEN
      const origMetaToken = process.env.META_WHATSAPP_TOKEN
      try {
        delete process.env.WHATSAPP_ACCESS_TOKEN
        delete process.env.META_WHATSAPP_TOKEN

        const result = resolveWhatsAppCredentials({
          clientId: 'client-test-01',
          deploymentId: 'dep-test-01',
          phoneNumberId: 'phone-num-12345',
        })
        expect(result.status).toBe('NOT_CONFIGURED')
        expect(result.source).toBe('none')
        expect(result.credentials).toBeUndefined()
      } finally {
        if (origToken) process.env.WHATSAPP_ACCESS_TOKEN = origToken
        if (origMetaToken) process.env.META_WHATSAPP_TOKEN = origMetaToken
      }
    })

    it('resolveN8nCredentials returns RESTRICTED for URL-only n8n configuration lacking cryptographic auth', () => {
      const originalEnv = process.env.N8N_WEBHOOK_URL
      try {
        process.env.N8N_WEBHOOK_URL = 'https://custom-n8n.internal.net/webhook/v1'
        const result = resolveN8nCredentials({
          clientId: 'client-test-01',
          deploymentId: 'dep-test-01',
        })
        expect(result.status).toBe('RESTRICTED')
        expect(result.source).toBe('global')
        expect(result.reason).toContain('lacks cryptographic authentication')
      } finally {
        if (originalEnv !== undefined) {
          process.env.N8N_WEBHOOK_URL = originalEnv
        } else {
          delete process.env.N8N_WEBHOOK_URL
        }
      }
    })

    it('resolveN8nCredentials identifies demo or placeholder n8n as NOT_CONFIGURED', () => {
      const originalEnv = process.env.N8N_WEBHOOK_URL
      try {
        process.env.N8N_WEBHOOK_URL = 'https://n8n.grovaitech.ai/webhook/v1/real-estate'
        const result = resolveN8nCredentials({
          clientId: 'client-test-01',
          deploymentId: 'dep-test-01',
        })
        expect(result.status).toBe('NOT_CONFIGURED')
        expect(result.source).toBe('none')
        expect(result.credentials).toBeUndefined()
      } finally {
        if (originalEnv !== undefined) {
          process.env.N8N_WEBHOOK_URL = originalEnv
        } else {
          delete process.env.N8N_WEBHOOK_URL
        }
      }
    })
  })

  // ── 3. Fail-Closed Deployment Status & Strict Live Tenant Context ───────────
  describe('Adapter Resolution Factory (Fail-Closed & Strict Tenant Guardrails)', () => {
    it('fails closed when deploymentStatus is missing/undefined', async () => {
      const adapters = resolveExternalAdapters({
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        executionMode: 'live',
        // deploymentStatus is omitted / undefined
      })

      const dummyContext: ExternalAdapterContext = {
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        businessOperationId: 'biz-op-01',
        workflowExecutionId: 'exec-test-01',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_test_missing_status',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const res = await adapters.dispatchWhatsAppTemplate!({ recipient: '+919999999999' }, dummyContext)
      expect(res.status).toBe('simulated')
      expect(res.detail).toContain('[SIMULATED:lifecycle_status_missing]')
    })

    it('always returns simulated adapters in sandbox mode regardless of credentials or status', async () => {
      const adapters = resolveExternalAdapters({
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        deploymentStatus: 'active',
        executionMode: 'sandbox',
      })

      const dummyContext: ExternalAdapterContext = {
        businessOperationId: 'biz-op-01',
        workflowExecutionId: 'exec-test-01',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_whatsapp_template_test123',
        executionMode: 'sandbox',
        timestamp: new Date().toISOString(),
      }

      const waRes = await adapters.dispatchWhatsAppTemplate!({ recipient: '+919999999999' }, dummyContext)
      expect(waRes.status).toBe('simulated')
      expect(waRes.detail).toContain('[SIMULATED:sandbox]')
      expect(waRes.detail).toContain('idemp_whatsapp_template_test123')

      const calRes = await adapters.createCalendarEvent!({ date: 'Tomorrow 10 AM' }, dummyContext)
      expect(calRes.status).toBe('simulated')
      expect(calRes.detail).toContain('[SIMULATED:sandbox]')
      expect(calRes.detail).toContain('idemp_whatsapp_template_test123')
    })

    it('fails closed for non-active lifecycle states (provisioned, configured, inactive, paused, suspended, failed)', async () => {
      const nonActiveStatuses: DeploymentStatus[] = ['provisioned', 'configured', 'inactive', 'paused', 'suspended', 'failed']

      for (const status of nonActiveStatuses) {
        const adapters = resolveExternalAdapters({
          clientId: 'client-test-01',
          deploymentId: 'dep-test-01',
          deploymentStatus: status,
          executionMode: 'live',
        })

        const dummyContext: ExternalAdapterContext = {
          clientId: 'client-test-01',
          deploymentId: 'dep-test-01',
          businessOperationId: 'biz-op-01',
          workflowExecutionId: 'exec-test-01',
          workflowStepId: 's2',
          idempotencyKey: `idemp_${status}_key`,
          executionMode: 'live',
          timestamp: new Date().toISOString(),
        }

        const res = await adapters.dispatchWhatsAppTemplate!({ recipient: '+910000000000' }, dummyContext)
        expect(res.status).toBe('simulated')
        expect(res.detail).toContain(`[SIMULATED:lifecycle_${status}]`)
      }
    })

    it('fails closed when live execution lacks clientId or deploymentId in options', async () => {
      const adaptersNoClient = resolveExternalAdapters({
        deploymentId: 'dep-test-01',
        deploymentStatus: 'active',
        executionMode: 'live',
      })

      const dummyContext: ExternalAdapterContext = {
        deploymentId: 'dep-test-01',
        businessOperationId: 'biz-op-01',
        workflowExecutionId: 'exec-test-01',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_test_no_client',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const res = await adaptersNoClient.dispatchWhatsAppTemplate!({ recipient: '+910000000000' }, dummyContext)
      expect(res.status).toBe('simulated')
      expect(res.detail).toContain('[SIMULATED:missing_tenant_context]')
    })

    it('validateLiveAdapterContext strictly enforces required tenant context fields for live mode', () => {
      const validContext: ExternalAdapterContext = {
        clientId: 'client-001',
        deploymentId: 'dep-001',
        businessOperationId: 'biz-op-001',
        workflowExecutionId: 'exec-001',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_key_001',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      expect(validateLiveAdapterContext(validContext).valid).toBe(true)

      const missingClient = { ...validContext, clientId: undefined }
      const resClient = validateLiveAdapterContext(missingClient)
      expect(resClient.valid).toBe(false)
      expect(resClient.missingFields).toContain('clientId')

      const missingDeployment = { ...validContext, deploymentId: '' }
      const resDep = validateLiveAdapterContext(missingDeployment)
      expect(resDep.valid).toBe(false)
      expect(resDep.missingFields).toContain('deploymentId')

      const missingOpId = { ...validContext, businessOperationId: ' ' }
      const resOp = validateLiveAdapterContext(missingOpId)
      expect(resOp.valid).toBe(false)
      expect(resOp.missingFields).toContain('businessOperationId')

      // In sandbox mode, missing clientId/deploymentId is allowed
      const sandboxContext: ExternalAdapterContext = {
        ...missingClient,
        executionMode: 'sandbox',
      }
      expect(validateLiveAdapterContext(sandboxContext).valid).toBe(true)
    })

    it('rejects live adapter invocation when runtime context fails validation', async () => {
      const adapters = resolveExternalAdapters({
        clientId: 'client-test-01',
        deploymentId: 'dep-test-01',
        deploymentStatus: 'active',
        executionMode: 'live',
      })

      // Pass context that is missing clientId in live mode
      const invalidRuntimeContext: ExternalAdapterContext = {
        deploymentId: 'dep-test-01',
        businessOperationId: 'biz-op-01',
        workflowExecutionId: 'exec-test-01',
        workflowStepId: 's2',
        idempotencyKey: 'idemp_test_invalid_runtime',
        executionMode: 'live',
        timestamp: new Date().toISOString(),
      }

      const res = await adapters.dispatchWhatsAppTemplate!({ recipient: '+910000000000' }, invalidRuntimeContext)
      expect(res.status).toBe('simulated')
      expect(res.detail).toContain('[SIMULATED:invalid_context]')
    })
  })

  // ── 4. Workflow Executor Integration & Retry Stability ───────────────────────
  describe('Workflow Executor Integration & Retry Stability', () => {
    const mockLead: ExtractedRealEstateLead = {
      name: 'Ramesh Verma',
      phone: '+919876543210',
      email: 'ramesh@example.com',
      location: 'Tirupati Central',
      property_type: 'apartment',
      bhk: 3,
      budget: '85 Lakhs',
      timeline: 'Immediate',
      intent: 'buy',
      site_visit_requested: true,
      site_visit_date: 'Saturday 11 AM',
      site_visit_time: '11:00 AM',
      qualification_score: 95,
      qualification_status: 'qualified',
    }

    it('produces identical idempotency keys when executeRealEstateWorkflow is retried for the same business operation', async () => {
      const capturedKeys: { attempt1?: string; attempt2?: string } = {}

      // Invocations represent two retry attempts for the same lead with distinct attempt IDs
      const captureAdapter1: WorkflowExecutionAdapters = {
        dispatchWhatsAppTemplate: async (payload, context) => {
          capturedKeys.attempt1 = context?.idempotencyKey
          return { status: 'simulated', detail: 'attempt 1' }
        },
      }
      const captureAdapter2: WorkflowExecutionAdapters = {
        dispatchWhatsAppTemplate: async (payload, context) => {
          capturedKeys.attempt2 = context?.idempotencyKey
          return { status: 'simulated', detail: 'attempt 2' }
        },
      }

      const res1 = await executeRealEstateWorkflow({
        leadId: 'lead-stable-101',
        conversationId: 'conv-001',
        lead: mockLead,
        adapters: captureAdapter1,
        tenantContext: {
          clientId: 'client-custom-01',
          deploymentId: 'dep-custom-01',
          businessOperationId: 'site-visit-op-stable-101',
        },
      })

      const res2 = await executeRealEstateWorkflow({
        leadId: 'lead-stable-101',
        conversationId: 'conv-001',
        lead: mockLead,
        adapters: captureAdapter2,
        tenantContext: {
          clientId: 'client-custom-01',
          deploymentId: 'dep-custom-01',
          businessOperationId: 'site-visit-op-stable-101',
        },
      })

      // Execution attempt IDs differ (each attempt is unique)
      expect(res1.executionId).not.toBe(res2.executionId)

      // BUT the external operation idempotency key is 100% stable across the retry attempts
      expect(capturedKeys.attempt1).toBeDefined()
      expect(capturedKeys.attempt2).toBeDefined()
      expect(capturedKeys.attempt1).toBe(capturedKeys.attempt2)
    })

    it('defaults to simulated steps and prohibits customer confirmation when no adapters provided', async () => {
      const result = await executeRealEstateWorkflow({
        leadId: 'lead-test-001',
        conversationId: 'conv-test-001',
        lead: mockLead,
      })

      expect(result.overallStatus).toBe('partial')
      expect(result.hasSimulatedSteps).toBe(true)
      expect(result.customerConfirmationAllowed).toBe(false)

      const s2 = result.steps.find((s) => s.stepId === 's2')
      expect(s2?.status).toBe('simulated')
      expect(s2?.detail).toContain('[SIMULATED]')

      const s3 = result.steps.find((s) => s.stepId === 's3')
      expect(s3?.status).toBe('simulated')
      expect(s3?.detail).toContain('[SIMULATED]')
    })

    it('passes server-controlled ExternalAdapterContext with retry-stable idempotencyKey to custom adapters', async () => {
      const capturedContexts: Record<string, ExternalAdapterContext> = {}

      const customAdapters: WorkflowExecutionAdapters = {
        dispatchWhatsAppTemplate: async (payload, context) => {
          if (context) capturedContexts.s2 = context
          return {
            status: 'simulated',
            detail: `Captured WhatsApp context: ${context?.idempotencyKey}`,
          }
        },
        createCalendarEvent: async (payload, context) => {
          if (context) capturedContexts.s3 = context
          return {
            status: 'simulated',
            detail: `Captured Calendar context: ${context?.idempotencyKey}`,
          }
        },
      }

      const result = await executeRealEstateWorkflow({
        leadId: 'lead-test-002',
        conversationId: 'conv-test-002',
        lead: mockLead,
        adapters: customAdapters,
        tenantContext: {
          clientId: 'client-custom-01',
          deploymentId: 'dep-custom-01',
          executionMode: 'sandbox',
          channel: 'whatsapp',
          businessOperationId: 'biz-lead-test-002',
        },
      })

      expect(result.executionId).toBeDefined()
      expect(capturedContexts.s2).toBeDefined()
      expect(capturedContexts.s2.clientId).toBe('client-custom-01')
      expect(capturedContexts.s2.deploymentId).toBe('dep-custom-01')
      expect(capturedContexts.s2.businessOperationId).toBe('biz-lead-test-002')
      expect(capturedContexts.s2.workflowExecutionId).toBe(result.executionId)
      expect(capturedContexts.s2.workflowStepId).toBe('s2')
      expect(capturedContexts.s2.executionMode).toBe('sandbox')
      expect(capturedContexts.s2.channel).toBe('whatsapp')
      expect(capturedContexts.s2.idempotencyKey).toMatch(/^idemp_whatsapp_template_[a-f0-9]{32}$/)

      expect(capturedContexts.s3).toBeDefined()
      expect(capturedContexts.s3.clientId).toBe('client-custom-01')
      expect(capturedContexts.s3.deploymentId).toBe('dep-custom-01')
      expect(capturedContexts.s3.businessOperationId).toBe('biz-lead-test-002')
      expect(capturedContexts.s3.workflowExecutionId).toBe(result.executionId)
      expect(capturedContexts.s3.workflowStepId).toBe('s3')
      expect(capturedContexts.s3.idempotencyKey).toMatch(/^idemp_calendar_event_[a-f0-9]{32}$/)

      // S2 and S3 must have distinct idempotency keys despite sharing the same workflow execution
      expect(capturedContexts.s2.idempotencyKey).not.toBe(capturedContexts.s3.idempotencyKey)
    })

    it('works with resolveExternalAdapters output directly', async () => {
      const resolved = resolveExternalAdapters({
        clientId: 'client-test-synthetic-01',
        deploymentId: 'dep-client-test-synthetic-01-real-estate-lead-receptionist',
        deploymentStatus: 'active',
        executionMode: 'sandbox',
      })

      const result = await executeRealEstateWorkflow({
        leadId: 'lead-test-003',
        conversationId: 'conv-test-003',
        lead: mockLead,
        adapters: resolved,
        tenantContext: {
          clientId: 'client-test-synthetic-01',
          deploymentId: 'dep-client-test-synthetic-01-real-estate-lead-receptionist',
          executionMode: 'sandbox',
        },
      })

      expect(result.hasSimulatedSteps).toBe(true)
      expect(result.customerConfirmationAllowed).toBe(false)
      const s2 = result.steps.find((s) => s.stepId === 's2')
      expect(s2?.status).toBe('simulated')
      expect(s2?.detail).toContain('[SIMULATED:sandbox]')
      expect(s2?.detail).toContain('idemp_whatsapp_template_')

      const s3 = result.steps.find((s) => s.stepId === 's3')
      expect(s3?.status).toBe('simulated')
      expect(s3?.detail).toContain('[SIMULATED:sandbox]')
      expect(s3?.detail).toContain('idemp_calendar_event_')
    })
  })
})
