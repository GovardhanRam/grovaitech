/**
 * Grovaitech AI Platform
 * lib/employees/queries.ts
 *
 * Direct database queries and data-access routines for AI Employees.
 * Provides resilient access with Supabase client (or mock client) and canonical registry fallbacks.
 */

import { createServerClient } from '@/lib/supabase/server';
import {
  getCanonicalEmployees,
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
} from './registry';
import type { AIEmployee } from './types';

/**
 * Returns all active AI Employees, preferring Supabase ai_employees table if populated,
 * and falling back gracefully to the canonical in-memory registry.
 */
export async function getEmployees(): Promise<AIEmployee[]> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('ai_employees')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return getCanonicalEmployees();
    }

    return data as AIEmployee[];
  } catch (err) {
    console.warn('[Employee Queries] Fallback to canonical workforce:', err);
    return getCanonicalEmployees();
  }
}

/**
 * Resolves an AI Employee by slug. Checks Supabase first; if not found,
 * resolves from canonical in-memory registry.
 */
export async function getEmployeeBySlug(slug: string): Promise<AIEmployee | null> {
  if (!slug) return null;

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('ai_employees')
      .select('*')
      .eq('slug', slug)
      .single();

    if (data && !error) {
      return data as AIEmployee;
    }
  } catch (err) {
    console.warn('[Employee Queries] getEmployeeBySlug notice:', err);
  }

  return getCanonicalEmployeeBySlug(slug) || null;
}

/**
 * Resolves an AI Employee by unique ID. Checks Supabase first; if not found,
 * resolves from canonical in-memory registry.
 */
export async function getEmployeeById(id: string): Promise<AIEmployee | null> {
  if (!id) return null;

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('ai_employees')
      .select('*')
      .eq('id', id)
      .single();

    if (data && !error) {
      return data as AIEmployee;
    }
  } catch (err) {
    console.warn('[Employee Queries] getEmployeeById notice:', err);
  }

  return getCanonicalEmployeeById(id) || null;
}
