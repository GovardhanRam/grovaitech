'use client'

/**
 * Grovaitech AI Platform
 * app/(auth)/onboarding/page.tsx
 *
 * Self-Serve Customer Workspace Onboarding & Invitation Acceptance.
 * Allows authenticated Google users to either create their initial tenant organization
 * (becoming owner) or join an existing organization via an invitation code.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, LogOut, Loader2, Building2, ArrowRight, KeyRound } from 'lucide-react'
import { submitWorkspaceOnboarding, submitAcceptInvitation } from '@/app/actions/onboarding'

export default function OnboardingPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [mode, setMode] = useState<'create' | 'invite'>('create')

  // Form states
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('Real Estate')
  const [inviteToken, setInviteToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
      } else {
        setUserEmail(user.email || null)
        setLoading(false)
      }
    }
    checkSession()
  }, [router, supabase])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!companyName.trim()) {
      setErrorMessage('Company or organization name is required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await submitWorkspaceOnboarding({
        companyName: companyName.trim(),
        industry,
      })

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create workspace. Please try again.')
        setSubmitting(false)
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.')
      setSubmitting(false)
    }
  }

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!inviteToken.trim()) {
      setErrorMessage('Invitation code is required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await submitAcceptInvitation(inviteToken.trim())

      if (!res.success) {
        setErrorMessage(res.error || 'Invalid or expired invitation code.')
        setSubmitting(false)
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400 text-xs tracking-wide">Verifying account status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans p-4">
      {/* Ambient background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[25%] left-[25%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[140px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-indigo-900/10 blur-[140px]" />
      </div>

      <div className="max-w-lg w-full p-8 border border-slate-900/80 bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl relative space-y-6 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-1">
          <Link href="/" className="inline-block hover:opacity-90 transition">
            <Image
              src="/images/Grovaitech_Logo_Optimized.png"
              alt="Grovaitech Logo"
              width={120}
              height={120}
              priority
              className="h-14 w-auto object-contain bg-white rounded-xl p-1.5 shadow-md"
            />
          </Link>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Signed in as {userEmail || 'Google User'}</span>
        </div>

        {/* Heading & Context */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Set Up Your AI Workforce
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create a new client workspace or join an existing organization.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('create'); setErrorMessage(null) }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'create'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Create Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('invite'); setErrorMessage(null) }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'invite'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Accept Invite</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
            {errorMessage}
          </div>
        )}

        {/* Create Mode Form */}
        {mode === 'create' && (
          <form onSubmit={handleCreateWorkspace} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Company / Business Entity Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Horizon Realty"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Primary Industry Vertical
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Real Estate">Real Estate & Property Development</option>
                <option value="Healthcare">Healthcare & Specialty Clinics</option>
                <option value="Financial Services">Financial & Advisory Services</option>
                <option value="Technology">Technology & SaaS</option>
                <option value="Retail & E-commerce">Retail & E-commerce</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Other">Other Enterprise Industry</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Workspace...</span>
                </>
              ) : (
                <>
                  <span>Launch Dedicated Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Invite Mode Form */}
        {mode === 'invite' && (
          <form onSubmit={handleAcceptInvite} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Invitation Code or Token
              </label>
              <input
                type="text"
                required
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="Paste invitation code from your organization owner"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Join Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Sign Out Button */}
        <div className="pt-2 border-t border-slate-850">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            data-testid="onboarding-signout-button"
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {signingOut ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out & Return to Login</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
