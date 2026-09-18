'use client'

/**
 * Grovaitech AI Platform
 * app/(auth)/login/page.tsx
 *
 * Google-Only Authentication Entrypoint.
 * Aligns production authentication with Google OAuth SSO.
 * Password-based authentication and account creation forms have been removed.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error_description') || params.get('error')
      if (errorParam) {
        setError(decodeURIComponent(errorParam))
      }
    }
  }, [])

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        setGoogleLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate Google sign in')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans p-4">
      {/* Ambient background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[130px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-violet-900/10 blur-[130px]" />
      </div>

      <div className="max-w-md w-full p-8 border border-slate-900/80 bg-slate-900/20 backdrop-blur-2xl rounded-3xl shadow-2xl relative space-y-6">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-900/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
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
          <h2 className="text-2xl font-bold tracking-tight text-white pt-1">
            Welcome to Grovaitech
          </h2>
          <p className="text-xs text-slate-400">
            Sign in with your Google workspace account to manage your AI workforce
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-300 leading-normal flex items-start gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Single Sign-On */}
        <div className="space-y-4 pt-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            data-testid="google-signin-button"
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-3 transition-colors shadow-md border border-slate-200 cursor-pointer"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Security & Access Information */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 text-left space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Enterprise Google SSO</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Access is restricted to authorized organization accounts. First-time users will be directed to workspace assignment or onboarding.
          </p>
        </div>
      </div>
    </div>
  )
}
