'use client'

/**
 * Grovaitech AI Platform
 * components/employee/EmployeeConfigurationForm.tsx
 *
 * Real Configuration UI for AI Employee Recipes.
 * Strictly uses canonical EmployeeConfigurationSchema for validation and field definitions.
 *
 * Distinctly displays:
 * - Required fields vs Optional fields
 * - Implemented integrations vs Integrations requiring connection
 * - Safe sandbox/demo functionality disclosures
 */

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getRecipeBySlug } from '@/lib/recipes'
import { validateRecipeConfiguration } from '@/app/actions/recipes'
import {
  Settings,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Save,
  RotateCcw,
  ShieldCheck,
  Globe,
  Share2,
  Sliders,
  Layers,
  HelpCircle,
  Lock,
  Radio,
  ExternalLink,
} from 'lucide-react'

interface EmployeeConfigurationFormProps {
  recipeSlug: string
  onSaved?: (config: Record<string, any>) => void
}

const STORAGE_KEY_PREFIX = 'grovaitech_recipe_config_'

const PLATFORM_LABELS: Record<string, { label: string; badge: string }> = {
  linkedin: { label: 'LinkedIn', badge: 'B2B & Thought Leadership' },
  instagram: { label: 'Instagram', badge: 'Visual & Stories' },
  facebook: { label: 'Facebook', badge: 'Community & Groups' },
  youtube: { label: 'YouTube Community', badge: 'Video & Community' },
  x: { label: 'X (Twitter)', badge: 'Real-time & Discussions' },
}

