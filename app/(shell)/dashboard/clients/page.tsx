'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Search, 
  Plus, 
  Mail, 
  Briefcase, 
  CheckCircle2, 
  Loader2, 
  X,
  Bot
} from 'lucide-react'

interface ClientContract {
  id: string
  name: string
  email: string
  industry: string
  status: 'Active' | 'Onboarding' | 'Inactive'
  services: string[]
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientContract[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Onboarding' | 'Inactive'>('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Form fields
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientIndustry, setNewClientIndustry] = useState('Clinics')
  const [newClientStatus, setNewClientStatus] = useState<'Active' | 'Onboarding'>('Active')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select()
      .order('created_at', { ascending: false })
    if (data) {
      setClients(data)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientName || !newClientEmail || selectedServices.length === 0) return

    setIsSaving(true)
    const newClient = {
      name: newClientName,
      email: newClientEmail,
      industry: newClientIndustry,
      status: newClientStatus,
      services: selectedServices
    }

    const { error } = await supabase.from('clients').insert(newClient)
    setIsSaving(false)
    
    if (!error) {
      // Clear form & close
      setNewClientName('')
      setNewClientEmail('')
      setNewClientIndustry('Clinics')
      setSelectedServices([])
      setIsModalOpen(false)
      loadClients()
    }
  }

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(prev => prev.filter(s => s !== service))
    } else {
      setSelectedServices(prev => [...prev, service])
    }
  }

  const availableServices = [
    'AI Receptionist',
    'AI Lead Qualifier',
    'AI Customer Support',
    'Document RAG',
    'Custom AI Agents'
  ]

  const industriesList = [
    'Clinics',
    'Law firms',
    'Salons',
    'Restaurants',
    'Real estate agencies',
    'Educational institutions',
    'SMEs'
  ]

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.industry.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'All' || client.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Client Management</h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Monitor deployments and service statuses for automated business accounts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/15 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Client Account
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 w-full md:w-80 rounded-xl bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] focus-within:border-[#3B82F6]/50 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, industry, email..." 
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        {/* Status filters */}
        <div className="flex p-1 bg-[#1E293B] border border-[#1E293B] rounded-xl w-full md:w-auto">
          {(['All', 'Active', 'Onboarding', 'Inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusFilter === filter
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#94A3B8] text-xs">
            No matching client accounts found.
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl flex flex-col justify-between group hover:border-[#3B82F6]/30 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-bl from-slate-900/20 to-transparent blur-xl pointer-events-none" />
              
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-[#3B82F6] transition-colors">{client.name}</h3>
                    <p className="text-[10px] text-[#94A3B8] font-semibold">{client.industry}</p>
                  </div>
                  
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    client.status === 'Active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : client.status === 'Onboarding'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-[#1E293B] text-[#94A3B8] border border-[#1E293B]/50'
                  }`}>
                    {client.status}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-[#94A3B8]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Contract: {new Date(client.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Services list */}
                <div className="space-y-1.5 border-t border-[#1E293B] pt-3">
                  <span className="text-[9px] uppercase font-bold text-[#94A3B8] tracking-wider">Active Deployments</span>
                  <div className="flex flex-wrap gap-1">
                    {client.services.map((srv, idx) => (
                      <span key={idx} className="text-[9px] px-2 py-0.5 rounded bg-[#0F172A] text-[#94A3B8] border border-[#1E293B] flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#3B82F6] shrink-0" />
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#1E293B] border border-[#1E293B] rounded-2xl shadow-2xl p-6 relative animate-scale-up text-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#94A3B8] hover:text-white bg-[#0F172A]/60"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Add Client Contract</h2>
            
            <form onSubmit={handleAddClient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold">Business Name</label>
                <input 
                  type="text" 
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Tirupati Dental Care"
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold">Contact Email</label>
                <input 
                  type="email" 
                  required
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Industry</label>
                  <select 
                    value={newClientIndustry}
                    onChange={(e) => setNewClientIndustry(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none"
                  >
                    {industriesList.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Setup Status</label>
                  <select 
                    value={newClientStatus}
                    onChange={(e) => setNewClientStatus(e.target.value as any)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Onboarding">Onboarding</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 border-t border-[#0F172A] pt-3">
                <label className="text-[#94A3B8] font-semibold block">Select Services to Deploy</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableServices.map((service) => {
                    const isChecked = selectedServices.includes(service)
                    return (
                      <button
                        type="button"
                        key={service}
                        onClick={() => toggleService(service)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          isChecked 
                            ? 'bg-[#3B82F6]/10 border-[#3B82F6]/50 text-[#3B82F6]' 
                            : 'bg-[#0F172A] border-[#1E293B] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <span>{service}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || !newClientName || !newClientEmail || selectedServices.length === 0}
                className="w-full mt-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/15"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Inserting Account...
                  </>
                ) : (
                  <>
                    Save Contract & Deploy Agents
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
