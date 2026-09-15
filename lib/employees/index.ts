/**
 * Grovaitech AI Platform
 * lib/employees/index.ts
 *
 * Employee Data Access & Control Plane.
 * Bridges Supabase persistent employee records with the canonical workforce registry fallback.
 */

import { createServerClient } from '@/lib/supabase/server'
import {
  CANONICAL_EMPLOYEES,
  MARKETPLACE_EMPLOYEES,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  getCanonicalEmployees,
  getMarketplaceEmployees,
} from './registry'
import {
  getEmployees,
  getEmployeeBySlug,
  getEmployeeById,
} from './queries'
import type {
  AIEmployee,
  AIEmployeeStatus,
  AIEmployeePricing,
  AIEmployeeDemoConfig,
  MarketplaceCategory,
  DeploymentMode,
} from './types'

export {
  CANONICAL_EMPLOYEES,
  MARKETPLACE_EMPLOYEES,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  getCanonicalEmployees,
  getMarketplaceEmployees,
  getEmployees,
  getEmployeeBySlug,
  getEmployeeById,
  type AIEmployee,
  type AIEmployeeStatus,
  type AIEmployeePricing,
  type AIEmployeeDemoConfig,
  type MarketplaceCategory,
  type DeploymentMode,
}

/**
 * Returns all active AI Employees, preferring Supabase if populated,
 * falling back to the canonical workforce registry.
 */
export async function getAllEmployees(): Promise<AIEmployee[]> {
  return getEmployees()
}

