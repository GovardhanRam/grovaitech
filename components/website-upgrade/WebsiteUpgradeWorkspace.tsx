'use client'

/**
 * Grovaitech AI Platform
 * components/website-upgrade/WebsiteUpgradeWorkspace.tsx
 *
 * Autonomous AI Employee Workspace for GOVA Website Upgrade.
 * Visually communicates:
 * 1. Website (Intake: URL-first, expandable context & evidence vault)
 * 2. Intelligence (Results-first dashboard, summary cards, top opportunities, GOVA recommendations)
 * 3. Audit (15-Point Assessment & Revenue Leaks)
 * 4. Strategy (Value Proposition & Canonical AI Workforce)
 * 5. Preview (Copy Manifest & Interactive Sandbox Mockup)
 * 6. Approval (Human Gate & CRM Qualification)
 * 7. Deployment (Active Provisioning Record)
 */

import React, { useState, useTransition, useEffect } from 'react'
import type {
  WebsiteUpgradeInput,
  WebsiteUpgradeResult,
  WebsiteEvidence,
} from '@/lib/website-upgrade/types'
import { analyzeWebsiteUpgradeAction } from '@/app/actions/website-upgrade'
import WebsiteAudit from './WebsiteAudit'
import WebsiteStrategy from './WebsiteStrategy'
import WebsitePreview from './WebsitePreview'
import WebsiteApproval from './WebsiteApproval'
import type { ProvisionClientResult } from '@/lib/deployment'
import {
  Globe,
  Cpu,
  Layers,
  Sparkles,
  Eye,
  ShieldCheck,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  Bot,
  MapPin,
  TrendingDown,
  Target,
  Workflow,
  Check,
  Building,
} from 'lucide-react'

const STEP_LABELS = [
  { id: 1, name: 'Website', icon: Globe },
  { id: 2, name: 'Intelligence', icon: Cpu },
  { id: 3, name: 'Audit', icon: Layers },
  { id: 4, name: 'Strategy', icon: Sparkles },
  { id: 5, name: 'Preview', icon: Eye },
  { id: 6, name: 'Approval', icon: ShieldCheck },
  { id: 7, name: 'Deployment', icon: Rocket },
]

const INDUSTRY_PRESETS = [
  'Healthcare & Dental',
  'Real Estate & Property',
  'Legal & Law Practice',
  'Financial Advisory & Loans',
  'Beauty & Wellness / Salon',
  'Home Services & HVAC',
  'E-Commerce & Retail',
  'Technology & SaaS',
  'General Business',
]

const ANALYSIS_STAGES = [
  'Website information received',
  'Business information identified',
  'Services analyzed',
  'Checking conversion journey',
  'Detecting revenue leaks',
  'Building upgrade strategy',
  'Matching AI Employees',
]

