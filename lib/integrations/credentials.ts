/**
 * Grovaitech AI Platform
 * lib/integrations/credentials.ts
 *
 * Server-Only Credential Resolution Boundary.
 * Resolves external provider credentials without exposing secret values to the client,
 * keeping runtime_config free of tokens, and distinguishing tenant vs global configs.
 */

import type {
  CredentialResolutionResult,
  WhatsAppAdapterCredentials,
  GoogleCalendarAdapterCredentials,
  N8nAdapterCredentials,
} from './types'

export interface ResolveCredentialsParams {
  clientId?: string
  deploymentId?: string
  phoneNumberId?: string
}

/**
 * Resolves Meta WhatsApp Cloud API credentials.
 * Distinguishes deployment-scoped credentials from global environment tokens.
 * A global token is NOT tenant-isolated and returns RESTRICTED to prevent live tenant dispatch.
 */
export function resolveWhatsAppCredentials(
  params: ResolveCredentialsParams
): CredentialResolutionResult<WhatsAppAdapterCredentials> {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '').trim()
  const phoneId = params.phoneNumberId?.trim() || (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '').trim()

  const hasToken = token.length > 10 && !token.includes('placeholder')
  const hasPhoneId = phoneId.length > 5 && !phoneId.includes('placeholder')

  if (!hasToken || !hasPhoneId) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: 'WhatsApp credentials (access token or phone number ID) are not configured.',
    }
  }

  // Deployment-scoped credentials: when deploymentId and phoneNumberId are explicitly provided
  if (params.deploymentId && params.phoneNumberId) {
    return {
      status: 'CONFIGURED',
      source: 'deployment',
      credentials: {
        accessToken: token,
        fromPhoneNumberId: params.phoneNumberId.trim(),
      },
    }
  }

  // Global-only credentials: NOT tenant-safe for live activation
  return {
    status: 'RESTRICTED',
    source: 'global',
    reason: 'Global Meta WhatsApp access token is not tenant-isolated and cannot be used for live tenant dispatch.',
    credentials: {
      accessToken: token,
      fromPhoneNumberId: phoneId,
    },
  }
}

/**
 * Resolves Google Calendar API credentials.
 * Currently NOT_CONFIGURED across all deployments (no OAuth / service account enabled yet).
 */
export function resolveGoogleCalendarCredentials(
  params: ResolveCredentialsParams
): CredentialResolutionResult<GoogleCalendarAdapterCredentials> {
  // Calendar authentication is not yet enabled in the application foundation.
  return {
    status: 'NOT_CONFIGURED',
    source: 'none',
    reason: 'Google Calendar API adapter is not configured or authenticated in this phase.',
  }
}

/**
 * Resolves n8n Webhook Pipeline credentials.
 * A configured URL alone lacks cryptographic authentication/signatures and returns RESTRICTED.
 */
export function resolveN8nCredentials(
  params: ResolveCredentialsParams
): CredentialResolutionResult<N8nAdapterCredentials> {
  const webhookUrl = (process.env.N8N_WEBHOOK_URL || '').trim()

  if (!webhookUrl || webhookUrl.includes('placeholder') || webhookUrl.includes('grovaitech.ai')) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: 'n8n webhook URL is not configured with an active external endpoint.',
    }
  }

  // URL-only configuration lacks cryptographic authentication and signatures
  return {
    status: 'RESTRICTED',
    source: 'global',
    reason: 'n8n webhook is URL-only and lacks cryptographic authentication/signatures.',
    credentials: {
      webhookUrl,
    },
  }
}
