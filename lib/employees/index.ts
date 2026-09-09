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
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  getCanonicalEmployees,
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
} from './types'

export {
  CANONICAL_EMPLOYEES,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  getCanonicalEmployees,
  getEmployees,
  getEmployeeBySlug,
  getEmployeeById,
  type AIEmployee,
  type AIEmployeeStatus,
  type AIEmployeePricing,
  type AIEmployeeDemoConfig,
}

/**
 * Returns all active AI Employees, preferring Supabase if populated,
 * falling back to the canonical workforce registry.
 */
export async function getAllEmployees(): Promise<AIEmployee[]> {
  return getEmployees()
}

