import { describe, it, expect } from 'vitest'
import {
  CANONICAL_EMPLOYEES,
  getCanonicalEmployees,
  getCanonicalEmployeeBySlug,
  getAllEmployees,
  getEmployeeBySlug,
} from '@/lib/employees'
import { resolveAuthorizedTools, getDefaultSystemPrompt } from '@/lib/ai/runtime'

describe('lib/employees/registry - Canonical AI Employee Control Plane', () => {
  it('1. returns exactly 10 canonical employees', () => {
    const list = getCanonicalEmployees()
    expect(list).toHaveLength(10)
    expect(CANONICAL_EMPLOYEES).toHaveLength(10)
  })

  it('2. verifies real-estate-lead-receptionist is live, demo-enabled, and has tools bound', () => {
    const emp = getCanonicalEmployeeBySlug('real-estate-lead-receptionist')
    expect(emp).toBeDefined()
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['create_lead', 'schedule_site_visit', 'search_knowledge_base'])
    expect(emp?.system_prompt).toContain('Real Estate Lead Receptionist')
  })

  it('3. verifies clinic-receptionist is live, demo-enabled, and has clinic tools bound', () => {
    const emp = getCanonicalEmployeeBySlug('clinic-receptionist')
    expect(emp).toBeDefined()
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['book_clinic_appointment', 'search_knowledge_base'])
    expect(emp?.system_prompt).toContain('Medical & Dental Clinic')
  })

  it('4. falls back to canonical registry when database query is empty or missing record', async () => {
    const emp = await getEmployeeBySlug('clinic-receptionist')
    expect(emp).toBeDefined()
    expect(emp?.slug).toBe('clinic-receptionist')
    expect(emp?.status).toBe('live')

    const all = await getAllEmployees()
    expect(all.length).toBeGreaterThanOrEqual(10)
  })

  it('5. resolves authorized tools dynamically from employee registry', () => {
    const realEstateTools = resolveAuthorizedTools('real-estate-lead-receptionist')
    const realEstateToolNames = realEstateTools.map((t) => t.name)
    expect(realEstateToolNames).toContain('create_lead')
    expect(realEstateToolNames).toContain('schedule_site_visit')
    expect(realEstateToolNames).toContain('search_knowledge_base')
    expect(realEstateToolNames).not.toContain('book_clinic_appointment')

    const clinicTools = resolveAuthorizedTools('clinic-receptionist')
    const clinicToolNames = clinicTools.map((t) => t.name)
    expect(clinicToolNames).toContain('book_clinic_appointment')
    expect(clinicToolNames).toContain('search_knowledge_base')
    expect(clinicToolNames).not.toContain('create_lead')
  })

  it('6. resolves default system prompt from employee registry', () => {
    const realEstatePrompt = getDefaultSystemPrompt('real-estate-lead-receptionist')
    expect(realEstatePrompt).toContain('Real Estate Lead Receptionist')

    const clinicPrompt = getDefaultSystemPrompt('clinic-receptionist')
    expect(clinicPrompt).toContain('Medical & Dental Clinic')

    const fallbackPrompt = getDefaultSystemPrompt('unknown-custom-employee')
    expect(fallbackPrompt).toContain('AI Lead Receptionist for Grovaitech')
  })
})
