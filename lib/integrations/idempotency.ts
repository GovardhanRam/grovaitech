/**
 * Grovaitech AI Platform
 * lib/integrations/idempotency.ts
 *
 * Durable External Side-Effect Idempotency Persistence Engine.
 * Provides atomic operation claiming, payload fingerprint validation,
 * tenant isolation, explicit status transitions, and deterministic replay.
 * Server-only module.
 */

import crypto from 'crypto'
import type { ExternalAdapterContext } from './types'
import { validateLiveAdapterContext } from './types'
import { createRequestFingerprint, sanitizeResultPayload } from './fingerprint'
import { createServerClient } from '@/lib/supabase/server'

export type ExternalOperationStatus =
  | 'claimed'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'unknown'

export interface IdempotencyRecord {
  id: string
  idempotency_key: string
  client_id: string
  deployment_id: string
  business_operation_id: string
  workflow_execution_id: string
  workflow_step_id: string
  operation_name: string
  provider: string
  status: ExternalOperationStatus
  attempt_count: number
  request_fingerprint: string
  provider_operation_id?: string | null
  result_payload?: any
  error_code?: string | null
  error_message?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export interface ClaimExternalOperationOptions {
  context: ExternalAdapterContext
  payload: any
  provider: string
  operationName: string
}

export interface ClaimOperationResult {
  hasExecutionPermission: boolean
  status: ExternalOperationStatus
  operationId: string
  cached?: boolean
  inFlight?: boolean
  reconciliationRequired?: boolean
  isSandbox?: boolean
  resultPayload?: any
  providerOperationId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  detail?: string
}

export class IdempotencyPayloadMismatchError extends Error {
  constructor(message = 'Idempotency key reused with modified request payload.') {
    super(message)
    this.name = 'IdempotencyPayloadMismatchError'
  }
}

export class TenantMismatchError extends Error {
  constructor(message = 'Idempotency key belongs to a different client or deployment.') {
    super(message)
    this.name = 'TenantMismatchError'
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStatusTransitionError'
  }
}

export interface IdempotencyStore {
  insertClaim(record: IdempotencyRecord): Promise<{ success: boolean; record: IdempotencyRecord }>
  findByKey(idempotencyKey: string): Promise<IdempotencyRecord | null>
  updateStatus(id: string, updates: Partial<IdempotencyRecord>): Promise<IdempotencyRecord | null>
  clear?(): void
}

/**
 * In-memory store replicating Postgres atomic constraint and row updates for tests and local isolation.
 */
export class MemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>()
  private lock = new Set<string>()

  async insertClaim(record: IdempotencyRecord): Promise<{ success: boolean; record: IdempotencyRecord }> {
    if (this.records.has(record.idempotency_key)) {
      return { success: false, record: this.records.get(record.idempotency_key)! }
    }
    this.records.set(record.idempotency_key, { ...record })
    return { success: true, record: { ...record } }
  }

  async findByKey(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    const rec = this.records.get(idempotencyKey)
    return rec ? { ...rec } : null
  }

  async updateStatus(id: string, updates: Partial<IdempotencyRecord>): Promise<IdempotencyRecord | null> {
    for (const [key, rec] of this.records.entries()) {
      if (rec.id === id) {
        const updated = {
          ...rec,
          ...updates,
          updated_at: new Date().toISOString(),
        }
        this.records.set(key, updated)
        return { ...updated }
      }
    }
    return null
  }

  clear() {
    this.records.clear()
  }
}

/**
 * Supabase-backed store using public.external_operations table with atomic ON CONFLICT DO NOTHING.
 */
export class SupabaseIdempotencyStore implements IdempotencyStore {
  private async getClient() {
    return createServerClient()
  }

  async insertClaim(record: IdempotencyRecord): Promise<{ success: boolean; record: IdempotencyRecord }> {
    const supabase = await this.getClient()

    // Atomic INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *
    const { data, error } = await supabase
      .from('external_operations')
      .insert(record)
      .select('*')
      .maybeSingle()

    if (error) {
      // Check if error was due to unique violation
      if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('uq_external_operations_key')) {
        const existing = await this.findByKey(record.idempotency_key)
        if (existing) {
          return { success: false, record: existing }
        }
      }
      throw new Error(`Failed to insert external operation claim: ${error.message}`)
    }