export default function WebsiteUpgradeWorkspace() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Expandable Section Toggles
  const [isContextOpen, setIsContextOpen] = useState(false)
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false)

  // Working State Animation
  const [analyzingStage, setAnalyzingStage] = useState<number | null>(null)

  // Intake State
  const [url, setUrl] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('Healthcare & Dental')
  const [targetAudience, setTargetAudience] = useState('')
  const [currentDescription, setCurrentDescription] = useState('')
  const [servicesInput, setServicesInput] = useState('')
  const [problemsInput, setProblemsInput] = useState('')
  const [channelsInput, setChannelsInput] = useState('Website, WhatsApp, Phone')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('Standard Setup')
  const [timeline, setTimeline] = useState('Immediate')
  const [rawText, setRawText] = useState('')

  // Evidence Items State
  const [evidenceList, setEvidenceList] = useState<WebsiteEvidence[]>([])
  const [newEvidenceFact, setNewEvidenceFact] = useState('')
  const [newEvidenceSource, setNewEvidenceSource] = useState('user_input')

  // Analysis Result
  const [upgradeResult, setUpgradeResult] = useState<WebsiteUpgradeResult | null>(null)
  const [activeDeployment, setActiveDeployment] = useState<ProvisionClientResult | null>(null)

  const handleAddEvidence = () => {
    if (!newEvidenceFact.trim()) return
    const newEv: WebsiteEvidence = {
      id: `ev-${Date.now()}`,
      fact: newEvidenceFact.trim(),
      source: newEvidenceSource as any,
      verified_at: new Date().toISOString(),
    }
    setEvidenceList([...evidenceList, newEv])
    setNewEvidenceFact('')
  }

  const handleRemoveEvidence = (id: string) => {
    setEvidenceList(evidenceList.filter((e) => e.id !== id))
  }

  const handleRunAnalysis = () => {
    if (!businessName.trim()) {
      setErrorMessage('Please enter a business or company name.')
      return
    }

    setErrorMessage(null)
    setAnalyzingStage(0)

    const payload: WebsiteUpgradeInput = {
      url: url.trim() || undefined,
      business_name: businessName.trim(),
      industry: industry.trim(),
      target_audience: targetAudience.trim() || undefined,
      current_description: currentDescription.trim() || undefined,
      current_services: servicesInput
        ? servicesInput.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      known_problems: problemsInput
        ? problemsInput.split(',').map((p) => p.trim()).filter(Boolean)
        : [],
      current_channels: channelsInput
        ? channelsInput.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      contact_name: contactName.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      location: location.trim() || undefined,
      budget: budget.trim() || undefined,
      timeline: timeline.trim() || undefined,
      raw_site_text: rawText.trim() || undefined,
      supplied_evidence: evidenceList,
    }

    startTransition(async () => {
      // Step through stages visibly to reflect the AI Employee processing
      for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
        setAnalyzingStage(i)
        await new Promise((resolve) => setTimeout(resolve, 240))
      }

      const res = await analyzeWebsiteUpgradeAction(payload)
      if (res.success && res.data) {
        setUpgradeResult(res.data)
        setAnalyzingStage(null)
        setCurrentStep(2) // Advance to Results-First Intelligence Dashboard
      } else {
        setAnalyzingStage(null)
        setErrorMessage(res.error || 'Failed to complete website analysis.')
      }
    })
  }

  // Count added optional context fields
  const addedContextCount = [
    targetAudience,
    currentDescription,
    servicesInput,
    problemsInput,
    contactPhone,
    location,
  ].filter(Boolean).length

  // Derived counts for intelligence dashboard
  const conversionOppCount = upgradeResult
    ? upgradeResult.audit_findings.filter(
        (f) =>
          f.category === 'CONVERSION_JOURNEY' ||
          f.category === 'LEAD_CAPTURE' ||
          f.category === 'CTA_VISIBILITY'
      ).length + upgradeResult.revenue_leaks.length
    : 0

  const trustGapsCount = upgradeResult
    ? upgradeResult.audit_findings.filter((f) => f.category === 'TRUST_PROOF').length +
      upgradeResult.intelligence.claims_summary.gated
    : 0

  const uxIssuesCount = upgradeResult
    ? upgradeResult.audit_findings.filter(
        (f) =>
          f.category === 'MOBILE_UX' ||
          f.category === 'TECHNICAL_UX' ||
          f.category === 'NAVIGATION'
      ).length
    : 0

  const contentGapsCount = upgradeResult
    ? upgradeResult.audit_findings.filter(
        (f) =>
          f.category === 'CONTENT_GAPS' ||
          f.category === 'VALUE_PROPOSITION' ||
          f.category === 'BUSINESS_CLARITY'
      ).length
    : 0

  const aiEmployeeOppCount = upgradeResult
    ? upgradeResult.strategy.ai_employee_opportunities.length
    : 0

  // Top priority findings (P0 and P1 first, then P2)
  const topFindings = upgradeResult
    ? [...upgradeResult.audit_findings]
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }
          return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
        })
        .slice(0, 4)
    : []

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto">
      {/* 1. HERO SECTION */}
      <div className="bg-linear-to-r from-slate-950 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-800">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Bot className="w-4 h-4 text-blue-400" />
            GOVA Website Upgrade Employee
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Turn an outdated website into an AI-powered customer acquisition system.
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl pt-1">
            GOVA analyzes your website, identifies customer-experience and conversion gaps, creates an
            evidence-backed upgrade plan, and prepares the site for deployment with the right AI Employees.
          </p>
        </div>
      </div>

      {/* 6. WORKFLOW STEPPER */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-1 sm:gap-2">
          {STEP_LABELS.map((step) => {
            const Icon = step.icon
            const isCompleted = upgradeResult !== null && currentStep > step.id
            const isCurrent = currentStep === step.id
            const isAvailable = upgradeResult !== null || step.id === 1

            return (
              <button
                key={step.id}
                disabled={!isAvailable}
                onClick={() => isAvailable && setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30 ring-offset-1'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : ''}`} />
                <span>
                  {step.id}. {step.name}
                </span>
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. AI EMPLOYEE WORKING STATE MODAL / OVERLAY */}
      {analyzingStage !== null && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-blue-200 shadow-md space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">GOVA Website Upgrade Employee</h3>
              <p className="text-xs text-slate-500">Autonomous website intelligence pipeline running</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {ANALYSIS_STAGES.map((label, idx) => {
              const isDone = analyzingStage > idx
              const isWorking = analyzingStage === idx
              const isPending = analyzingStage < idx

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                    isWorking
                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                      : isDone
                      ? 'text-emerald-700 bg-emerald-50/60'
                      : 'text-slate-400'
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {isWorking && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
                  {isPending && <span className="w-4 h-4 rounded-full border border-slate-300 inline-block shrink-0" />}
                  <span>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 1: SIMPLIFIED INITIAL INTAKE */}
      {currentStep === 1 && analyzingStage === null && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Website & Business Intake
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Enter your website URL or business information to initiate autonomous conversion analysis.
            </p>
          </div>

          {/* Above-The-Fold Inputs */}
          <div className="space-y-4">
            {/* Primary Input: Website URL */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Website URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Provide your existing business website domain to benchmark current customer journeys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  Business / Company Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Dental & Smile Center"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 bg-white focus:outline-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Industry Sector *
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 bg-white focus:outline-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  {INDUSTRY_PRESETS.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. EXPANDABLE SECTION: Add Business Context */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setIsContextOpen(!isContextOpen)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Add Business Context</span>
                {addedContextCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    {addedContextCount} provided
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-normal">
                <span>{isContextOpen ? 'Hide' : 'Add services, audience, or challenges'}</span>
                {isContextOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isContextOpen && (
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Primary Target Audience
                    </label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Local patients seeking cosmetic dentistry"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Location / Service Area
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Business Description
                    </label>
                    <textarea
                      rows={2}
                      value={currentDescription}
                      onChange={(e) => setCurrentDescription(e.target.value)}
                      placeholder="Briefly describe what the business does and key client offerings..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Current Services (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={servicesInput}
                      onChange={(e) => setServicesInput(e.target.value)}
                      placeholder="Teeth Whitening, Dental Implants, Aligners"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Operational Challenges (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={problemsInput}
                      onChange={(e) => setProblemsInput(e.target.value)}
                      placeholder="Slow response to inquiries, after-hours drop-off, missed WhatsApp messages"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Inbound Channels
                    </label>
                    <input
                      type="text"
                      value={channelsInput}
                      onChange={(e) => setChannelsInput(e.target.value)}
                      placeholder="Website, WhatsApp, Phone"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 bg-white focus:outline-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. EXPANDABLE SECTION: Evidence & Verification */}
          <div className="border border-blue-200 rounded-xl overflow-hidden bg-blue-50/30">
            <button
              type="button"
              onClick={() => setIsEvidenceOpen(!isEvidenceOpen)}
              className="w-full px-4 py-3 bg-blue-50/70 hover:bg-blue-100/70 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Evidence & Verification</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 text-[10px] font-bold">
                  {evidenceList.length} Verified Evidence Items
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-normal">
                <span>{isEvidenceOpen ? 'Hide' : 'Add verified facts for copy'}</span>
                {isEvidenceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isEvidenceOpen && (
              <div className="p-4 sm:p-5 border-t border-blue-100 bg-white space-y-3 text-xs">
                <p className="text-slate-600 text-[11px]">
                  Add verified facts that GOVA should use in customer-facing copy.
                  Unverified superlatives, metrics, and guarantees will be safely gated by Claims Guard.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={newEvidenceFact}
                    onChange={(e) => setNewEvidenceFact(e.target.value)}
                    placeholder="e.g. Established in 2014; ISO 9001 certified; 4.9 rating on Google"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-blue-600"
                  />
                  <select
                    value={newEvidenceSource}
                    onChange={(e) => setNewEvidenceSource(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
                  >
                    <option value="user_input">User Stated Fact</option>
                    <option value="document">Registration Document</option>
                    <option value="third_party_verified">Third-Party Audit</option>
                  </select>
                  <button
                    onClick={handleAddEvidence}
                    type="button"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Evidence
                  </button>
                </div>

                {evidenceList.length > 0 && (
                  <ul className="space-y-1.5 pt-2">
                    {evidenceList.map((ev) => (
                      <li
                        key={ev.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800">{ev.fact}</span>
                        <button
                          onClick={() => handleRemoveEvidence(ev.id)}
                          type="button"
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isPending}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              Analyze My Website
            </button>
          </div>
        </div>
      )}

      {/* 5. STEP 2: RESULTS-FIRST INTELLIGENCE DASHBOARD */}
      {currentStep === 2 && upgradeResult && (
        <div className="space-y-8">
          {/* Header Card: Business, Location, Industry, Clarity */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Website Intelligence Summary
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {upgradeResult.input.business_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {upgradeResult.input.industry}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {upgradeResult.input.location || 'Location unspecified'}
                  </span>
                  {upgradeResult.input.url && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-600">{upgradeResult.input.url}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Business Clarity
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {upgradeResult.intelligence.business_clarity_score}
                    <span className="text-xs text-slate-400 font-normal">/100</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 5 Summary Cards using actual generated counts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
                <span className="text-[10px] font-bold uppercase text-blue-700 block">
                  Conversion Opportunities
                </span>
                <span className="text-2xl font-black text-blue-950 mt-1 block">
                  {conversionOppCount}
                </span>
                <span className="text-[11px] text-blue-600">friction points</span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                <span className="text-[10px] font-bold uppercase text-amber-700 block">
                  Trust Gaps
                </span>
                <span className="text-2xl font-black text-amber-950 mt-1 block">
                  {trustGapsCount}
                </span>
                <span className="text-[11px] text-amber-600">proof & gated claims</span>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50">
                <span className="text-[10px] font-bold uppercase text-indigo-700 block">
                  UX Issues
                </span>
                <span className="text-2xl font-black text-indigo-950 mt-1 block">
                  {uxIssuesCount}
                </span>
                <span className="text-[11px] text-indigo-600">mobile & navigation</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">
                  Content Gaps
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {contentGapsCount}
                </span>
                <span className="text-[11px] text-slate-500">clarity & positioning</span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                  AI Employee Ops
                </span>
                <span className="text-2xl font-black text-emerald-950 mt-1 block">
                  {aiEmployeeOppCount}
                </span>
                <span className="text-[11px] text-emerald-600">canonical matches</span>
              </div>
            </div>
          </div>

          {/* Top Opportunities Section */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                  Top Opportunities
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-priority findings identified by GOVA to unlock conversion velocity.
                </p>
              </div>
              <button
                onClick={() => setCurrentStep(3)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                View all {upgradeResult.audit_findings.length} findings
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      finding.priority === 'P1'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {finding.priority} • {finding.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {finding.evidence_status}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{finding.title}</h4>

                  {finding.evidence && finding.evidence.length > 0 && (
                    <div className="text-slate-600">
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                        Observed Evidence
                      </span>
                      <p className="italic text-[11px] text-slate-700 line-clamp-2">
                        {finding.evidence[0]}
                      </p>
                    </div>
                  )}

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-blue-900 block uppercase text-[10px]">
                      Recommendation
                    </span>
                    <p className="text-slate-800 text-[11px]">{finding.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GOVA Recommends Section: Canonical AI Employees */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  GOVA Recommends
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matched canonical AI Employees from the existing Grovaitech workforce registry.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200">
                {upgradeResult.strategy.ai_employee_opportunities.length} Matched Agents
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upgradeResult.strategy.ai_employee_opportunities.map((opp) => (
                <div
                  key={opp.employee_id}
                  className="p-4 rounded-xl border border-indigo-100 bg-linear-to-b from-indigo-50/30 to-white flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-indigo-600 font-bold">{opp.employee_id}</span>
                      <span className="text-slate-500">{opp.department}</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900">{opp.employee_name}</h4>
                    <p className="text-xs font-semibold text-indigo-700">{opp.role}</p>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 mt-2">
                      <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                        Matched Need
                      </span>
                      <p className="text-slate-800 text-[11px] leading-snug">{opp.matched_need}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-indigo-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium text-[11px]">
                      <Workflow className="w-3.5 h-3.5 text-indigo-500" />
                      {opp.workflow_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stepper Advancement Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Website Intake
            </button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                15-Point Audit Findings <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                Strategy Blueprint <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentStep(5)}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
              >
                View Interactive Preview <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: AUDIT & REVENUE LEAKS */}
      {currentStep === 3 && upgradeResult && (
        <div className="space-y-6">
          <WebsiteAudit
            findings={upgradeResult.audit_findings}
            revenueLeaks={upgradeResult.revenue_leaks}
          />
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Intelligence
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              View Upgrade Strategy <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: STRATEGY */}
      {currentStep === 4 && upgradeResult && (
        <div className="space-y-6">
          <WebsiteStrategy strategy={upgradeResult.strategy} />
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Audit
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              View Interactive Preview <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PREVIEW */}
      {currentStep === 5 && upgradeResult && (
        <div className="space-y-6">
          <WebsitePreview
            previewPlan={upgradeResult.preview_plan}
            uiPlan={upgradeResult.ui_ux_plan}
            businessName={upgradeResult.input.business_name}
            industry={upgradeResult.input.industry}
          />
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Strategy
            </button>
            <button
              onClick={() => setCurrentStep(6)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm min-h-[44px]"
            >
              Proceed to Human Approval Gate <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: APPROVAL */}
      {currentStep === 6 && upgradeResult && (
        <div className="space-y-6">
          <WebsiteApproval
            handoff={upgradeResult.deployment_handoff}
            onDeploymentSuccess={(res) => {
              setActiveDeployment(res)
              setCurrentStep(7)
            }}
          />
          <div className="flex justify-start">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Preview
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: DEPLOYMENT */}
      {currentStep === 7 && activeDeployment && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Rocket className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Deployment Live & Provisioned</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              The website upgrade plan has been handed off to the canonical Grovaitech Deployment Engine.
              AI Employee credentials and runtime configurations are active.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Deployment ID:</span>
              <span className="font-mono font-bold text-slate-800">
                {activeDeployment.deployment?.id || 'dep-active'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Client ID:</span>
              <span className="font-mono font-bold text-slate-800">
                {activeDeployment.deployment?.client_id || 'client-active'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned AI Employee:</span>
              <span className="font-bold text-indigo-700">
                {activeDeployment.deployment?.assigned_employee_name || 'AI Receptionist'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Workflow:</span>
              <span className="font-mono text-slate-800">
                {activeDeployment.deployment?.assigned_workflow_id || 'wf-001'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                setCurrentStep(1)
                setUpgradeResult(null)
                setActiveDeployment(null)
              }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl min-h-[44px]"
            >
              Start New Website Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
