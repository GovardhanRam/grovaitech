/**
 * Grovaitech AI Platform
 * lib/deployment/demo-planner.ts
 *
 * Deterministic Demo Planner for Prospect Deployments.
 * Synthesizes personalized scenarios, conversation starters, and projected workflow bindings.
 *
 * Note: Phase 1 provides deterministic demo planning only and does not execute live external actions.
 */

import type { Prospect, RevenueLeak, EmployeeMatch, DemoPlan } from './types'

// Authoritative mapping of Canonical Employee IDs to existing Workflow IDs
export const EMPLOYEE_WORKFLOW_MAP: Record<string, string> = {
  'emp-001': 'wf-001', // Real Estate Lead Receptionist -> wf-001
  'emp-002': 'wf-002', // Clinic Receptionist -> wf-002
  'emp-003': 'wf-004', // WhatsApp Lead Agent -> wf-004
  'emp-004': 'wf-007', // Salon & Spa Receptionist -> wf-007
  'emp-005': 'wf-003', // Customer Support Agent -> wf-003 (Support Escalation & FAQ)
  'emp-006': 'wf-005', // AI QA Inspector -> wf-005
  'emp-007': 'wf-006', // Legal Intake Agent -> wf-006
  'emp-008': 'wf-008', // E-Commerce Support Agent -> wf-008
  'emp-009': 'wf-009', // HR Onboarding Agent -> wf-009
  'emp-010': 'wf-010', // Financial Advisory Agent -> wf-010
}

/**
 * Generates a tailored interactive demo plan based on the prospect's profile,
 * detected revenue leaks, and matched canonical employee.
 */