    if (!data) {
      // ON CONFLICT DO NOTHING returned 0 rows
      const existing = await this.findByKey(record.idempotency_key)
      if (existing) {
        return { success: false, record: existing }
      }
      throw new Error(`Atomic insert conflict occurred but existing row could not be found for key: ${record.idempotency_key}`)
    }

    return { success: true, record: data as IdempotencyRecord }
  }

  async findByKey(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('external_operations')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to find external operation by key: ${error.message}`)
    }
    return data as IdempotencyRecord | null
  }

  async updateStatus(id: string, updates: Partial<IdempotencyRecord>): Promise<IdempotencyRecord | null> {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('external_operations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to update external operation status: ${error.message}`)
    }
    return data as IdempotencyRecord | null
  }
}

// Active store singleton (defaults to memory store in tests, Supabase in production)
let activeStore: IdempotencyStore = process.env.NODE_ENV === 'test'
  ? new MemoryIdempotencyStore()
  : new SupabaseIdempotencyStore()

export function setIdempotencyStore(store: IdempotencyStore) {
  activeStore = store
}

export function getIdempotencyStore(): IdempotencyStore {
  return activeStore
}

/**
 * Atomically claims permission to execute an external side-effect operation.
 * Returns execution permission to the first caller; subsequent callers receive
 * the existing operation record with replay or in-flight semantics.
 */
export async function claimExternalOperation(
  options: ClaimExternalOperationOptions
): Promise<ClaimOperationResult> {
  const { context, payload, provider, operationName } = options

  // Rule 1: Sandbox operations MUST NOT write to durable persistence
  if (context.executionMode === 'sandbox') {
    return {
      hasExecutionPermission: true,
      status: 'claimed',
      operationId: `sandbox-op-${context.idempotencyKey.substring(0, 16)}`,
      isSandbox: true,
      detail: 'Sandbox execution: external operation claim simulated without durable persistence.',
    }
  }

  // Rule 2: Live execution requires strict context validation
  const validation = validateLiveAdapterContext(context)
  if (!validation.valid) {
    throw new Error(`Live external operation rejected: ${validation.reason}`)
  }

  const clientId = context.clientId!.trim()
  const deploymentId = context.deploymentId!.trim()
  const idempotencyKey = context.idempotencyKey.trim()
  const businessOperationId = context.businessOperationId.trim()
  const workflowExecutionId = context.workflowExecutionId.trim()
  const workflowStepId = context.workflowStepId.trim()

  const requestFingerprint = createRequestFingerprint(payload)
  const now = new Date().toISOString()
  const operationId = crypto.randomUUID()

  const newRecord: IdempotencyRecord = {
    id: operationId,
    idempotency_key: idempotencyKey,
    client_id: clientId,
    deployment_id: deploymentId,
    business_operation_id: businessOperationId,
    workflow_execution_id: workflowExecutionId,
    workflow_step_id: workflowStepId,
    operation_name: operationName,
    provider,
    status: 'claimed',
    attempt_count: 1,
    request_fingerprint: requestFingerprint,
    created_at: now,
    updated_at: now,
  }

  const { success, record } = await activeStore.insertClaim(newRecord)

  if (success) {
    // Winner: atomic claim granted
    return {
      hasExecutionPermission: true,
      status: 'claimed',
      operationId: record.id,
    }
  }

  // Loser / Duplicate: evaluate existing record
  // Tenant verification: ensure caller matches original tenant
  if (record.client_id !== clientId || record.deployment_id !== deploymentId) {
    throw new TenantMismatchError(
      `Idempotency key collision across tenant boundary: claimed by client ${record.client_id}, requested by ${clientId}.`
    )
  }

  // Payload mismatch verification: ensure identical payload on retry
  if (record.request_fingerprint !== requestFingerprint) {
    throw new IdempotencyPayloadMismatchError(
      `Idempotency key reused with mutated payload. Existing fingerprint: ${record.request_fingerprint}, incoming: ${requestFingerprint}.`
    )
  }

  // Status-dependent return
  if (record.status === 'succeeded') {
    return {
      hasExecutionPermission: false,
      status: 'succeeded',
      operationId: record.id,
      cached: true,
      providerOperationId: record.provider_operation_id,
      resultPayload: record.result_payload,
      detail: 'Operation already completed successfully. Returning cached result.',
    }
  }

  if (record.status === 'failed') {
    return {
      hasExecutionPermission: false,
      status: 'failed',
      operationId: record.id,
      cached: true,
      errorCode: record.error_code,
      errorMessage: record.error_message,
      detail: 'Operation previously failed terminally. Returning cached failure.',
    }
  }

  if (record.status === 'processing' || record.status === 'claimed') {
    return {
      hasExecutionPermission: false,
      status: record.status,
      operationId: record.id,
      inFlight: true,
      detail: 'Operation is currently in-flight by another execution attempt.',
    }
  }

  if (record.status === 'unknown') {
    return {
      hasExecutionPermission: false,
      status: 'unknown',
      operationId: record.id,
      reconciliationRequired: true,
      detail: 'Operation is in an unknown state from a prior attempt; automated retry is blocked.',
    }
  }

  return {
    hasExecutionPermission: false,
    status: record.status,
    operationId: record.id,
  }
}

