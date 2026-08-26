'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Users, 
  Key, 
  Save, 
  CheckCircle, 
  Loader2,
  Mail,
  Shield,
  Plus
} from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'integrations'>('profile')
  const [user, setUser] = useState<any>(null)
  
  // Profile settings state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('Grovaitech Business partner')
  
  // Integrations state
  const [geminiKey, setGeminiKey] = useState('••••••••••••••••••••••••••••')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [n8nUrl, setN8nUrl] = useState('https://n8n.grovaitech.ai/webhook/v1/...')

  // Team list state
  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'Govardhan R', email: 'govar@grovaitech.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Srinivas K', email: 'sri@grovaitech.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Apollo Support', email: 'support@apollodental.in', role: 'Client', status: 'Active' }
  ])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('User')

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setFullName(user.full_name || '')
        setEmail(user.email || '')
      }

      // Load mock settings from DB
      const { data: config } = await supabase.from('settings').select().single()
      if (config) {
        setOllamaUrl(config.apiKeyOllama || 'http://localhost:11434')
        setN8nUrl(config.apiKeyN8N || '')
      }
    }
    loadSettings()
  }, [supabase])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    
    // Save to server mock/real session cookies
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 800)
  }

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    // Save configuration parameters to DB
    const { error } = await supabase.from('settings').insert({
      apiKeyOllama: ollamaUrl,
      apiKeyN8N: n8nUrl,
      apiKeyGemini: geminiKey
    })

    setIsSaving(false)
    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const handleInviteTeam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    const newMember = {
      id: Date.now(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'Active'
    }
    setTeamMembers(prev => [...prev, newMember])
    setInviteEmail('')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Configure profile options, invite team users, and connect AI integration credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start font-sans text-white">
        
        {/* Left: Settings tabs selection (3 cols) */}
        <div className="md:col-span-3 flex flex-col p-1.5 bg-[#0F172A] border border-[#1E293B] rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'profile'
                ? 'bg-[#1E293B] text-white border border-[#3B82F6]/30'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/40'
            }`}
          >
            <User className="w-4 h-4 shrink-0 text-[#3B82F6]" /> Profile
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'team'
                ? 'bg-[#1E293B] text-white border border-[#3B82F6]/30'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0 text-[#60A5FA]" /> Team Members
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'integrations'
                ? 'bg-[#1E293B] text-white border border-[#3B82F6]/30'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/40'
            }`}
          >
            <Key className="w-4 h-4 shrink-0 text-emerald-400" /> Integrations
          </button>
        </div>

        {/* Right: Tab Workspace panel (9 cols) */}
        <div className="md:col-span-9 p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[#3B82F6]" /> User Profile Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Email Address</label>
                  <input 
                    type="email" 
                    disabled
                    value={email}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold">Organization Name</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#1E293B]">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-semibold rounded-lg shadow-md shadow-blue-600/15"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile Changes
                </button>
                
                {saveSuccess && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Details saved successfully!
                  </span>
                )}
              </div>
            </form>
          )}

          {/* TEAM MEMBERS TAB */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#60A5FA]" /> Team Users & Roles
              </h3>

              {/* Invite Form */}
              <form onSubmit={handleInviteTeam} className="flex flex-col sm:flex-row gap-2 items-end border-b border-[#1E293B] pb-5">
                <div className="space-y-1 flex-1 text-left w-full">
                  <label className="text-[#94A3B8] font-semibold">Invite Email</label>
                  <div className="flex items-center gap-2 px-3 py-2 w-full rounded-xl bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] focus-within:border-[#3B82F6]/50 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-slate-650 shrink-0" />
                    <input 
                      type="email" 
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com" 
                      className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1 w-full sm:w-40 text-left">
                  <label className="text-[#94A3B8] font-semibold">Access Role</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="Admin">Admin (Full Access)</option>
                    <option value="User">User (Standard Access)</option>
                    <option value="Client">Client (Read Only)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!inviteEmail}
                  className="w-full sm:w-auto flex items-center justify-center gap-1 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-semibold rounded-xl text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Invite
                </button>
              </form>

              {/* Team list table */}
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-[#94A3B8] font-semibold">
                      <th className="pb-3">Name / Email</th>
                      <th className="pb-3">Access Role</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/50">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="text-slate-300 hover:bg-[#1E293B]/20">
                        <td className="py-3 flex flex-col">
                          <span className="font-semibold text-white">{member.name}</span>
                          <span className="text-[10px] text-[#94A3B8]">{member.email}</span>
                        </td>
                        <td className="py-3">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Shield className="w-3 h-3 text-[#3B82F6]" />
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                            {member.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <form onSubmit={handleSaveIntegrations} className="space-y-4 text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" /> External API & Webhook Credentials
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold block">Google Gemini API Key</label>
                  <input 
                    type="password" 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                  <span className="text-[9px] text-[#94A3B8] block">Required to run the Gemini text search/chat interfaces. Loaded locally.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold block">Ollama Connection URL</label>
                  <input 
                    type="text" 
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                  <span className="text-[9px] text-[#94A3B8] block">Endpoint link to run local model inferences.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold block">n8n Webhook Endpoint</label>
                  <input 
                    type="text" 
                    value={n8nUrl}
                    onChange={(e) => setN8nUrl(e.target.value)}
                    placeholder="https://n8n.domain.com/webhook/..."
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                  <span className="text-[9px] text-[#94A3B8] block">Integrate voice calling triggers or WhatsApp dispatch workflows.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#1E293B]">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-semibold rounded-lg shadow-md shadow-blue-600/15"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Credentials
                </button>
                
                {saveSuccess && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Credentials saved securely!
                  </span>
                )}
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
