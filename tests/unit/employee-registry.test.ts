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
  it('1. returns exactly 12 canonical employees', () => {
    const list = getCanonicalEmployees()
    expect(list).toHaveLength(12)
    expect(CANONICAL_EMPLOYEES).toHaveLength(12)
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

  it('7. verifies hvac-lead-recovery is live, demo-enabled, with authorized tools and prompt', () => {
    const emp = getCanonicalEmployeeBySlug('hvac-lead-recovery')
    expect(emp).toBeDefined()
    expect(emp?.id).toBe('emp-011')
    expect(emp?.status).toBe('live')
    expect(emp?.department).toBe('Sales & Dispatch')
    expect(emp?.industry).toBe('Home Services / HVAC')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['create_lead', 'search_knowledge_base', 'escalate_to_human'])
    expect(emp?.system_prompt).toContain('Home Services Receptionist and Lead Recovery')
    expect(emp?.system_prompt).toContain('SAFETY & HAZARD ESCALATION')

    const tools = resolveAuthorizedTools('hvac-lead-recovery')
    const toolNames = tools.map((t) => t.name)
    expect(toolNames).toEqual(['create_lead', 'search_knowledge_base', 'escalate_to_human'])

    const prompt = getDefaultSystemPrompt('hvac-lead-recovery')
    expect(prompt).toContain('SAFETY & HAZARD ESCALATION')

    const keywordPrompt = getDefaultSystemPrompt('residential-hvac-support')
    expect(keywordPrompt).toContain('SAFETY & HAZARD ESCALATION')
  })

  it('8. verifies gbp-growth-manager is live, demo-enabled, with authorized tools and prompt', () => {
    const emp = getCanonicalEmployeeBySlug('gbp-growth-manager')
    expect(emp).toBeDefined()
    expect(emp?.id).toBe('emp-012')
    expect(emp?.title).toBe('GBP Growth & Reputation Manager')
    expect(emp?.status).toBe('live')
    expect(emp?.department).toBe('Marketing & Local SEO')
    expect(emp?.industry).toBe('Local Businesses')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['audit_gbp_profile', 'draft_review_reply', 'create_gbp_post', 'search_knowledge_base'])
    expect(emp?.system_prompt).toContain('Google Business Profile Growth & Reputation Manager')
    expect(emp?.system_prompt).toContain('NO FALSE MODIFICATION CLAIMS')
  })

  it('9. verifies 100% of canonical employees do not expose sensitive credentials or keys', () => {
    const sensitiveKeyPattern = /^(api[_-]?key|secret|password|token|credential|private[_-]?key)$/i

    function findSensitiveKeys(obj: unknown, path = ''): string[] {
      if (!obj || typeof obj !== 'object') return []
      const found: string[] = []

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          found.push(...findSensitiveKeys(item, `${path}[${idx}]`))
        })
        return found
      }

      for (const [key, val] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key
        if (sensitiveKeyPattern.test(key)) {
          found.push(currentPath)
        }
        found.push(...findSensitiveKeys(val, currentPath))
      }

      return found
    }

    for (const emp of CANONICAL_EMPLOYEES) {
      const sensitiveKeys = findSensitiveKeys(emp)
      expect(sensitiveKeys, `Found sensitive keys in ${emp.slug}: ${sensitiveKeys.join(', ')}`).toEqual([])
      expect(emp.system_prompt).toBeDefined()
      expect(emp.system_prompt?.length).toBeGreaterThan(20)
      expect(emp.tools.length).toBeGreaterThan(0)
    }
  })

  it('10. handles edge-case and boundary inputs gracefully in canonical lookup functions', async () => {
    const invalidInputs = ['', '   ', '!!!@@@###', 'a'.repeat(500)]

    for (const input of invalidInputs) {
      expect(getCanonicalEmployeeBySlug(input)).toBeUndefined()
      expect(await getEmployeeBySlug(input)).toBeNull()
    }

    expect(getCanonicalEmployeeBySlug(null as unknown as string)).toBeUndefined()
    expect(getCanonicalEmployeeBySlug(undefined as unknown as string)).toBeUndefined()
    expect(await getEmployeeBySlug(null as unknown as string)).toBeNull()
    expect(await getEmployeeBySlug(undefined as unknown as string)).toBeNull()
  })
})