/**
 * Transitions an operation from 'claimed' to 'processing'.
 */
export async function transitionToProcessing(
  operationId: string,
  context: ExternalAdapterContext
): Promise<void> {
  if (context.executionMode === 'sandbox') return

  const rec = await activeStore.findByKey(context.idempotencyKey)
  if (!rec || rec.id !== operationId) {
    throw new Error(`Operation ${operationId} not found for status transition.`)
  }

  if (rec.status !== 'claimed') {
    throw new InvalidStatusTransitionError(
      `Cannot transition operation from ${rec.status} to processing. Allowed initial state: claimed.`
    )
  }

  await activeStore.updateStatus(operationId, { status: 'processing' })
}

export interface CompleteExternalOperationOutcome {
  providerOperationId?: string | null
  resultPayload?: any
}

/**
 * Completes an operation with definitive success and persists sanitized outcome.
 */
export async function completeExternalOperation(
  operationId: string,
  outcome: CompleteExternalOperationOutcome,
  context: ExternalAdapterContext
): Promise<void> {
  if (context.executionMode === 'sandbox') return

  const rec = await activeStore.findByKey(context.idempotencyKey)
  if (!rec || rec.id !== operationId) {
    throw new Error(`Operation ${operationId} not found for completion.`)
  }

  if (rec.status !== 'processing' && rec.status !== 'claimed') {
    throw new InvalidStatusTransitionError(
      `Cannot complete operation in status: ${rec.status}. Expected processing or claimed.`
    )
  }

  const sanitizedResult = sanitizeResultPayload(outcome.resultPayload ?? {})

  await activeStore.updateStatus(operationId, {
    status: 'succeeded',
    provider_operation_id: outcome.providerOperationId ?? null,
    result_payload: sanitizedResult,
    completed_at: new Date().toISOString(),
  })
}

export interface FailExternalOperationError {
  code?: string | null
  message: string
}

/**
 * Fails an operation terminally with error details.
 */
export async function failExternalOperation(
  operationId: string,
  error: FailExternalOperationError,
  context: ExternalAdapterContext
): Promise<void> {
  if (context.executionMode === 'sandbox') return

  const rec = await activeStore.findByKey(context.idempotencyKey)
  if (!rec || rec.id !== operationId) {
    throw new Error(`Operation ${operationId} not found for failure recording.`)
  }

  if (rec.status !== 'processing' && rec.status !== 'claimed') {
    throw new InvalidStatusTransitionError(
      `Cannot fail operation in status: ${rec.status}. Expected processing or claimed.`
    )
  }

  await activeStore.updateStatus(operationId, {
    status: 'failed',
    error_code: error.code || 'PROVIDER_ERROR',
    error_message: error.message,
    completed_at: new Date().toISOString(),
  })
}

/**
 * Marks an operation as 'unknown' due to timeout or network disconnection.
 * Explicitly: This operation CANNOT automatically become processing again.
 */
export async function markExternalOperationUnknown(
  operationId: string,
  reason: string,
  context: ExternalAdapterContext
): Promise<void> {
  if (context.executionMode === 'sandbox') return

  const rec = await activeStore.findByKey(context.idempotencyKey)
  if (!rec || rec.id !== operationId) {
    throw new Error(`Operation ${operationId} not found for unknown marking.`)
  }

  if (rec.status !== 'processing' && rec.status !== 'claimed') {
    throw new InvalidStatusTransitionError(
      `Cannot mark operation unknown from status: ${rec.status}. Expected processing or claimed.`
    )
  }

  await activeStore.updateStatus(operationId, {
    status: 'unknown',
    error_code: 'UNKNOWN_OUTCOME',
    error_message: reason,
    completed_at: new Date().toISOString(),
  })
}
