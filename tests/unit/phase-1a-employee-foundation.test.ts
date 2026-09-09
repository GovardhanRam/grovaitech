import { describe, it, expect } from 'vitest'
import {
  getEmployees,
  getEmployeeBySlug,
  getEmployeeById,
  getAllEmployees,
  type AIEmployee,
} from '@/lib/employees'

describe('Phase 1A: AI Employee Foundation & Service Layer', () => {
  it('1. exports getEmployees, getEmployeeBySlug, and getEmployeeById functions', () => {
    expect(typeof getEmployees).toBe('function')
    expect(typeof getEmployeeBySlug).toBe('function')
    expect(typeof getEmployeeById).toBe('function')
    expect(typeof getAllEmployees).toBe('function')
  })

  it('2. retrieves Employee #1 (clinic-receptionist) with verified properties and zero exposed secrets', async () => {
    const employee = await getEmployeeBySlug('clinic-receptionist')
    expect(employee).toBeDefined()
    expect(employee?.name).toBe('Clinic Receptionist')
    expect(employee?.slug).toBe('clinic-receptionist')
    expect(employee?.title).toBe('AI Medical Front-Desk')
    expect(employee?.industry).toBe('Healthcare')
    expect(employee?.status).toBe('live')

    // Verified capabilities
    expect(employee?.capabilities).toContain('Appointment booking')
    expect(employee?.capabilities).toContain('FAQ answering')

    // Verified responsibilities
    expect(employee?.responsibilities).toContain('Book appointments')
    expect(employee?.responsibilities).toContain('Answer clinic FAQs')

    // Only supported channels
    expect(employee?.channels).toContain('Web Chat')

    // Does not expose private keys or raw secrets
    expect((employee as any).apiKey).toBeUndefined()
    expect((employee as any).api_key).toBeUndefined()
    expect((employee as any).secret_key).toBeUndefined()
  })

  it('3. returns null for non-existent employee slug', async () => {
    const nonExistent = await getEmployeeBySlug('non-existent-employee-xyz')
    expect(nonExistent).toBeNull()
  })

  it('4. returns null for non-existent employee id', async () => {
    const nonExistent = await getEmployeeById('emp-invalid-999999')
    expect(nonExistent).toBeNull()
  })

  it('5. retrieves all employees catalog with valid structure', async () => {
    const employees = await getEmployees()
    expect(Array.isArray(employees)).toBe(true)
    expect(employees.length).toBeGreaterThanOrEqual(1)

    const clinicEmp = employees.find((e) => e.slug === 'clinic-receptionist')
    expect(clinicEmp).toBeDefined()
    expect(clinicEmp?.status).toBe('live')
  })
})
