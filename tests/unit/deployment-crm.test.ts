/**
 * Grovaitech AI Platform
 * tests/unit/deployment-crm.test.ts
 *
 * Unit and contract tests for the Prospect -> CRM Conversion Slice.
 * Tests saveQualifiedProspectToCrm(), payload mapping, createLead delegation,
 * update handling, error handling, and demo sandbox isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveQualifiedProspectToCrm,
  executeDeploymentDemoAction,
  analyzeProspectForDeployment,
} from '@/app/actions/deployment'
import { createLead } from '@/app/actions/leads'
import type { Prospect } from '@/lib/deployment'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
}))

describe('Deployment Engine -> CRM Conversion Vertical Slice', () => {
  let mockGenerateContentWithTools: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContentWithTools = vi.fn()

    vi.mocked(Gemini).mockImplementation(
      () =>
        ({
          generateContentWithTools: mockGenerateContentWithTools,
          generateText: vi.fn(),
          generateContent: vi.fn(),
          getEmbeddings: vi.fn(),
        } as any)
    )
  })

  // A. Missing required field
  it('A. rejects an unqualified prospect missing any of the 5 mandatory CRM fields', async () => {
    // Missing phone & budget
    const unqualifiedProspect: Prospect = {
      company_name: 'Apex Realtors',
      industry: 'Real Estate',
      contact_name: 'Vikram Sharma',
      location: 'Tirupati, AP',
      timeline: '3 months',
      // phone is missing
      // budget is missing
    }

    const res = await saveQualifiedProspectToCrm(unqualifiedProspect)

    expect(res.success).toBe(false)
    expect(res.error).toContain('Prospect is not CRM-ready')
    expect(res.missingFields).toEqual(expect.arrayContaining(['phone', 'budget']))
    // Crucial: createLead must NOT be called for an unqualified prospect
    expect(createLead).not.toHaveBeenCalled()
  })

  it('A2. rejects invalid or non-object prospect inputs', async () => {
    const res = await saveQualifiedProspectToCrm(null as any)
    expect(res.success).toBe(false)
    expect(res.error).toContain('Invalid input')
    expect(createLead).not.toHaveBeenCalled()
  })

  // B. Qualified prospect payload mapping
  it('B. verifies correct CRM payload mapping for a fully qualified prospect', async () => {
    const qualifiedProspect: Prospect = {
      company_name: 'Apex Realtors',
      industry: 'Real Estate',
      contact_name: 'Vikram Sharma',
      phone: '+91 98765 43210',
      location: 'Tirupati, AP',
      budget: '?1.5 Crore',
      timeline: '3 months',
      email: 'vikram@apexrealtors.com',
    }

    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-mapped-101',
        name: 'Vikram Sharma',
        phone: '+91 98765 43210',
        location: 'Tirupati, AP',
        budget: '?1.5 Crore',
        timeline: '3 months',
        notes: 'Deployment analysis for prospect: Apex Realtors (Real Estate)',
        source: 'website',
      },
      isUpdate: false,
    } as any)

    const res = await saveQualifiedProspectToCrm(qualifiedProspect)

    expect(res.success).toBe(true)
    expect(createLead).toHaveBeenCalledTimes(1)
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Vikram Sharma',
        phone: '+91 98765 43210',
        location: 'Tirupati, AP',
        budget: '?1.5 Crore',
        timeline: '3 months',
        notes: 'Deployment analysis for prospect: Apex Realtors (Real Estate)',
        source: 'website',
      })
    )
  })

  // C. Successful creation
  it('C. handles new lead creation with isUpdate=false metadata and returns lead data', async () => {
    const qualifiedProspect: Prospect = {
      company_name: 'CareWell Clinic',
      industry: 'Healthcare',
      contact_name: 'Dr. Suresh Kumar',
      phone: '+91 94400 12345',
      location: 'Nellore, AP',
      budget: '?50,000/month',
      timeline: 'Immediate',
    }

    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-new-202',
        name: 'Dr. Suresh Kumar',
        phone: '+91 94400 12345',
        lead_status: 'qualified',
      },
      isUpdate: false,
    } as any)

    const res = await saveQualifiedProspectToCrm(qualifiedProspect)

    expect(res.success).toBe(true)
    expect(res.isUpdate).toBe(false)
    expect(res.data?.id).toBe('lead-new-202')
  })

  // D. Existing lead update
  it('D. handles existing lead update with isUpdate=true metadata', async () => {
    const qualifiedProspect: Prospect = {
      company_name: 'CareWell Clinic',
      industry: 'Healthcare',
      contact_name: 'Dr. Suresh Kumar',
      phone: '+91 94400 12345',
      location: 'Nellore, AP',
      budget: '?75,000/month',
      timeline: 'Within 1 month',
    }

    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-existing-202',
        name: 'Dr. Suresh Kumar',
        phone: '+91 94400 12345',
        budget: '?75,000/month',
        lead_status: 'qualified',
      },
      isUpdate: true,
    } as any)

    const res = await saveQualifiedProspectToCrm(qualifiedProspect)

    expect(res.success).toBe(true)
    expect(res.isUpdate).toBe(true)
    expect(res.data?.id).toBe('lead-existing-202')
    expect(res.data?.budget).toBe('?75,000/month')
  })

  // E. Database/action failure
  it('E. handles createLead failure or exception gracefully and returns structured error', async () => {
    const qualifiedProspect: Prospect = {
      company_name: 'Apex Realtors',
      industry: 'Real Estate',
      contact_name: 'Vikram Sharma',
      phone: '+91 98765 43210',
      location: 'Tirupati, AP',
      budget: '?1.5 Crore',
      timeline: '3 months',
    }

    // Sub-case 1: createLead returns { success: false, error: '...' }
    vi.mocked(createLead).mockResolvedValueOnce({
      success: false,
      error: 'Database connection timeout on lead insert.',
    } as any)

    const res1 = await saveQualifiedProspectToCrm(qualifiedProspect)
    expect(res1.success).toBe(false)
    expect(res1.error).toContain('Database connection timeout')

    // Sub-case 2: createLead throws an unexpected exception
    vi.mocked(createLead).mockRejectedValueOnce(new Error('Network socket disconnected'))

    const res2 = await saveQualifiedProspectToCrm(qualifiedProspect)
    expect(res2.success).toBe(false)
    expect(res2.error).toContain('Network socket disconnected')
  })

  // F. Sandbox isolation
  it('F. confirms sandbox demo execution remains side-effect free and does not invoke CRM lead creation', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      replyText: 'Hello! I can help schedule your villa tour.',
      functionCalls: [],
      toolResults: [],
    })

    const prospect: Prospect = {
      company_name: 'Apex Realtors',
      industry: 'Real Estate',
      contact_name: 'Vikram Sharma',
      phone: '+91 98765 43210',
      location: 'Tirupati, AP',
      budget: '?1.5 Crore',
      timeline: '3 months',
    }

    const demoResult = await executeDeploymentDemoAction({
      prospect,
      employeeSlug: 'real-estate-lead-receptionist',
      conversationStarter: 'Tell me about available villas in Tirupati',
    })

    expect(demoResult.success).toBe(true)
    expect(demoResult.data?.executionMode).toBe('sandbox')
    expect(demoResult.data?.hasRealSideEffects).toBe(false)
    // Absolute contract: Demo turns NEVER call createLead
    expect(createLead).not.toHaveBeenCalled()
  })

  it('G. integrates with analyzeProspectForDeployment and maintains overall pipeline contract', async () => {
    const prospect: Prospect = {
      company_name: 'Apex Realtors',
      industry: 'Real Estate',
      contact_name: 'Vikram Sharma',
      phone: '+91 98765 43210',
      location: 'Tirupati, AP',
      budget: '?1.5 Crore',
      timeline: '3 months',
    }

    const analysisRes = await analyzeProspectForDeployment(prospect)
    expect(analysisRes.success).toBe(true)
    expect(analysisRes.data?.crm.ready_for_lead_creation).toBe(true)
    expect(analysisRes.data?.crm.lead_payload).toBeDefined()
    // Still zero DB writes during analysis
    expect(createLead).not.toHaveBeenCalled()
  })
})
