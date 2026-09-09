'use client'

/**
 * Grovaitech AI Platform
 * components/deployment/DeploymentEngineWorkspace.tsx
 *
 * Phase 2C Vertical Slice: AI Employee Deployment Engine Workspace.
 * Guides a prospect through:
 * 1. Business Intake
 * 2. Revenue Leak Detection & AI Employee Match
 * 3. Personalized Interactive Sandbox Demo
 * 4. CRM Readiness Inspection (with zero DB writes)
 */

import { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  analyzeProspectForDeployment,
  executeDeploymentDemoAction,
  saveQualifiedProspectToCrm,
  provisionClientDeploymentFromLead,
  saveProspect,
  getProspects,
  markProspectDemoReady,
} from '@/app/actions/deployment'
import type {
  Prospect,
  DeploymentAnalysis,
  DeploymentDemoResult,
  ClientDeployment,
  RevenueLeak,
  EmployeeMatch,
  ProspectRecord,
} from '@/lib/deployment'
import type { ConversationTurn } from '@/lib/ai/runtime'
import {
  Bot,
  Building2,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Send,
  Loader2,
  Lock,
  Layers,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  User,
  Workflow,
  Check,
  AlertTriangle,
  Info,
  Database,
  ExternalLink,
} from 'lucide-react'

// Suggested quick-select presets for fast demonstration
const INDUSTRY_PRESETS = [
  'Real Estate',
  'Healthcare',
  'E-Commerce',
  'Legal Services',
  'Beauty & Wellness',
  'Financial Services',
  'Technology',
  'General',
]

const CHALLENGE_PRESETS = [
  'Slow response to buyer inquiries',
  'Missed leads after-hours',
  'Appointment booking friction',
  'Order tracking & return request overload',
  'Case intake and conflict check delays',
  'Repetitive support questions backlog',
  'New hire onboarding document collection delay',
  'KYC documentation & loan inquiry drop-off',
]

const CHANNEL_PRESETS = [
  'WhatsApp',
  'Website',
  'Phone',
  'Email',
  'Instagram',
]