export function generateDemoPlan(
  prospect: Prospect,
  matchedEmployee: EmployeeMatch,
  primaryLeak?: RevenueLeak
): DemoPlan {
  const companyName = prospect.company_name?.trim() || 'Your Business'
  const industry = prospect.industry?.trim() || matchedEmployee.employee.industry || 'Business'
  const employeeName = matchedEmployee.employee_name
  const employeeId = matchedEmployee.employee_id
  const workflowId = EMPLOYEE_WORKFLOW_MAP[employeeId]

  const leakTitle = primaryLeak?.title || 'Inbound Response Latency'

  let headline = `Interactive ${employeeName} Deployment Demo for ${companyName}`
  let scenario = `Explore how ${employeeName} is configured to autonomously resolve ${leakTitle.toLowerCase()} for ${companyName} in the ${industry} industry.`
  let conversationStarters: [string, string, string]
  let expectedOutcome = `When deployed, this workflow is designed to provide autonomous qualification, CRM lead capture, and immediate workflow synchronization.`

  switch (employeeId) {
    case 'emp-001': // Real Estate Lead Receptionist
      headline = `Real Estate Lead Receptionist Deployment Demo for ${companyName}`
      scenario = `A prospective buyer arrives on ${companyName}'s website or WhatsApp looking for properties in their target location. ${employeeName} is configured to discover budget and timeline, and coordinate a site visit.`
      conversationStarters = [
        `Hi, I'm looking for a 3 BHK villa with ${companyName} this weekend. What options do you have?`,
        `What is the starting price range for apartments in your latest residential project?`,
        `Can I schedule an in-person site visit for this Saturday at 11:00 AM? My number is +91 98765 43210.`,
      ]
      expectedOutcome = `When deployed, this workflow is designed to capture buyer preferences, qualify lead intent, and coordinate site visit reservations on the team calendar.`
      break

    case 'emp-002': // Clinic Receptionist
      headline = `Medical Front-Desk Receptionist Deployment Demo for ${companyName}`
      scenario = `A patient contacts ${companyName} to ask about doctor availability, treatment fees, and book a consultation slot.`
      conversationStarters = [
        `Hi, I'd like to book a dental checkup appointment with Dr. Verma at ${companyName} tomorrow at 10:00 AM.`,
        `What are your clinic consultation hours and what is the fee for a general checkup?`,
        `I need to reschedule my appointment to next Monday. Can you assist me?`,
      ]
      expectedOutcome = `When deployed, the configured AI Employee can verify patient intake, schedule clinic consultation slots, and dispatch automated 24h WhatsApp reminders.`
      break

    case 'emp-003': // WhatsApp Lead Agent
      headline = `24/7 WhatsApp Sales Agent Deployment Demo for ${companyName}`
      scenario = `An inbound lead messages ${companyName}'s WhatsApp business line after-hours with urgent product queries and pricing requests.`
      conversationStarters = [
        `Hello, I saw your advertisement and want more information on ${companyName}'s services.`,
        `Can someone call me back regarding pricing and package options for my team?`,
        `My budget is around ₹1 Lakh and we need implementation within 2 weeks. Can you help?`,
      ]
      expectedOutcome = `When deployed, this workflow is designed to qualify inbound buyer intent in under 3 seconds, verify contact information, and synchronize leads to the CRM.`
      break

    case 'emp-004': // Salon & Spa Receptionist
      headline = `Salon & Spa Receptionist Deployment Demo for ${companyName}`
      scenario = `A client wants to book styling or wellness packages at ${companyName} with specific stylist preferences.`
      conversationStarters = [
        `Hi! Do you have slots available for a Haircut & Styling session this Saturday afternoon at ${companyName}?`,
        `What bridal packages and facial treatments do you offer, and what are their prices?`,
        `I'd like to book a 60-minute Aromatherapy Massage for tomorrow at 3:00 PM.`,
      ]
      expectedOutcome = `When deployed, the configured AI Employee is designed to guide service selection, block staff calendars, and send instant booking confirmations.`
      break

    case 'emp-005': // Customer Support Agent
      headline = `Tier-1 Support Specialist Deployment Demo for ${companyName}`
      scenario = `A customer has a billing inquiry or technical question that requires instant knowledge-base answers and smooth human escalation.`
      conversationStarters = [
        `Hi, I have a question regarding my recent invoice and refund policy from ${companyName}.`,
        `How do I integrate ${companyName}'s platform with our existing CRM software?`,
        `This issue is urgent and I need to speak directly with an on-duty human support manager.`,
      ]
      expectedOutcome = `When deployed, this workflow is designed to resolve common tier-1 inquiries using official documentation and escalate complex tickets to human staff with summary context.`
      break

    case 'emp-006': // AI QA Inspector
      headline = `Quality & Compliance Audit Deployment Demo for ${companyName}`
      scenario = `The operations team at ${companyName} audits customer transcripts to verify truthfulness, compliance rubrics, and brand safety.`
      conversationStarters = [
        `Can you evaluate the latest customer support transcripts and generate a 100-point quality score?`,
        `Please check if our AI responses made any unauthorized refund promises or pricing errors.`,
        `Generate an executive quality and compliance report for management based on today's chat logs.`,
      ]
      expectedOutcome = `When deployed, the configured AI Employee is designed to evaluate conversations across 4 key pillars (Truthfulness, Helpfulness, Compliance, Safety) and flag compliance risks.`
      break

    case 'emp-007': // Legal Intake Agent
      headline = `Legal Matter Intake Deployment Demo for ${companyName}`
      scenario = `A prospective client contacts ${companyName} with a legal dispute requiring practice area classification and conflict checking.`
      conversationStarters = [
        `I need a consultation with an attorney regarding a commercial contract dispute with Apex Industries.`,
        `What are ${companyName}'s practice areas, and how does your attorney consultation process work?`,
        `I have an urgent intellectual property matter that needs preliminary legal review next Monday at 2:00 PM.`,
      ]
      expectedOutcome = `When deployed, this workflow is designed to capture structured intake details, screen for conflicts of interest, and route qualified consultation requests without dispensing unauthorized legal advice.`
      break

    case 'emp-008': // E-Commerce Support Agent
      headline = `E-Commerce Order & Logistics Support Deployment Demo for ${companyName}`
      scenario = `A customer contacts ${companyName} to check shipment status, exchange an item size, or initiate an eligible return.`
      conversationStarters = [
        `Where is my order #GROV-10492? Has it been shipped yet?`,
        `I received the wrong shoe size and would like to request an exchange for order #ORD-88231.`,
        `What is your return policy and return window for items purchased during the sale?`,
      ]
      expectedOutcome = `When deployed, the configured AI Employee can perform real-time order lookups, track shipment carrier status, and process policy-compliant return requests.`
      break

    case 'emp-009': // HR Onboarding Agent
      headline = `New Hire Onboarding Deployment Demo for ${companyName}`
      scenario = `A newly hired employee connects with ${companyName}'s HR assistant to submit compliance documents and book their orientation slot.`
      conversationStarters = [
        `Hi, I'm joining ${companyName} next Monday as a Software Engineer. What documents do I need to submit?`,
        `Can you help me schedule my induction orientation slot for Monday at 10:00 AM?`,
        `What is the company policy regarding health insurance coverage, leave entitlements, and working hours?`,
      ]
      expectedOutcome = `When deployed, this workflow is designed to validate required document submissions, coordinate orientation slots, and synchronize induction status with HR systems.`
      break

    case 'emp-010': // Financial Advisory Agent
      headline = `Financial Advisory & KYC Intake Deployment Demo for ${companyName}`
      scenario = `A prospective client seeks home loan or wealth management guidance from ${companyName} and requires preliminary KYC screening.`
      conversationStarters = [
        `I'm looking for a Home Loan of ₹75 Lakhs and want to schedule a consultation with a loan advisor at ${companyName}.`,
        `What documents are required for KYC verification for mutual fund investments?`,
        `Can I book a financial advisory consultation for this Friday at 3:30 PM? My contact is priya@example.com.`,
      ]
      expectedOutcome = `When deployed, the configured AI Employee is designed to qualify advisory requirements, verify preliminary KYC readiness, and schedule consultation sessions with certified advisors.`
      break

    default:
      conversationStarters = [
        `Hello, I would like to learn more about ${companyName}'s services.`,
        `What solutions do you offer for ${industry} companies?`,
        `Can I speak with a representative or schedule an appointment?`,
      ]
  }

  return {
    headline,
    scenario,
    conversation_starters: conversationStarters,
    expected_outcome: expectedOutcome,
    workflow_id: workflowId,
  }
}
