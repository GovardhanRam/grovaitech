/**
 * Grovaitech AI Platform
 * lib/integrations/crypto.ts
 *
 * AES-256-GCM Server-Only Cryptographic Engine for Tenant Credentials.
 * Encrypts sensitive API tokens and OAuth secrets at rest.
 * Uses 32-byte master key from ENCRYPTION_MASTER_KEY.
 * Never leaks secret values or exposes master key to client bundles.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // Standard 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16 // 128-bit authentication tag

export interface EncryptedEnvelope {
  version: number
  iv: string // Hex-encoded 12-byte IV
  tag: string // Hex-encoded 16-byte authentication tag
  ciphertext: string // Hex-encoded ciphertext
}

/**
 * Validates and retrieves the 32-byte master encryption key from environment.
 * Fails closed if missing, empty, or improperly sized.
 */
function getMasterKey(customKey?: string): Buffer {
  const rawKey = (customKey || process.env.ENCRYPTION_MASTER_KEY || '').trim()

  if (!rawKey) {
    throw new Error('ENCRYPTION_MASTER_KEY is not configured in environment. Failed closed.')
  }

  // Key can be provided as a 64-character hex string or exactly 32-byte utf-8 string
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex')
  }

  const keyBuffer = Buffer.from(rawKey, 'utf8')
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be exactly 32 bytes (or 64 hex characters). Failed closed.')
  }

  return keyBuffer
}

/**
 * Encrypts a plaintext secret string using AES-256-GCM with a random IV.
 * Returns a serialized JSON string containing the encrypted envelope.
 */
export function encryptSecret(
  plaintext: string,
  options?: { keyVersion?: number; customMasterKey?: string }
): string {
  if (typeof plaintext !== 'string') {
    throw new Error('encryptSecret: plaintext must be a string')
  }

  const key = getMasterKey(options?.customMasterKey)
  const iv = crypto.randomBytes(IV_LENGTH)
  const version = options?.keyVersion || 1

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  // Set AAD (Additional Authenticated Data) to bind key version
  cipher.setAAD(Buffer.from(`v${version}`, 'utf8'))

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  const envelope: EncryptedEnvelope = {
    version,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted,
  }

  return JSON.stringify(envelope)
}

/**
 * Decrypts an encrypted envelope using AES-256-GCM.
 * Validates authentication tag and version AAD; throws error if tampered or corrupt.
 */
export function decryptSecret(
  serializedEnvelope: string,
  options?: { customMasterKey?: string }
): string {
  if (!serializedEnvelope || typeof serializedEnvelope !== 'string') {
    throw new Error('decryptSecret: payload must be a non-empty string')
  }

  let envelope: EncryptedEnvelope
  try {
    envelope = JSON.parse(serializedEnvelope)
  } catch {
    throw new Error('decryptSecret: Malformed encrypted envelope JSON. Failed closed.')
  }

  const { version, iv: ivHex, tag: tagHex, ciphertext: cipherHex } = envelope

  if (!version || !ivHex || !tagHex || cipherHex === undefined) {
    throw new Error('decryptSecret: Invalid encrypted envelope format. Missing required fields.')
  }

  const key = getMasterKey(options?.customMasterKey)
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')

  if (iv.length !== IV_LENGTH) {
    throw new Error('decryptSecret: Invalid IV length.')
  }

  if (tag.length !== AUTH_TAG_LENGTH) {
    throw new Error('decryptSecret: Invalid authentication tag length.')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  decipher.setAAD(Buffer.from(`v${version}`, 'utf8'))
  decipher.setAuthTag(tag)

  try {
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err: any) {
    // Fail closed without revealing secret details
    throw new Error('decryptSecret: Authentication tag validation failed or ciphertext is corrupt.')
  }
}
