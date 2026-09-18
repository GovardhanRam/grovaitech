'use server'

/**
 * Grovaitech AI Platform
 * app/actions/recipes.ts
 *
 * Server Actions for Employee Recipes & Operating Configurations.
 * Uses canonical EmployeeConfigurationSchema directly for validation.
 */

import { getRecipeBySlug } from '@/lib/recipes'
import type { ValidationResult } from '@/lib/recipes'
import {
  executeSocialMediaRunner,
  type SocialMediaContentPackage,
} from '@/lib/recipes/social-media-runner'
import { isValidTenantId } from '@/lib/knowledge'
import { requireTenantAccess } from '@/lib/auth'

export interface ValidateRecipeConfigurationResult {
  success: boolean
  valid: boolean
  errors: string[]
  sanitizedConfig?: Record<string, unknown>
}

export interface ExecuteSocialMediaRecipeParams {
  recipeSlug: string
  config: Record<string, unknown>
  clientId?: string
}

export interface ExecuteSocialMediaRecipeResult {
  success: boolean
  contentPackage?: SocialMediaContentPackage
  executionId?: string
  status?: string
  error?: string
}

/**
 * Server action to validate recipe configuration against the canonical schema.
 * Pure and deterministic. Strictly invokes recipe.configurationSchema.validate().
 */
export async function validateRecipeConfiguration(
  recipeSlug: string,
  config: Record<string, unknown>
): Promise<ValidateRecipeConfigurationResult> {
  if (!recipeSlug || typeof recipeSlug !== 'string') {
    return {
      success: false,
      valid: false,
      errors: ['A valid recipe slug is required.'],
    }
  }

  const recipe = getRecipeBySlug(recipeSlug)
  if (!recipe) {
    return {
      success: false,
      valid: false,
      errors: [`No canonical recipe found for slug "${recipeSlug}".`],
    }
  }

  const validation: ValidationResult = recipe.configurationSchema.validate(config)

  return {
    success: true,
    valid: validation.valid,
    errors: validation.errors,
    sanitizedConfig: validation.valid ? config : undefined,
  }
}

/**
 * Authenticated server action to execute the Social Media Marketing AI Employee recipe.
 * Validates configuration, verifies tenant boundaries, and coordinates the 4 AI stages.
 */
export async function executeSocialMediaRecipe(
  params: ExecuteSocialMediaRecipeParams
): Promise<ExecuteSocialMediaRecipeResult> {
  const { recipeSlug, config, clientId: rawClientId } = params || {}

  // 1. Validate Recipe Identity
  if (!recipeSlug || recipeSlug !== 'social-media-marketing') {
    return {
      success: false,
      error: `Unsupported recipe "${recipeSlug}". Only "social-media-marketing" is executable in Phase 2B.`,
    }
  }

  // 2. Validate Configuration against canonical schema
  const validationResult = await validateRecipeConfiguration(recipeSlug, config || {})
  if (!validationResult.valid) {
    return {
      success: false,
      error: `Configuration validation failed: ${validationResult.errors.join(', ')}`,
    }
  }

  // 3. Resolve Authenticated User & Tenant Context
  let verifiedClientId: string | undefined = undefined

  try {
    if (rawClientId && typeof rawClientId === 'string') {
      const cleanClientId = rawClientId.trim()
      if (!isValidTenantId(cleanClientId)) {
        return {
          success: false,
          error: 'Invalid client tenant identifier format.',
        }
      }

      // Explicit demo prefix support for offline/demo workflows
      const isPermittedDemo = cleanClientId.startsWith('demo-') || cleanClientId.startsWith('client-demo-')
      if (isPermittedDemo) {
        verifiedClientId = cleanClientId
      } else {
        const auth = await requireTenantAccess(cleanClientId)
        if (!auth.success) {
          return {
            success: false,
            error: `Unauthorized or unverified tenant identifier "${cleanClientId}": ${auth.error}`,
          }
        }
        verifiedClientId = auth.tenantId
      }
    } else {
      // If no explicit clientId provided, attempt to resolve primary active tenant
      const auth = await requireTenantAccess()
      if (auth.success) {
        verifiedClientId = auth.tenantId
      }
    }
  } catch (authErr: any) {
    console.warn('[Recipe Action] Auth/Tenant resolution notice:', authErr?.message || authErr)
  }

  // 4. Execute the Recipe Runner
  const runnerResult = await executeSocialMediaRunner({
    clientId: verifiedClientId,
    config: config || {},
    persistExecution: true,
  })

  if (!runnerResult.success) {
    return {
      success: false,
      error: runnerResult.error || 'Execution failed during AI pipeline stages.',
    }
  }

  return {
    success: true,
    contentPackage: runnerResult.contentPackage,
    executionId: runnerResult.contentPackage?.executionId,
    status: runnerResult.contentPackage?.approvalStatus,
  }
}

