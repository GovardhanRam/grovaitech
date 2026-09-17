'use client'

/**
 * Grovaitech AI Platform
 * components/content/ContentHubWorkspace.tsx
 *
 * Operational Command Center for Social Media Content Hub & Human Approval Workspace.
 * Stage 6 (Human Approval) implementation for the Social Media Marketing AI Employee.
 *
 * Capabilities:
 * - Real-time KPI Overview (Pending, Approved, Scheduled, Published, QA Score)
 * - Platform-grouped filtering (LinkedIn, X, Instagram, Facebook, YouTube)
 * - Multi-stage live Generation Flow connected to executeSocialMediaRecipe()
 * - Human-in-the-Loop review actions: Approve, Edit/Refine, Reject, Schedule
 * - Original vs Refined version preservation and QA Rubric inspection
 */

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Bot,
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Edit3,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  ExternalLink,
  ShieldCheck,
  Search,
  MessageSquare,
  Hash,
  HelpCircle,
  Loader2,
  CalendarDays,
  FileText,
  Sliders,
} from 'lucide-react'
import type {
  ContentPostItem,
  ContentPackageItem,
  ContentHubOverview,
  SocialPlatform,
  SocialPostStatus,
} from '@/types/content'
import {
  generateContentRunAction,
  approvePostAction,
  rejectPostAction,
  editPostAction,
  schedulePostAction,
} from '@/app/actions/content'

interface ContentHubWorkspaceProps {
  initialPackages: ContentPackageItem[]
  initialPosts: ContentPostItem[]
  initialOverview: ContentHubOverview
  isFallback?: boolean
}

const PLATFORM_CONFIG: Record<
  SocialPlatform,
  { name: string; bgBadge: string; textBadge: string; borderBadge: string; charLimit: number }
> = {
  linkedin: {
    name: 'LinkedIn',
    bgBadge: 'bg-blue-50',
    textBadge: 'text-blue-700',
    borderBadge: 'border-blue-200',
    charLimit: 3000,
  },
  x: {
    name: 'X (Twitter)',
    bgBadge: 'bg-slate-100',
    textBadge: 'text-slate-800',
    borderBadge: 'border-slate-300',
    charLimit: 280,
  },
  instagram: {
    name: 'Instagram',
    bgBadge: 'bg-pink-50',
    textBadge: 'text-pink-700',
    borderBadge: 'border-pink-200',
    charLimit: 2200,
  },
  facebook: {
    name: 'Facebook',
    bgBadge: 'bg-indigo-50',
    textBadge: 'text-indigo-700',
    borderBadge: 'border-indigo-200',
    charLimit: 5000,
  },
  youtube: {
    name: 'YouTube Community',
    bgBadge: 'bg-red-50',
    textBadge: 'text-red-700',
    borderBadge: 'border-red-200',
    charLimit: 5000,
  },
}