export default function EmployeeConfigurationForm({
  recipeSlug,
  onSaved,
}: EmployeeConfigurationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const recipe = getRecipeBySlug(recipeSlug)

  // Build defaults directly from the schema
  const buildDefaultConfig = (): Record<string, any> => {
    const defaults: Record<string, any> = {}
    if (!recipe) return defaults
    for (const field of recipe.configurationSchema.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = Array.isArray(field.defaultValue)
          ? [...field.defaultValue]
          : field.defaultValue
      } else if (field.type === 'array' || field.type === 'multiselect') {
        defaults[field.name] = []
      } else if (field.type === 'boolean') {
        defaults[field.name] = false
      } else {
        defaults[field.name] = ''
      }
    }
    return defaults
  }

  const [formData, setFormData] = useState<Record<string, any>>(buildDefaultConfig)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [newTopicInput, setNewTopicInput] = useState('')
  const [newKnowledgeInput, setNewKnowledgeInput] = useState('')

  const storageKey = `${STORAGE_KEY_PREFIX}${recipeSlug}`

  // Load existing configuration from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          setFormData((prev) => ({ ...prev, ...parsed }))
          setStatusMessage('Loaded pre-configured operating parameters from local storage.')
        }
      }
    } catch (err) {
      console.warn('[Config Storage Notice] Could not read stored config', err)
    }
  }, [storageKey])

  // Run schema validation client-side
  const validateForm = (data: Record<string, any>): { valid: boolean; errors: string[] } => {
    if (!recipe) return { valid: false, errors: ['Recipe not found.'] }
    return recipe.configurationSchema.validate(data)
  }

  // Handle standard text / select change
  const handleChange = (name: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      if (hasAttemptedSubmit) {
        const check = validateForm(updated)
        setValidationErrors(check.errors)
      }
      return updated
    })
    setSaveStatus('idle')
  }

  // Handle platform multi-select toggle
  const togglePlatform = (platformKey: string) => {
    setFormData((prev) => {
      const currentList: string[] = Array.isArray(prev.platforms) ? prev.platforms : []
      const exists = currentList.includes(platformKey)
      const updated = exists
        ? currentList.filter((p) => p !== platformKey)
        : [...currentList, platformKey]
      const nextData = { ...prev, platforms: updated }
      if (hasAttemptedSubmit) {
        const check = validateForm(nextData)
        setValidationErrors(check.errors)
      }
      return nextData
    })
    setSaveStatus('idle')
  }

  // Handle array add/remove (content topics)
  const addContentTopic = () => {
    const trimmed = newTopicInput.trim()
    if (!trimmed) return
    const current: string[] = Array.isArray(formData.contentTopics) ? formData.contentTopics : []
    if (!current.includes(trimmed)) {
      handleChange('contentTopics', [...current, trimmed])
    }
    setNewTopicInput('')
  }

  const removeContentTopic = (topicToRemove: string) => {
    const current: string[] = Array.isArray(formData.contentTopics) ? formData.contentTopics : []
    handleChange(
      'contentTopics',
      current.filter((t) => t !== topicToRemove)
    )
  }

  // Handle array add/remove (knowledge sources)
  const addKnowledgeSource = () => {
    const trimmed = newKnowledgeInput.trim()
    if (!trimmed) return
    const current: string[] = Array.isArray(formData.knowledgeSources)
      ? formData.knowledgeSources
      : []
    if (!current.includes(trimmed)) {
      handleChange('knowledgeSources', [...current, trimmed])
    }
    setNewKnowledgeInput('')
  }

  const removeKnowledgeSource = (srcToRemove: string) => {
    const current: string[] = Array.isArray(formData.knowledgeSources)
      ? formData.knowledgeSources
      : []
    handleChange(
      'knowledgeSources',
      current.filter((s) => s !== srcToRemove)
    )
  }

  // Save configuration locally and invoke validation action
  const handleSave = async (redirectOnSuccess = false) => {
    setHasAttemptedSubmit(true)
    const clientCheck = validateForm(formData)

    if (!clientCheck.valid) {
      setValidationErrors(clientCheck.errors)
      setSaveStatus('error')
      setStatusMessage('Please correct the required configuration fields before proceeding.')
      return false
    }

    setValidationErrors([])

    // Save to local storage for persistent client state & hand-off
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData))
    } catch (err) {
      console.warn('[Config Storage Warning] LocalStorage unavailable', err)
    }

    // Call server action for canonical server-side validation
    startTransition(async () => {
      try {
        const serverCheck = await validateRecipeConfiguration(recipeSlug, formData)
        if (!serverCheck.valid) {
          setValidationErrors(serverCheck.errors)
          setSaveStatus('error')
          setStatusMessage('Server rejected configuration. Check required fields.')
          return
        }

        setSaveStatus('saved')
        setStatusMessage('Operating configuration validated and saved successfully.')
        if (onSaved) {
          onSaved(formData)
        }

        if (redirectOnSuccess) {
          router.push(`/deploy?employee=${recipeSlug}&configured=true`)
        }
      } catch (err: any) {
        setSaveStatus('error')
        setStatusMessage(`Error saving configuration: ${err.message || 'Unknown failure'}`)
      }
    })

    return true
  }

  // Reset to default configuration values
  const handleResetDefaults = () => {
    const defaults = buildDefaultConfig()
    setFormData(defaults)
    setValidationErrors([])
    setHasAttemptedSubmit(false)
    setSaveStatus('idle')
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setStatusMessage('Configuration reset to canonical recipe defaults.')
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* ── 1. Header Banner ──────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Recipe Configurator · v{recipe.version}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
              {recipe.category}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Configure {recipe.displayName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Customize target audience, brand voice, content pillars, and governance protocols before deployment.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Restore original recipe defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ── Status / Notification Banner ──────────────────────────────────── */}
      {statusMessage && (
        <div
          className={`px-6 py-3 text-xs font-semibold flex items-center gap-2 border-b ${
            saveStatus === 'saved'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : saveStatus === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {saveStatus === 'saved' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : saveStatus === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* ── Validation Error Summary ──────────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2 font-bold text-xs mb-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Configuration Validation Errors ({validationErrors.length})</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1 text-rose-700">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 2. Integration & Governance Disclosures Matrix ────────────────── */}
      <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Integration Readiness & Governance Matrix
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Declared Native Workflow */}
          <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Native Recipe Stages</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-100 text-blue-800">
                Specification
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Stages 1–4 (Research, Ideation, Generation, Brand QA) are declared as Native Grovaitech workflow stages. Execution runtime is under active development (Phase 2B).
            </p>
          </div>

          {/* Requires Connection */}
          <div className="p-4 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Requires Connection</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800">
                Setup Needed
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Direct social publishing to LinkedIn, Meta, or X requires connecting verified OAuth account credentials in your integrations dashboard.
            </p>
          </div>

          {/* Sandbox Disclosures */}
          <div className="p-4 bg-white rounded-xl border border-blue-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Sandbox Governance</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-100 text-blue-800">
                Protected
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Without active platform keys, the employee runs in isolated sandbox mode. Content is queued for human review with zero unauthorized live egress.
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Configuration Form Body ───────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave(false)
        }}
        className="p-6 sm:p-8 space-y-8"
      >
        {/* SECTION A: Required Brand & Market Identifiers */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                1. Core Business Profile (Required)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
              All 4 fields required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Business / Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName || ''}
                onChange={(e) => handleChange('businessName', e.target.value)}
                placeholder="e.g. Apex Dynamics Ltd."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Official name used for brand identity and content signatures.
              </p>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Industry & Market Sector <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.industry || ''}
                onChange={(e) => handleChange('industry', e.target.value)}
                placeholder="e.g. B2B SaaS, Luxury Real Estate, Healthcare"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Grounds trend research and vocabulary to your specific sector.
              </p>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Target Audience (ICP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.targetAudience || ''}
                onChange={(e) => handleChange('targetAudience', e.target.value)}
                placeholder="e.g. CMOs, Tech Founders, Enterprise HR Leaders"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Who this AI employee is writing for and engaging with.
              </p>
            </div>

            {/* Brand Voice */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Brand Voice & Tone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.brandVoice || ''}
                onChange={(e) => handleChange('brandVoice', e.target.value)}
                placeholder="e.g. Professional and authoritative, witty, empathetic"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
              {/* Quick Tone presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Professional & authoritative',
                  'Insightful & educational',
                  'Energetic & conversational',
                  'Executive & institutional',
                ].map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => handleChange('brandVoice', tone)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    + {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION B: Content Strategy & Target Channels */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                2. Content Strategy & Channel Targeting (Required)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
              All 4 fields required
            </span>
          </div>

          {/* Content Topics Pill Manager */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Content Pillars & Themes <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Core thematic subjects the AI Employee rotates across during research and generation.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {(formData.contentTopics || []).map((topic: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-lg"
                >
                  <span>{topic}</span>
                  <button
                    type="button"
                    onClick={() => removeContentTopic(topic)}
                    className="text-blue-500 hover:text-rose-600 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addContentTopic()
                  }
                }}
                placeholder="Add another topic (press Enter)..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addContentTopic}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Add Topic
              </button>
            </div>
          </div>

          {/* Target Platforms Multi-Select */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Target Social Platforms <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              Select at least one channel. Content formatting and hashtag strategies adapt per platform.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {['linkedin', 'x', 'instagram', 'facebook', 'youtube'].map((plat) => {
                const isSelected = (formData.platforms || []).includes(plat)
                const info = PLATFORM_LABELS[plat] || { label: plat, badge: 'Channel' }
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => togglePlatform(plat)}
                    className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs'
                        : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-extrabold block">{info.label}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{info.badge}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Posting Frequency & Approval Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Posting Frequency */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Posting Frequency <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.postingFrequency || '3_times_week'}
                onChange={(e) => handleChange('postingFrequency', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="daily">Daily (5–7 posts / week per active platform)</option>
                <option value="3_times_week">3 Times a Week (Recommended cadence)</option>
                <option value="weekly">Weekly (1 high-impact post / week)</option>
                <option value="custom">Custom Cadence (Configured per channel)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Cadence at which new content drafts are researched and proposed.
              </p>
            </div>

            {/* Approval Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Human-in-the-Loop Governance Mode <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('approvalMode', 'human_approval')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    formData.approvalMode === 'human_approval'
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold block">Human Approval</span>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    Recommended (Safe)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('approvalMode', 'automatic')}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    formData.approvalMode === 'automatic'
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold block">Automatic</span>
                  <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                    Autonomous Dispatch
                  </span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Human Approval requires operator review in Grovaitech dashboard before any post publishes.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION C: Optional Enhancements */}
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                3. Optional Grounding & Brand Assets
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Optional
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {/* Call to Action */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900">
                  Primary Call To Action (CTA)
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>
              <input
                type="text"
                value={formData.callToAction || ''}
                onChange={(e) => handleChange('callToAction', e.target.value)}
                placeholder="e.g. Schedule a 15-min discovery call / Download our whitepaper"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Website URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-900">
                  Business Website URL
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Knowledge Sources Pill Manager */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-900">
                Grounding Knowledge Sources & Guidelines
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Brand style guides, documentation URLs, or product briefs used to anchor content authenticity.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {(formData.knowledgeSources || []).map((src: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  <span>{src}</span>
                  <button
                    type="button"
                    onClick={() => removeKnowledgeSource(src)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={newKnowledgeInput}
                onChange={(e) => setNewKnowledgeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addKnowledgeSource()
                  }
                }}
                placeholder="e.g. Brand Guidelines 2026 PDF, Product Wiki..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addKnowledgeSource}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Add Source
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. Form Actions & Deploy Hand-Off ────────────────────────────── */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Parameters validated directly against{' '}
            <span className="font-bold text-slate-700">
              SOCIAL_MEDIA_CONFIG_SCHEMA v{recipe.configurationSchema.version}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isPending ? 'Saving...' : 'Save Configuration'}</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-60"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Deploy with Configuration →</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
