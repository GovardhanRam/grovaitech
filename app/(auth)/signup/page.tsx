'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bot, Mail, Key, User, Loader2, ArrowRight } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[130px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-violet-900/10 blur-[130px]" />
      </div>

      <div className="max-w-md w-full p-8 border border-slate-900/80 bg-slate-900/20 backdrop-blur-2xl rounded-3xl shadow-2xl relative space-y-6">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-900/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-xl shadow-blue-500/20 mx-auto group hover:scale-105 transition-transform duration-200">
            <Bot className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white pt-2">
            Create Account
          </h2>
          <p className="text-xs text-slate-400">
            Sign up to deploy and test AI Employees
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSignup}>
          <div className="space-y-3.5">
            {/* Full Name field */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Full Name</label>
              <div className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl bg-slate-950 border border-slate-850 text-slate-400 focus-within:border-blue-500/50 transition-colors">
                <User className="w-4 h-4 text-slate-650 shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Govardhan R"
                  required
                  className="bg-transparent border-none text-xs text-white placeholder-slate-600 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Email Address</label>
              <div className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl bg-slate-950 border border-slate-850 text-slate-400 focus-within:border-blue-500/50 transition-colors">
                <Mail className="w-4 h-4 text-slate-650 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  required
                  className="bg-transparent border-none text-xs text-white placeholder-slate-600 focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Password</label>
              <div className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl bg-slate-950 border border-slate-850 text-slate-400 focus-within:border-blue-500/50 transition-colors">
                <Key className="w-4 h-4 text-slate-650 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 chars)"
                  required
                  minLength={6}
                  className="bg-transparent border-none text-xs text-white placeholder-slate-650 focus:outline-none w-full"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/10 bg-red-500/5 text-xs text-red-400 leading-normal flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/15"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" /> Creating Profile...
              </>
            ) : (
              <>
                Register Account <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 pt-2">
            Already have an account?{' '}
            <a href="/login" className="text-blue-500 hover:underline font-semibold">
              Sign In
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
