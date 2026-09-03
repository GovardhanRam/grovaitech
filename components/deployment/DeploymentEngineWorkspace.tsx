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

import { useState, useTransition } from 'react'
import {
  analyzeProspectForDeployment,
  executeDeploymentDemoAction,
} from '@/app/actions/deployment'
import type {
  Prospect,
  DeploymentAnalysis,
  DeploymentDemoResult,
  RevenueLeak,
  EmployeeMatch,
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

    if (!companyName.trim()) {
      setAnalysisError('Please enter your Company Name.')
      return
    }

    if (!industry.trim()) {
      setAnalysisError('Please select an Industry.')
      return
    }

    startAnalysisTransition(async () => {
      const res = await analyzeProspectForDeployment(currentProspect)
      if (!res.success || !res.data) {
        setAnalysisError(res.error || 'Failed to complete deployment analysis.')
        return
      }

      setAnalysisResult(res.data)
      setDemoHistory([])
      setLatestDemoResult(null)
    })
  }

  // Reset entire workspace
  const handleReset = () => {
    setAnalysisResult(null)
    setAnalysisError(null)
    setDemoHistory([])
    setLatestDemoResult(null)
    setDemoError(null)
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
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{leak.title}</h4>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          leak.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : leak.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {leak.severity} severity
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{leak.description}</p>
                    {leak.estimated_impact && (
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 pt-1">
                        <span className="text-amber-600">• Estimated Impact:</span> {leak.estimated_impact}
                      </p>
                    )}
                    {leak.detected_signals.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {leak.detected_signals.map((sig, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-500 rounded"
                          >
                            Signal: {sig}
                          </span>
                        ))}
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

                    {/* Relevant Capabilities */}
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Capabilities & Skills:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.recommended_employee.employee.capabilities.slice(0, 4).map((cap, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[11px] px-2.5 py-0.5 bg-white border border-blue-200 text-blue-700 rounded-md font-medium"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

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
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
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

                <p className="text-[11px] text-emerald-800 pt-1">
                  ✓ <strong>No Database Record Written:</strong> In live production, this lead payload is synced to your CRM/database by the AI Employee upon full qualification.
                </p>
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
