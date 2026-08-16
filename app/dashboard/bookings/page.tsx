'use client'

import { useState, useEffect } from 'react'
import { 
  createBooking, 
  getBookings, 
  updateBookingStatus 
} from '@/app/actions/bookings'
import { 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  X, 
  AlertCircle, 
  Loader2
} from 'lucide-react'

interface Booking {
  id: string
  clinic_id: string
  patient_name: string
  patient_phone: string
  patient_email?: string
  appointment_date: string
  appointment_time: string
  doctor_name?: string
  reason?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_at: string
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [doctorName, setDoctorName] = useState('Dr. Verma')
  const [reason, setReason] = useState('')

  const loadData = async () => {
    setLoading(true)
    const result = await getBookings()
    if ('error' in result) {
      console.error(result.error)
    } else if (result.bookings) {
      setBookings(result.bookings as Booking[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setActionLoading(id)
    const result = await updateBookingStatus(id, newStatus)
    setActionLoading(null)
    if ('error' in result) {
      alert(result.error)
    } else {
      loadData()
    }
  }

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!patientName || !patientPhone || !appointmentDate || !appointmentTime) {
      setFormError('Please fill in all required fields.')
      return
    }

    setIsSaving(true)
    const formData = new FormData()
    formData.append('patientName', patientName)
    formData.append('patientPhone', patientPhone)
    formData.append('patientEmail', patientEmail)
    formData.append('appointmentDate', appointmentDate)
    formData.append('appointmentTime', appointmentTime)
    formData.append('doctorName', doctorName)
    formData.append('reason', reason)

    const result = await createBooking(formData)
    setIsSaving(false)

    if ('error' in result) {
      setFormError(result.error || 'Failed to create booking.')
    } else {
      // Reset form & close modal
      setPatientName('')
      setPatientPhone('')
      setPatientEmail('')
      setAppointmentDate('')
      setAppointmentTime('')
      setDoctorName('Dr. Verma')
      setReason('')
      setIsModalOpen(false)
      loadData()
    }
  }

  // Calculate statistics
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }

  // Filtered bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.patient_phone.includes(searchTerm) ||
      (b.patient_email && b.patient_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.doctor_name && b.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#3B82F6]" /> Appointment Bookings
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Manage real-time bookings handled by the AI Receptionist employee and offline schedulers.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/15 transition-all self-start sm:self-auto group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" /> New Appointment
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Total Bookings', value: stats.total, color: 'text-blue-400', bg: 'bg-[#3B82F6]/10' },
          { name: 'Confirmed Slots', value: stats.confirmed, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { name: 'Pending Approvals', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { name: 'Completed Visits', value: stats.completed, color: 'text-slate-400', bg: 'bg-slate-500/10' }
        ].map((card, i) => (
          <div key={i} className="p-4 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gradient-to-tr from-transparent to-slate-800/10 blur-md pointer-events-none" />
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{card.name}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${card.bg} ${card.color} uppercase`}>Live</span>
            </div>
          </div>
        ))}
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
            placeholder="Search patient, phone, doctor..." 
            className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        {/* Status filters */}
        <div className="flex p-1 bg-[#1E293B]/60 border border-[#1E293B] rounded-xl w-full md:w-auto overflow-x-auto shrink-0">
          {['All', 'pending', 'confirmed', 'completed', 'cancelled'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
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

      {/* Bookings Data Table */}
      <div className="border border-[#1E293B] bg-[#1E293B]/20 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1E293B] bg-[#1E293B]/40 text-[#94A3B8] font-semibold uppercase tracking-wider">
                <th className="p-4">Patient Info</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Physician</th>
                <th className="p-4">Reason / Notes</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <Loader2 className="w-6 h-6 text-[#3B82F6] animate-spin" />
                      <span className="text-slate-400">Loading bookings from system...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    No matching appointment slots found.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-[#1E293B]/10 transition-colors">
                    {/* Patient Info */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{booking.patient_name}</div>
                      <div className="text-[10px] text-[#94A3B8] space-y-0.5 mt-0.5">
                        <div className="flex items-center gap-1"><Phone className="w-2.5 h-2.5 text-slate-600" /> {booking.patient_phone}</div>
                        {booking.patient_email && (
                          <div className="flex items-center gap-1"><Mail className="w-2.5 h-2.5 text-slate-600" /> {booking.patient_email}</div>
                        )}
                      </div>
                    </td>

                    {/* Schedule */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>{new Date(booking.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] mt-1">
                        <Clock className="w-3 h-3 text-[#3B82F6]" />
                        <span>{booking.appointment_time}</span>
                      </div>
                    </td>

                    {/* Physician */}
                    <td className="p-4 text-slate-200 font-medium">
                      {booking.doctor_name || 'Unassigned'}
                    </td>

                    {/* Reason / Notes */}
                    <td className="p-4 max-w-xs">
                      <p className="text-slate-300 truncate" title={booking.reason}>
                        {booking.reason || <span className="text-slate-600 italic">No notes provided</span>}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        booking.status === 'confirmed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : booking.status === 'pending'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : booking.status === 'completed'
                          ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {booking.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      {actionLoading === booking.id ? (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin ml-auto" />
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                                className="p-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold transition-colors"
                                title="Confirm Slot"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                className="p-1 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold transition-colors"
                                title="Cancel Booking"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(booking.id, 'completed')}
                                className="p-1 px-2 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 text-[10px] font-bold transition-colors"
                                title="Mark Visited"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                className="p-1 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold transition-colors"
                                title="Cancel Booking"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {['completed', 'cancelled'].includes(booking.status) && (
                            <span className="text-[10px] text-slate-500 italic">No actions</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#1E293B] border border-[#1E293B] rounded-2xl shadow-2xl p-6 relative animate-scale-up text-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#94A3B8] hover:text-white bg-[#0F172A]/60"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" /> Schedule Appointment
            </h2>
            
            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
              </div>
            )}

            <form onSubmit={handleAddBooking} className="space-y-4 text-xs">
              {/* Patient Name */}
              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold">Patient Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Patient Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Contact Phone *</label>
                  <input 
                    type="tel" 
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Email Address</label>
                  <input 
                    type="email" 
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Date *</label>
                  <input 
                    type="date" 
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#94A3B8] font-semibold">Time Slot *</label>
                  <input 
                    type="text" 
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    placeholder="e.g. 10:00 AM, 02:30 PM"
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
              </div>

              {/* Doctor Name */}
              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold">Assigned Practitioner</label>
                <input 
                  type="text" 
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Verma"
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1">
                <label className="text-[#94A3B8] font-semibold">Reason for Visit</label>
                <textarea 
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe treatment or symptoms..."
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#3B82F6] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/15"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                  </>
                ) : (
                  <>
                    Confirm Booking
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
