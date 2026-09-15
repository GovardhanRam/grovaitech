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

export interface ValidateRecipeConfigurationResult {
  success: boolean
  valid: boolean
  errors: string[]
  sanitizedConfig?: Record<string, unknown>
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
