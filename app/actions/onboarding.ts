'use server'

/**
 * Grovaitech AI Platform
 * app/actions/onboarding.ts
 *
 * Server Actions for Workspace Onboarding.
 */

import {
  createTenantWorkspace,
  provisionTenantClient,
  type CreateTenantOnboardingInput,
  type ProvisionTenantClientInput,
} from '@/lib/auth/onboarding'
import { acceptTenantInvitation } from '@/lib/auth/invitations'

export async function submitWorkspaceOnboarding(input: CreateTenantOnboardingInput) {
  return await createTenantWorkspace(input)
}

export async function submitAcceptInvitation(token: string) {
  return await acceptTenantInvitation(token)
}

export async function provisionTenantClientAction(input: ProvisionTenantClientInput) {
  return await provisionTenantClient(input)
}
