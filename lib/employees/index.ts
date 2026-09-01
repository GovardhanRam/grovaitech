/**
 * Grovaitech AI Platform
 * lib/employees/index.ts
 *
 * Employee Data Access & Control Plane.
 * Bridges Supabase persistent employee records with the canonical workforce registry fallback.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { createMockServerClient } from '@/lib/supabase/mockServer'
import {
  CANONICAL_EMPLOYEES,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployees,
  type AIEmployee,
  type AIEmployeePricing,
  type AIEmployeeDemoConfig,
} from './registry'

export {
  CANONICAL_EMPLOYEES,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployees,
  type AIEmployee,
  type AIEmployeePricing,
  type AIEmployeeDemoConfig,
}

const getPublicClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('placeholder') || url === '') {
    return createMockServerClient() as any
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Returns all active AI Employees, preferring Supabase if populated,
 * falling back to the canonical 10-employee registry.
 */
export async function getAllEmployees(): Promise<AIEmployee[]> {
  try {
    const supabase = getPublicClient()

    const { data, error } = await supabase
      .from('ai_employees')
      .select('*')
      .order('name', { ascending: true })

    if (error || !data || data.length === 0) {
      return getCanonicalEmployees()
    }

    return data
  } catch (err) {
    console.warn('[Employee Registry] Fallback to canonical workforce:', err)
    return getCanonicalEmployees()
  }
}

/**
 * Resolves an AI Employee by slug. Checks Supabase first; if not found,
 * resolves from canonical in-memory registry.
 */
export async function getEmployeeBySlug(slug: string): Promise<AIEmployee | null> {
  if (!slug) return null

  try {
    const supabase = getPublicClient()

    const { data, error } = await supabase
      .from('ai_employees')
      .select('*')
      .eq('slug', slug)
      .single()

    if (data && !error) {
      return data
    }
  } catch (err) {
    console.warn('[Employee Registry] getEmployeeBySlug notice:', err)
  }

  return getCanonicalEmployeeBySlug(slug) || null
}

/**
 * Resolves an AI Employee by unique ID. Checks Supabase first; if not found,
 * resolves from canonical in-memory registry.
 */
export async function getEmployeeById(id: string): Promise<AIEmployee | null> {
  if (!id) return null

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('ai_employees')
      .select('*')
      .eq('id', id)
      .single()

    if (data && !error) {
      return data
    }
  } catch (err) {
    console.warn('[Employee Registry] getEmployeeById notice:', err)
  }

  return CANONICAL_EMPLOYEES.find((emp) => emp.id === id) || null
}