export default function DeploymentEngineWorkspace() {
  // Form State
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('Real Estate')
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([])
  const [customChallenge, setCustomChallenge] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['WhatsApp', 'Website'])
  const [customChannel, setCustomChannel] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')

  // Prospect Selection & CRM Lifecycle State
  const [prospectsList, setProspectsList] = useState<ProspectRecord[]>([])
  const [activeProspectId, setActiveProspectId] = useState<string | null>(null)
  const [prospectLifecycleStatus, setProspectLifecycleStatus] = useState<
    'new' | 'analyzed' | 'demo_ready' | 'qualified'
  >('new')
  const [isSavingProspect, setIsSavingProspect] = useState(false)
  const [saveProspectNotice, setSaveProspectNotice] = useState<string | null>(null)

  // Execution & Output State
  const [isAnalyzing, startAnalysisTransition] = useTransition()
  const [analysisResult, setAnalysisResult] = useState<DeploymentAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Demo Interactive State
  const [isExecutingDemo, setIsExecutingDemo] = useState(false)
  const [demoHistory, setDemoHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [latestDemoResult, setLatestDemoResult] = useState<DeploymentDemoResult | null>(null)
  const [demoInputMessage, setDemoInputMessage] = useState('')
  const [demoError, setDemoError] = useState<string | null>(null)

  // CRM Lead Creation State
  const [isSavingToCrm, setIsSavingToCrm] = useState(false)
  const [crmSaveResult, setCrmSaveResult] = useState<{
    success: boolean
    isUpdate?: boolean
    leadId?: string
    error?: string
  } | null>(null)

  // Client Workspace Provisioning State
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [provisionResult, setProvisionResult] = useState<{
    success: boolean
    deployment?: ClientDeployment
    client?: any
    isExisting?: boolean
    error?: string
  } | null>(null)

  // Fetch persisted prospects from CRM on mount
  const loadProspects = useCallback(async () => {
    try {
      const res = await getProspects()
      if (res.success && res.data) {
        setProspectsList(res.data)
      }
    } catch (err) {
      console.warn('[Load Prospects Notice]', err)
    }
  }, [])

  useEffect(() => {
    loadProspects()
  }, [loadProspects])

  // Select existing prospect from CRM or reset to new
  const handleSelectProspect = (prospectId: string) => {
    setAnalysisError(null)
    setSaveProspectNotice(null)
    setCrmSaveResult(null)
    setProvisionResult(null)

    if (!prospectId) {
      // "+ Create New Prospect"
      setActiveProspectId(null)
      setProspectLifecycleStatus('new')
      setCompanyName('')
      setIndustry('Real Estate')
      setSelectedChallenges([])
      setSelectedChannels(['WhatsApp', 'Website'])
      setContactName('')
      setPhone('')
      setEmail('')
      setLocation('')
      setBudget('')
      setTimeline('')
      setAnalysisResult(null)
      setLatestDemoResult(null)
      setDemoHistory([])
      return
    }

    const found = prospectsList.find((p) => p.id === prospectId)
    if (!found) return

    setActiveProspectId(found.id)
    setProspectLifecycleStatus(found.status || 'new')
    setCompanyName(found.company_name || '')
    setIndustry(found.industry || 'Real Estate')
    setSelectedChallenges(found.known_problems || [])
    setSelectedChannels(
      found.current_channels && found.current_channels.length > 0
        ? found.current_channels
        : ['WhatsApp', 'Website']
    )
    setContactName(found.contact_name || '')
    setPhone(found.phone || '')
    setEmail(found.email || '')
    setLocation(found.location || '')
    setBudget(found.budget || '')
    setTimeline(found.timeline || '')

    if (found.analysis) {
      setAnalysisResult(found.analysis)
      setLatestDemoResult(null)
      setDemoHistory([])
    } else {
      setAnalysisResult(null)
    }
  }

  // Explicitly persist intake prospect into CRM
  const handleSaveProspectDraft = async () => {
    if (!companyName.trim()) {
      setAnalysisError('Please enter a Company Name to save the prospect.')
      return
    }

    setIsSavingProspect(true)
    setSaveProspectNotice(null)
    setAnalysisError(null)

    try {
      const res = await saveProspect(
        currentProspect,
        prospectLifecycleStatus,
        activeProspectId || undefined
      )
      if (res.success) {
        if (res.prospectId) setActiveProspectId(res.prospectId)
        setSaveProspectNotice('Prospect draft saved successfully to CRM.')
        await loadProspects()
      } else {
        setAnalysisError(res.error || 'Failed to save prospect to CRM.')
      }
    } catch (err: any) {
      setAnalysisError(err?.message || 'Error saving prospect.')
    } finally {
      setIsSavingProspect(false)
    }
  }

  // Toggle challenge tags
  const toggleChallenge = (item: string) => {
    setSelectedChallenges((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    )
  }

  const addCustomChallenge = (e: React.FormEvent) => {
    e.preventDefault()
    if (customChallenge.trim() && !selectedChallenges.includes(customChallenge.trim())) {
      setSelectedChallenges((prev) => [...prev, customChallenge.trim()])
      setCustomChallenge('')
    }
  }

  // Toggle channel tags
  const toggleChannel = (item: string) => {
    setSelectedChannels((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    )
  }

  const addCustomChannel = (e: React.FormEvent) => {
    e.preventDefault()
    if (customChannel.trim() && !selectedChannels.includes(customChannel.trim())) {
      setSelectedChannels((prev) => [...prev, customChannel.trim()])
      setCustomChannel('')
    }
  }

  // Construct current prospect object
  const currentProspect: Prospect = {
    company_name: companyName.trim(),
    industry: industry.trim(),
    known_problems: selectedChallenges,
    current_channels: selectedChannels,
    contact_name: contactName.trim() || undefined,
    phone: phone.trim() || undefined,
    email: email.trim() || undefined,
    location: location.trim() || undefined,
    budget: budget.trim() || undefined,
    timeline: timeline.trim() || undefined,
  }

  // Step 1: Run Prospect Analysis
  const handleAnalyze = () => {
    setAnalysisError(null)
    setDemoError(null)
    setCrmSaveResult(null)
    setProvisionResult(null)
    setSaveProspectNotice(null)

    if (!companyName.trim()) {
      setAnalysisError('Please enter your Company Name.')
      return
    }

    if (!industry.trim()) {
      setAnalysisError('Please select an Industry.')
      return
    }

    startAnalysisTransition(async () => {
      // 1. Ensure prospect is persisted in CRM
      let prospectId = activeProspectId
      if (!prospectId) {
        const saveRes = await saveProspect(currentProspect, 'new')
        if (saveRes.success && saveRes.prospectId) {
          prospectId = saveRes.prospectId
          setActiveProspectId(prospectId)
        }
      }

      // 2. Run deterministic analysis and transition status to analyzed
      const res = await analyzeProspectForDeployment(currentProspect, prospectId || undefined)
      if (!res.success || !res.data) {
        setAnalysisError(res.error || 'Failed to complete deployment analysis.')
        return
      }

      setAnalysisResult(res.data)
      setProspectLifecycleStatus('analyzed')
      setDemoHistory([])
      setLatestDemoResult(null)
      await loadProspects()
    })
  }

  // Reset entire workspace
  const handleReset = () => {
    setAnalysisResult(null)
    setAnalysisError(null)
    setDemoHistory([])
    setLatestDemoResult(null)
    setDemoError(null)
    setCrmSaveResult(null)
    setProvisionResult(null)
    setSaveProspectNotice(null)
    setActiveProspectId(null)
    setProspectLifecycleStatus('new')
  }

  // Step 4: Explicitly Save Qualified Prospect to CRM
  const handleSaveToCrm = async () => {
    if (!analysisResult?.crm.ready_for_lead_creation || isSavingToCrm) {
      return
    }

    setIsSavingToCrm(true)
    setCrmSaveResult(null)

    try {
      const res = await saveQualifiedProspectToCrm(analysisResult.prospect)
      if (res.success) {
        setCrmSaveResult({
          success: true,
          isUpdate: res.isUpdate,
          leadId: res.data?.id,
        })
        setProspectLifecycleStatus('qualified')
        await loadProspects()
      } else {
        setCrmSaveResult({
          success: false,
          error: res.error || 'Failed to save qualified prospect to CRM.',
        })
      }
    } catch (err: any) {
      setCrmSaveResult({
        success: false,
        error: err?.message || 'An unexpected error occurred while saving to CRM.',
      })
    } finally {
      setIsSavingToCrm(false)
    }
  }

  // Step 4 (Phase 3): Explicitly Provision Client Workspace and Activate AI Employee
  const handleProvisionClient = async () => {
    if (!analysisResult?.prospect || isProvisioning) {
      return
    }

    setIsProvisioning(true)
    setProvisionResult(null)

    try {
      const res = await provisionClientDeploymentFromLead({
        prospect: analysisResult.prospect,
        employeeSlug: analysisResult.recommended_employee?.employee_slug,
        leadId: crmSaveResult?.leadId,
      })

      if (res.success) {
        setProvisionResult({
          success: true,
          deployment: res.deployment,
          client: res.client,
          isExisting: res.isExisting,
        })
      } else {
        setProvisionResult({
          success: false,
          error: res.error || 'Failed to activate and provision client workspace.',
        })
      }
    } catch (err: any) {
      setProvisionResult({
        success: false,
        error: err?.message || 'An unexpected error occurred during workspace activation.',
      })
    } finally {
      setIsProvisioning(false)
    }
  }

  // Step 3: Run Safe Sandbox Demo Turn
  const handleRunDemoTurn = async (messageText: string) => {
    if (!analysisResult?.recommended_employee || !messageText.trim() || isExecutingDemo) {
      return
    }

    const trimmedMsg = messageText.trim()
    setIsExecutingDemo(true)
    setDemoError(null)

    // Append user message to UI chat
    setDemoHistory((prev) => [...prev, { role: 'user', text: trimmedMsg }])
    setDemoInputMessage('')

    // Map conversation turns to ConversationTurn format
    const historyPayload: ConversationTurn[] = demoHistory.map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.text,
    }))

    try {
      const res = await executeDeploymentDemoAction({
        prospect: analysisResult.prospect,
        employeeSlug: analysisResult.recommended_employee.employee_slug,
        conversationStarter: trimmedMsg,
        history: historyPayload,
        executionMode: 'sandbox',
      })

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Demo execution failed.')
      }

      setLatestDemoResult(res.data)
      setDemoHistory((prev) => [
        ...prev,
        { role: 'assistant', text: res.data!.replyText },
      ])

      // Transition CRM state to demo_ready upon successful demo interaction
      if (activeProspectId && prospectLifecycleStatus !== 'qualified') {
        setProspectLifecycleStatus('demo_ready')
        markProspectDemoReady(activeProspectId, analysisResult.demo).catch(() => {})
      }
    } catch (err: any) {
      console.error('[Demo Execution Error]', err)
      setDemoError(err?.message || 'Error running sandbox demonstration.')
    } finally {
      setIsExecutingDemo(false)
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 font-sans text-slate-900">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Employee Deployment Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Deploy AI Employees Tailored to Your Business
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl">
            Scan operational bottlenecks, detect revenue leaks, match canonical AI Employees, and test interactively in an isolated sandbox.
          </p>
        </div>
      </div>

      {/* CRM Lifecycle Stepper & Prospect Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">CRM Prospect Lifecycle:</span>
            <div className="flex items-center gap-1.5 font-medium text-xs">
              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                  prospectLifecycleStatus === 'new'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                1. NEW
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                  prospectLifecycleStatus === 'analyzed'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                2. ANALYZED
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                  prospectLifecycleStatus === 'demo_ready'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                3. DEMO_READY
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                  prospectLifecycleStatus === 'qualified'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                4. QUALIFIED
              </span>
            </div>
          </div>

          {activeProspectId && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">CRM Record:</span>
              <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {activeProspectId}
              </span>
            </div>
          )}
        </div>

        {/* Prospect Selector & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label htmlFor="prospect-selector" className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Select Prospect:
            </label>
            <select
              id="prospect-selector"
              value={activeProspectId || ''}
              onChange={(e) => handleSelectProspect(e.target.value)}
              className="w-full sm:max-w-md px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">+ Create New Prospect</option>
              {prospectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.company_name} ({p.industry}) — [{p.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveProspectDraft}
              disabled={isSavingProspect}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              {isSavingProspect ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to CRM...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Save Prospect Draft</span>
                </>
              )}
            </button>
          </div>
        </div>

        {saveProspectNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{saveProspectNotice}</span>
          </div>
        )}
      </div>

      {/* STEP 1: PROSPECT INTAKE FORM */}
      {!analysisResult ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Business & Operational Profile</h2>
                <p className="text-xs text-slate-500">Provide details about your business to detect revenue leaks and match an AI Employee.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              Step 1 of 4
            </span>
          </div>

          {analysisError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label htmlFor="company-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="company-name-input"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Luxury Estates, Apollo Health Clinic"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            {/* Industry Selector */}
            <div className="space-y-1.5">
              <label htmlFor="industry-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Industry <span className="text-red-500">*</span>
              </label>
              <select
                id="industry-select"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                {INDUSTRY_PRESETS.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Operational Challenges Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Operational Challenges & Bottlenecks
            </label>
            <p className="text-xs text-slate-500">Select all that apply to pinpoint revenue leaks:</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {CHALLENGE_PRESETS.map((challenge) => {
                const active = selectedChallenges.includes(challenge)
                return (
                  <button
                    key={challenge}
                    type="button"
                    onClick={() => toggleChallenge(challenge)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {challenge}
                  </button>
                )
              })}
            </div>
            <form onSubmit={addCustomChallenge} className="flex gap-2 pt-2">
              <input
                type="text"
                value={customChallenge}
                onChange={(e) => setCustomChallenge(e.target.value)}
                placeholder="Or type a custom challenge and press Enter..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Add
              </button>
            </form>
          </div>

          {/* Current Channels */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Current Customer Channels
            </label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_PRESETS.map((chan) => {
                const active = selectedChannels.includes(chan)
                return (
                  <button
                    key={chan}
                    type="button"
                    onClick={() => toggleChannel(chan)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {chan}
                  </button>
                )
              })}
            </div>
            <form onSubmit={addCustomChannel} className="flex gap-2 pt-2">
              <input
                type="text"
                value={customChannel}
                onChange={(e) => setCustomChannel(e.target.value)}
                placeholder="Or type a custom channel (e.g. SMS, Telephony) and press Enter..."
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Add
              </button>
            </form>
          </div>

          {/* Optional CRM Qualification Fields */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Optional Lead Qualification Attributes (CRM Simulation)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Provide sample contact and qualification data to verify CRM readiness in sandbox mode:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact Name (e.g. Dr. Ramesh)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (e.g. +91 98765 43210)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (e.g. Tirupati)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Budget / Requirement (e.g. ₹1.5 Cr)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="Timeline (e.g. Immediate / 3 months)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Business & Revenue Leaks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Business</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* STEPS 2, 3 & 4: ANALYSIS RESULTS, DEMO & CRM READINESS */
        <div className="space-y-8">
          {/* Top Bar with Re-Analyze Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  Analysis Complete
                </span>
                <span className="text-xs text-slate-500">
                  {analysisResult.prospect.company_name} ({analysisResult.prospect.industry})
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                AI Employee Deployment Blueprint
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Analyze Another Business</span>
            </button>
          </div>

          {/* STEP 2: REVENUE LEAKS & AI EMPLOYEE MATCH */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Detected Revenue Leaks */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                    Detected Revenue Leaks ({analysisResult.revenue_leaks.length})
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  Actionable
                </span>
              </div>

              <div className="space-y-3">
                {analysisResult.revenue_leaks.map((leak, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{leak.title}</h4>
                        {leak.problem && leak.problem !== leak.title && (
                          <p className="text-xs text-slate-600 mt-0.5 font-medium">{leak.problem}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                            leak.confidence === 'high'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : leak.confidence === 'medium'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {leak.confidence} confidence
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                            leak.severity === 'high'
                              ? 'bg-red-100 text-red-700'
                              : leak.severity === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {leak.severity} severity
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{leak.description}</p>

                    {/* Operational Evidence */}
                    {leak.evidence && leak.evidence.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Evidence:
                        </span>
                        <ul className="space-y-0.5">
                          {leak.evidence.map((ev, evIdx) => (
                            <li key={evIdx} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="text-slate-400">•</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Likely Operational Impact (truthful, non-fabricated) */}
                    <div className="pt-1">
                      <p className="text-xs text-slate-700">
                        <strong className="text-slate-900 font-semibold">Likely Impact:</strong>{' '}
                        {leak.likely_impact || leak.estimated_impact}
                      </p>
                    </div>

                    {/* Opportunity */}
                    {leak.opportunity && (
                      <div className="pt-0.5">
                        <p className="text-xs text-blue-800 bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                          <strong className="font-semibold text-blue-900">Opportunity:</strong> {leak.opportunity}
                        </p>
                      </div>
                    )}

                    {/* Explicit Uncertainty Notice */}
                    {leak.uncertainty && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Uncertainty Notice:</strong>
                          <span>{leak.uncertainty}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Matched Canonical AI Employee */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                    Matched AI Employee
                  </h3>
                </div>
                {analysisResult.recommended_employee && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    {analysisResult.recommended_employee.match_score}% Match Score
                  </span>
                )}
              </div>

              {analysisResult.recommended_employee ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        {analysisResult.recommended_employee.employee_name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {analysisResult.recommended_employee.employee.title} · {analysisResult.recommended_employee.employee.department}
                      </p>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {analysisResult.recommended_employee.employee.description}
                    </p>

                    {/* Addressed Business Problem */}
                    {analysisResult.demo?.business_problem && (
                      <div className="pt-2 border-t border-blue-200/50">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Addressed Business Problem:
                        </span>
                        <p className="text-xs text-slate-800 font-medium">
                          {analysisResult.demo.business_problem}
                        </p>
                      </div>
                    )}

                    {/* Match Reasons */}
                    {analysisResult.recommended_employee.reasons.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-blue-200/50">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Why this employee matches:
                        </span>
                        <ul className="space-y-1">
                          {analysisResult.recommended_employee.reasons.map((r, rIdx) => (
                            <li key={rIdx} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* What this AI Employee would do */}
                    {analysisResult.demo?.employee_actions && analysisResult.demo.employee_actions.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          What this AI Employee would do:
                        </span>
                        <ul className="space-y-1">
                          {analysisResult.demo.employee_actions.map((act, aIdx) => (
                            <li key={aIdx} className="text-xs text-slate-700 flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Expected Operational Outcome */}
                    {analysisResult.demo?.expected_operational_outcome && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                          Expected Operational Outcome:
                        </span>
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-blue-200 leading-relaxed">
                          {analysisResult.demo.expected_operational_outcome}
                        </p>
                      </div>
                    )}

                    {/* Missing Information for Live Rollout */}
                    {analysisResult.demo?.missing_information && analysisResult.demo.missing_information.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                          Missing Information for Live Rollout:
                        </span>
                        <ul className="space-y-1">
                          {analysisResult.demo.missing_information.map((miss, mIdx) => (
                            <li
                              key={mIdx}
                              className="text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200/80 flex items-center gap-1.5"
                            >
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{miss}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Operational Uncertainty */}
                    {analysisResult.demo?.uncertainty && (
                      <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs">
                        <strong className="block text-slate-800 font-bold mb-0.5">Deployment Notice:</strong>
                        <span>{analysisResult.demo.uncertainty}</span>
                      </div>
                    )}

                    {/* Planned Workflow */}
                    {analysisResult.demo?.workflow_id && (
                      <div className="pt-2 flex items-center justify-between text-xs text-slate-600 border-t border-blue-200/50">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Workflow className="w-3.5 h-3.5 text-blue-600" />
                          Planned Workflow:
                        </span>
                        <span className="font-mono text-xs text-blue-700 bg-white px-2 py-0.5 border border-blue-200 rounded">
                          {analysisResult.demo.workflow_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No direct employee match found for this configuration.
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: PERSONALIZED DEMO AREA */}
          {analysisResult.demo && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {analysisResult.demo.headline}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {analysisResult.demo.scenario}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sandbox Demo Mode</span>
                </span>
              </div>

              {/* Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  Sandbox Demo — No real customer notifications, leads, or external bookings are executed.
                </span>
                <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                  hasRealSideEffects: false
                </span>
              </div>

              {/* Conversation Starters (Exactly 3) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Click a conversation starter to test in sandbox:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {analysisResult.demo.conversation_starters.map((starter, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleRunDemoTurn(starter)}
                      disabled={isExecutingDemo}
                      className="text-left p-3 rounded-xl bg-blue-50/50 hover:bg-blue-100/60 border border-blue-200/80 text-xs text-blue-900 font-medium transition cursor-pointer hover:shadow-xs disabled:opacity-50"
                    >
                      <span className="text-blue-600 font-bold block mb-1">Starter {sIdx + 1}</span>
                      "{starter}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Simulator Window */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col h-[380px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {demoHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                      <Bot className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium">
                        Select a conversation starter above or type an inquiry to test the AI Employee.
                      </p>
                    </div>
                  ) : (
                    demoHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2.5 items-start ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm max-w-[85%] leading-relaxed shadow-xs ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {isExecutingDemo && (
                    <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>AI Employee is reasoning in sandbox...</span>
                    </div>
                  )}

                  {demoError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{demoError}</span>
                    </div>
                  )}
                </div>

                {/* Latest Turn Execution Metadata (Planned Workflow & Read-Only Tools) */}
                {latestDemoResult && (
                  <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Sandbox Safety:</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Zero Live Side Effects
                      </span>
                    </div>
                    {latestDemoResult.simulatedActions.length > 0 && (
                      <span className="font-mono text-slate-500">
                        {latestDemoResult.simulatedActions.join(' | ')}
                      </span>
                    )}
                  </div>
                )}

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleRunDemoTurn(demoInputMessage)
                  }}
                  className="p-3 bg-white border-t border-slate-200 flex gap-2"
                >
                  <input
                    type="text"
                    value={demoInputMessage}
                    onChange={(e) => setDemoInputMessage(e.target.value)}
                    placeholder="Type an inquiry for the AI Employee in sandbox..."
                    disabled={isExecutingDemo}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!demoInputMessage.trim() || isExecutingDemo}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STEP 4: CRM READINESS INSPECTION */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">CRM Readiness Inspection</h3>
                  <p className="text-xs text-slate-500">Evaluates prospect qualification against authoritative CRM schema.</p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  analysisResult.crm.ready_for_lead_creation
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {analysisResult.crm.ready_for_lead_creation
                  ? '🟢 CRM-Ready Lead Payload'
                  : '🟡 Incomplete Qualification Data'}
              </span>
            </div>

            {analysisResult.crm.ready_for_lead_creation ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-4">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All 5 mandatory CRM qualification fields are satisfied:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Name</span>
                    <span className="font-semibold text-slate-800">{analysisResult.crm.lead_payload?.name}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Phone</span>
                    <span className="font-semibold text-slate-800">{analysisResult.crm.lead_payload?.phone}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Location</span>
                    <span className="font-semibold text-slate-800">{analysisResult.crm.lead_payload?.location}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Budget</span>
                    <span className="font-semibold text-slate-800">{analysisResult.crm.lead_payload?.budget}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Timeline</span>
                    <span className="font-semibold text-slate-800">{analysisResult.crm.lead_payload?.timeline}</span>
                  </div>
                </div>

                {/* Save to CRM Action Bar */}
                <div className="pt-3 border-t border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-[11px] text-emerald-800">
                    ✓ <strong>Explicit Conversion:</strong> Click below to explicitly create or update this qualified prospect record in your CRM.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveToCrm}
                    disabled={isSavingToCrm}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSavingToCrm ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to CRM...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>Save Qualified Lead to CRM</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Success Feedback */}
                {crmSaveResult?.success && (
                  <div className="p-4 bg-white rounded-xl border border-emerald-300 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {crmSaveResult.isUpdate
                            ? 'Lead Record Successfully Updated in CRM!'
                            : 'Lead Record Successfully Created in CRM!'}
                        </span>
                      </div>
                      {crmSaveResult.leadId && (
                        <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ID: {crmSaveResult.leadId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      The prospect has been synchronized to the CRM pipeline with status <strong className="text-slate-800">qualified</strong>.
                    </p>
                    <div className="pt-1">
                      <Link
                        href="/leads"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                      >
                        <span>View in Leads CRM</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Activate & Provision AI Employee Workspace Block */}
                    <div className="mt-3 pt-3 border-t border-emerald-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <Bot className="w-4 h-4 text-emerald-600" />
                            <span>AI Employee Workspace Activation</span>
                          </h4>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Provision a client account and bind <strong>{analysisResult.recommended_employee?.employee_name || 'AI Employee'}</strong> with workflow <strong>{analysisResult.demo?.workflow_id || 'wf-001'}</strong> in the Grovaitech Control Plane.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleProvisionClient}
                          disabled={isProvisioning || provisionResult?.success}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {isProvisioning ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Activating & Provisioning...</span>
                            </>
                          ) : provisionResult?.success ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Workspace Activated</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Activate & Deploy AI Employee</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Provision Success Card */}
                      {provisionResult?.success && provisionResult.deployment && (
                        <div className="p-4 bg-slate-900 text-white rounded-xl border border-blue-500/30 shadow-md space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                              <span>Client Workspace & AI Employee Successfully Activated!</span>
                            </div>
                            <span className="text-[11px] font-mono text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                              ID: {provisionResult.deployment.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/80">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Client Account</span>
                              <span className="font-semibold text-slate-100">{provisionResult.deployment.company_name}</span>
                            </div>
                            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/80">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned AI Employee</span>
                              <span className="font-semibold text-slate-100">{provisionResult.deployment.assigned_employee_name}</span>
                            </div>
                            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/80">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Bound Workflow</span>
                              <span className="font-semibold text-slate-100">{provisionResult.deployment.assigned_workflow_id} ({provisionResult.deployment.assigned_workflow_name})</span>
                            </div>
                            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/80">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                Active in Control Plane
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800">
                            <p className="text-[11px] text-slate-400">
                              ✓ Provisioned in Grovaitech Control Plane. AI Employee workspace & workflow state are active.
                            </p>
                            <Link
                              href="/dashboard/clients"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                            >
                              <span>View in Client Command Center</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Provision Error Card */}
                      {provisionResult && !provisionResult.success && (
                        <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block font-bold">Failed to activate client workspace</strong>
                            <span>{provisionResult.error}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Feedback */}
                {crmSaveResult && !crmSaveResult.success && (
                  <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Failed to save lead to CRM</strong>
                      <span>{crmSaveResult.error}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Missing required qualification attributes:</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.crm.missing_fields.map((field, fIdx) => (
                    <span
                      key={fIdx}
                      className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 text-xs font-semibold rounded-md"
                    >
                      Missing: {field}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-amber-800 leading-relaxed pt-1">
                  During production deployment, the AI Employee conversationally asks for and qualifies these missing fields before creating a verified lead record in CRM.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