export default function ContentHubWorkspace({
  initialPackages,
  initialPosts,
  initialOverview,
  isFallback = false,
}: ContentHubWorkspaceProps) {
  const [packages, setPackages] = useState<ContentPackageItem[]>(initialPackages)
  const [posts, setPosts] = useState<ContentPostItem[]>(initialPosts)
  const [overview, setOverview] = useState<ContentHubOverview>(initialOverview)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedRubricId, setExpandedRubricId] = useState<string | null>(null)
  const [viewOriginalId, setViewOriginalId] = useState<string | null>(null)

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [generationStep, setGenerationStep] = useState<number>(0)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Edit Modal state
  const [editingPost, setEditingPost] = useState<ContentPostItem | null>(null)
  const [editedText, setEditedText] = useState('')

  // Reject Modal state
  const [rejectingPost, setRejectingPost] = useState<ContentPostItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Schedule Modal state
  const [schedulingPost, setSchedulingPost] = useState<ContentPostItem | null>(null)
  const [scheduleDateTime, setScheduleDateTime] = useState('')

  const [isPending, startTransition] = useTransition()

  // Generation Form inputs (preloaded from defaults or local storage)
  const [genConfig, setGenConfig] = useState({
    businessName: 'Apex Health Systems',
    industry: 'Healthcare & Clinical Tech',
    targetAudience: 'Clinic directors, healthcare administrators, practitioners',
    brandVoice: 'Empathetic, authoritative, clinical, and reassuring',
    contentTopics: 'Clinical AI workflow, patient wait-time reduction, telehealth data privacy',
    platforms: ['linkedin', 'x', 'instagram'],
    callToAction: 'Book a consultation at apexhealth.example.com',
  })

  // Recalculate overview metrics whenever posts change
  const refreshOverview = (updatedPosts: ContentPostItem[]) => {
    let pending = 0
    let approved = 0
    let scheduled = 0
    let published = 0
    let rejected = 0
    for (const p of updatedPosts) {
      if (p.status === 'pending_approval') pending++
      else if (p.status === 'approved') approved++
      else if (p.status === 'scheduled') scheduled++
      else if (p.status === 'published') published++
      else if (p.status === 'rejected') rejected++
    }
    const avgQa =
      updatedPosts.length > 0
        ? Math.round(updatedPosts.reduce((acc, p) => acc + p.qaScore, 0) / updatedPosts.length)
        : overview.latestQaScore

    setOverview({
      pendingCount: pending,
      approvedCount: approved,
      scheduledCount: scheduled,
      publishedCount: published,
      rejectedCount: rejected,
      totalPostsCount: updatedPosts.length,
      latestQaScore: avgQa,
      latestRunAt: overview.latestRunAt,
    })
  }

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (selectedPlatform !== 'all' && post.platform !== selectedPlatform) return false
      if (selectedStatus !== 'all' && post.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const contentMatch = (post.editedContent || post.originalContent).toLowerCase().includes(q)
        const hookMatch = post.hook?.toLowerCase().includes(q)
        const platformMatch = post.platform.toLowerCase().includes(q)
        if (!contentMatch && !hookMatch && !platformMatch) return false
      }
      return true
    })
  }, [posts, selectedPlatform, selectedStatus, searchQuery])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApprove = (postId: string) => {
    startTransition(async () => {
      const res = await approvePostAction({ postId })
      if (res.success && res.post) {
        const next = posts.map((p) => (p.id === postId ? res.post! : p))
        setPosts(next)
        refreshOverview(next)
      }
    })
  }

  const handleOpenEdit = (post: ContentPostItem) => {
    setEditingPost(post)
    setEditedText(post.editedContent || post.originalContent)
  }

  const handleSaveEdit = () => {
    if (!editingPost) return
    startTransition(async () => {
      const res = await editPostAction({ postId: editingPost.id, editedContent: editedText })
      if (res.success && res.post) {
        const next = posts.map((p) => (p.id === editingPost.id ? res.post! : p))
        setPosts(next)
        refreshOverview(next)
        setEditingPost(null)
      }
    })
  }

  const handleOpenReject = (post: ContentPostItem) => {
    setRejectingPost(post)
    setRejectionReason('')
  }

  const handleConfirmReject = () => {
    if (!rejectingPost) return
    startTransition(async () => {
      const res = await rejectPostAction({
        postId: rejectingPost.id,
        rejectionReason: rejectionReason || 'Rejected by human reviewer',
      })
      if (res.success && res.post) {
        const next = posts.map((p) => (p.id === rejectingPost.id ? res.post! : p))
        setPosts(next)
        refreshOverview(next)
        setRejectingPost(null)
      }
    })
  }

  const handleOpenSchedule = (post: ContentPostItem) => {
    setSchedulingPost(post)
    // Default to tomorrow 9am local
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    // Format YYYY-MM-DDTHH:MM
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setScheduleDateTime(localIso)
  }

  const handleConfirmSchedule = () => {
    if (!schedulingPost || !scheduleDateTime) return
    startTransition(async () => {
      const res = await schedulePostAction({
        postId: schedulingPost.id,
        scheduledAt: new Date(scheduleDateTime).toISOString(),
      })
      if (res.success && res.post) {
        const next = posts.map((p) => (p.id === schedulingPost.id ? res.post! : p))
        setPosts(next)
        refreshOverview(next)
        setSchedulingPost(null)
      }
    })
  }

  const handleTriggerGeneration = () => {
    setGenerationError(null)
    setGenerationStep(1) // 1. Research

    const topicsArr = genConfig.contentTopics
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payloadConfig = {
      businessName: genConfig.businessName,
      industry: genConfig.industry,
      targetAudience: genConfig.targetAudience,
      brandVoice: genConfig.brandVoice,
      contentTopics: topicsArr.length > 0 ? topicsArr : ['Industry Trends', 'Best Practices'],
      platforms: genConfig.platforms,
      postingFrequency: '3_times_week',
      approvalMode: 'human_approval',
      callToAction: genConfig.callToAction,
    }

    startTransition(async () => {
      // Step simulation for visual feedback while Gemini executes
      const stepTimer1 = setTimeout(() => setGenerationStep(2), 2000) // Ideas
      const stepTimer2 = setTimeout(() => setGenerationStep(3), 4000) // Drafts
      const stepTimer3 = setTimeout(() => setGenerationStep(4), 6000) // QA

      try {
        const res = await generateContentRunAction({
          config: payloadConfig,
        })

        clearTimeout(stepTimer1)
        clearTimeout(stepTimer2)
        clearTimeout(stepTimer3)

        if (res.success && res.posts) {
          setGenerationStep(5) // Ready
          setTimeout(() => {
            const nextPosts = [...res.posts!, ...posts]
            setPosts(nextPosts)
            if (res.package) {
              setPackages([res.package, ...packages])
            }
            refreshOverview(nextPosts)
            setIsGenerateModalOpen(false)
            setGenerationStep(0)
          }, 1000)
        } else {
          setGenerationError(res.error || 'Failed to generate content.')
          setGenerationStep(0)
        }
      } catch (err: any) {
        clearTimeout(stepTimer1)
        clearTimeout(stepTimer2)
        clearTimeout(stepTimer3)
        setGenerationError(err?.message || 'Generation pipeline failed.')
        setGenerationStep(0)
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* ── 1. Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Bot className="w-3.5 h-3.5" />
              Social Media Marketing AI Employee
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Stage 6 · Human Approval Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Social Media Content Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit, refine, approve, and schedule platform-tailored content generated by your AI Marketing Employee.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/ai-employees/social-media-marketing"
            className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
            title="Configure Recipe"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Recipe Config</span>
          </Link>

          <button
            onClick={() => {
              setIsGenerateModalOpen(true)
              setGenerationError(null)
              setGenerationStep(0)
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Content Run</span>
          </button>
        </div>
      </div>

      {/* ── 2. KPI Overview Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Pending Approval */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{overview.pendingCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting human sign-off</p>
        </div>

        {/* Approved */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{overview.approvedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for distribution</p>
        </div>

        {/* Scheduled */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Scheduled</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{overview.scheduledCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Time slots reserved</p>
        </div>

        {/* Published */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Published</span>
            <Send className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{overview.publishedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Live platform posts</p>
        </div>

        {/* Latest QA Score */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Brand QA Score</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {overview.latestQaScore}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">4-dimension rubric average</p>
        </div>
      </div>

      {/* ── 3. Filters & Platform Selector ────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        {/* Platform Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">
            Platform:
          </span>
          {[
            { id: 'all', label: 'All Platforms' },
            { id: 'linkedin', label: 'LinkedIn' },
            { id: 'x', label: 'X (Twitter)' },
            { id: 'instagram', label: 'Instagram' },
            { id: 'facebook', label: 'Facebook' },
            { id: 'youtube', label: 'YouTube' },
          ].map((item) => {
            const isSel = selectedPlatform === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSelectedPlatform(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isSel
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Status:
            </span>
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'pending_approval', label: 'Pending Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'rejected', label: 'Rejected' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts or hooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
        </div>
      </div>

      {/* ── 4. Content Post Cards ─────────────────────────────────────────── */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No content items found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {posts.length === 0
              ? 'Click "Generate Content Run" above to run research, ideation, platform drafting, and brand QA.'
              : 'No posts match your selected platform or status filters.'}
          </p>
          {posts.length === 0 && (
            <button
              onClick={() => {
                setIsGenerateModalOpen(true)
                setGenerationError(null)
                setGenerationStep(0)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate First Run</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPosts.map((post) => {
            const platformCfg = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.linkedin
            const isOriginalActive = viewOriginalId === post.id
            const displayContent = isOriginalActive ? post.originalContent : post.editedContent || post.originalContent
            const isEdited = Boolean(post.editedContent && post.editedContent !== post.originalContent)
            const isRubricExpanded = expandedRubricId === post.id

            // Status Badge Config
            const statusConfig: Record<SocialPostStatus, { label: string; cls: string }> = {
              pending_approval: { label: 'Pending Review', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
              approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
              scheduled: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
              published: { label: 'Published', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
              rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
            }
            const stBadge = statusConfig[post.status] || statusConfig.pending_approval

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide border ${platformCfg.bgBadge} ${platformCfg.textBadge} ${platformCfg.borderBadge}`}
                      >
                        {platformCfg.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stBadge.cls}`}
                      >
                        {stBadge.label}
                      </span>
                      {isEdited && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Refined
                        </span>
                      )}
                    </div>

                    {post.hook && (
                      <h4 className="text-xs font-bold text-slate-800 mt-1.5 line-clamp-1">
                        {post.format ? <span className="text-slate-400 font-medium capitalize">{post.format.replace('_', ' ')} · </span> : null}
                        &ldquo;{post.hook}&rdquo;
                      </h4>
                    )}
                  </div>

                  {/* QA Score Badge */}
                  <div className="shrink-0 text-right">
                    <button
                      type="button"
                      onClick={() => setExpandedRubricId(isRubricExpanded ? null : post.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 border transition ${
                        post.qaScore >= 85
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : post.qaScore >= 75
                          ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                      title="Inspect QA Rubric breakdown"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{post.qaScore}/100</span>
                      {isRubricExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Rubric Breakdown Dropdown */}
                {isRubricExpanded && (
                  <div className="p-4 bg-slate-900 text-white text-xs border-b border-slate-800 space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-300 pb-1 border-b border-slate-800">
                      <span>Brand & Compliance QA Rubric</span>
                      <span>Score: {post.qaScore}/100</span>
                    </div>
                    {post.qaBreakdown ? (
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div>Tone Consistency: <strong className="text-white">{post.qaBreakdown.toneConsistency}/25</strong></div>
                        <div>Compliance & Safety: <strong className="text-white">{post.qaBreakdown.complianceSafety}/25</strong></div>
                        <div>Factual Grounding: <strong className="text-white">{post.qaBreakdown.factualGrounding}/25</strong></div>
                        <div>Platform Format: <strong className="text-white">{post.qaBreakdown.platformFormat}/25</strong></div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[11px]">Detailed breakdown logged in execution telemetry.</p>
                    )}
                    {post.qaViolations && post.qaViolations.length > 0 && (
                      <div className="pt-1 text-rose-300 text-[11px]">
                        <strong>Flags:</strong> {post.qaViolations.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Post Content Body */}
                <div className="p-5 space-y-3 flex-1">
                  {/* Toggle between Refined and Original if edited */}
                  {isEdited && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-100 pb-1.5">
                      <span>{isOriginalActive ? 'Showing Original AI Draft' : 'Showing Refined Copy'}</span>
                      <button
                        type="button"
                        onClick={() => setViewOriginalId(isOriginalActive ? null : post.id)}
                        className="text-blue-600 hover:text-blue-700 font-bold"
                      >
                        {isOriginalActive ? 'View Refined' : 'Compare Original'}
                      </button>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-xs text-slate-800 leading-relaxed font-sans max-h-60 overflow-y-auto">
                    {displayContent}
                  </div>

                  {/* Hashtags & CTA info */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {post.hashtags.map((tag, idx) => (
                        <span key={idx} className="text-[11px] text-blue-600 font-semibold">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Scheduled info or Rejection reason */}
                  {post.status === 'scheduled' && post.scheduledAt && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      <span>
                        Scheduled for <strong>{new Date(post.scheduledAt).toLocaleString()}</strong>
                      </span>
                    </div>
                  )}

                  {post.status === 'rejected' && post.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <strong>Rejection Reason:</strong> {post.rejectionReason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{displayContent.length} chars</span>
                    <span>·</span>
                    <span>Limit: {platformCfg.charLimit}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {post.status !== 'approved' && post.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(post.id)}
                        disabled={isPending}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                        title="Approve post for publishing"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(post)}
                      disabled={isPending}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      title="Edit/Refine copy"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Refine</span>
                    </button>

                    {post.status !== 'scheduled' && post.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => handleOpenSchedule(post)}
                        disabled={isPending}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        title="Schedule date and time"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Schedule</span>
                      </button>
                    )}

                    {post.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => handleOpenReject(post)}
                        disabled={isPending}
                        className="px-2 py-1.5 text-slate-400 hover:text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        title="Reject draft"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 5. Generate Run Modal ─────────────────────────────────────────── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  Autonomous Content Pipeline
                </span>
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-2">Generate Multi-Platform Run</h3>
              <p className="text-xs text-slate-500 mt-1">
                Executes the 4-stage Social Media AI Employee workflow to research, ideate, generate, and QA-audit drafts grounded in your verified brand facts.
              </p>
            </div>

            {generationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{generationError}</span>
              </div>
            )}

            {/* Pipeline Stage Indicators */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Pipeline Progression
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                {[
                  { step: 1, name: '1. Research' },
                  { step: 2, name: '2. Ideation' },
                  { step: 3, name: '3. Drafts' },
                  { step: 4, name: '4. Rubric QA' },
                ].map((s) => (
                  <div
                    key={s.step}
                    className={`py-2 rounded-xl border transition ${
                      generationStep === s.step
                        ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
                        : generationStep > s.step
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {generationStep > s.step ? '✓ ' : ''}
                    {s.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Config Inputs */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={genConfig.businessName}
                  onChange={(e) => setGenConfig({ ...genConfig, businessName: e.target.value })}
                  disabled={generationStep > 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={genConfig.industry}
                    onChange={(e) => setGenConfig({ ...genConfig, industry: e.target.value })}
                    disabled={generationStep > 0}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand Voice</label>
                  <input
                    type="text"
                    value={genConfig.brandVoice}
                    onChange={(e) => setGenConfig({ ...genConfig, brandVoice: e.target.value })}
                    disabled={generationStep > 0}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Focus Topics / Themes (Comma-separated)
                </label>
                <input
                  type="text"
                  value={genConfig.contentTopics}
                  onChange={(e) => setGenConfig({ ...genConfig, contentTopics: e.target.value })}
                  disabled={generationStep > 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                disabled={generationStep > 0}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerGeneration}
                disabled={generationStep > 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {generationStep > 0 ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Generation Run</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Edit/Refine Modal ──────────────────────────────────────────── */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Stage 6 · Human Refinement
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Refine {PLATFORM_CONFIG[editingPost.platform]?.name || editingPost.platform} Post
                </h3>
              </div>
              <button
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Post Content</label>
              <textarea
                rows={8}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>{editedText.length} characters</span>
                <span>Limit: {PLATFORM_CONFIG[editingPost.platform]?.charLimit}</span>
              </div>
            </div>

            {/* Original Draft Collapsible Reference */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Original Draft Reference
              </span>
              <p className="text-[11px] text-slate-600 line-clamp-3 italic">
                &ldquo;{editingPost.originalContent}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isPending || !editedText.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Refinement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Rejection Modal ────────────────────────────────────────────── */}
      {rejectingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Reject Draft
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Reject Content Draft</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record feedback to mark this post as rejected. This aids future AI quality tuning.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Rejection</label>
              <div className="space-y-1.5 mb-3">
                {[
                  'Tone does not match brand guidelines',
                  'Factual inaccuracy or unverified claim',
                  'Weak hook or low engagement angle',
                  'Wrong audience targeting',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      rejectionReason === reason
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Or enter custom reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingPost(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Schedule Modal ─────────────────────────────────────────────── */}
      {schedulingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Schedule Delivery
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Schedule Post Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the target date and time when this content should be scheduled.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Publication Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
              <strong>Notice:</strong> Post will transition to <strong>Scheduled</strong> status in the Content Hub. Once certified live publishing credentials are connected (LinkedIn API / Meta API), publishing triggers automatically.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSchedulingPost(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={isPending || !scheduleDateTime}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Confirm Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
