'use client'
import { useState, useEffect } from 'react'
import { createBooking, getBookings, updateBookingStatus } from '@/app/actions/bookings'

interface Booking {
  id: string
  patient_name: string
  patient_phone: string
  patient_email: string | null
  appointment_date: string
  appointment_time: string
  doctor_name: string | null
  reason: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
}

export default function ClinicBooking() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const loadBookings = async () => {
    setLoading(true)
    const result = await getBookings()
    if (result.bookings) {
      setBookings(result.bookings)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const result = await createBooking(formData)
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Booking created successfully!' })
      setShowForm(false)
      loadBookings()
    }
  }

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    const result = await updateBookingStatus(bookingId, status)
    if (result.success) {
      loadBookings()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#1E293B] rounded-xl border border-[#1E293B]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Clinic Reception</h2>
          <p className="text-sm text-[#94A3B8]">Manage your AI receptionist and bookings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition"
        >
          {showForm ? 'Cancel' : 'New Booking'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-[#0F172A] rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="patientName"
              placeholder="Patient Name *"
              required
              className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
            <input
              type="tel"
              name="patientPhone"
              placeholder="Phone Number *"
              required
              className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
            <input
              type="email"
              name="patientEmail"
              placeholder="Email (optional)"
              className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
            <input
              type="date"
              name="appointmentDate"
              required
              className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
            <input
              type="time"
              name="appointmentTime"
              required
              className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
            <input
              type="text"
              name="doctorName"
              placeholder="Doctor Name (optional)"
              className="px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>
          <textarea
            name="reason"
            placeholder="Reason for visit (optional)"
            rows={2}
            className="w-full px-4 py-2 rounded-lg bg-[#1E293B] border border-[#1E293B] text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
          <button
            type="submit"
            className="w-full py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-lg transition"
          >
            Create Booking
          </button>
        </form>
      )}

      <div className="mt-4">
        <button
          onClick={loadBookings}
          className="text-sm text-[#3B82F6] hover:underline mb-4"
        >
          {loading ? 'Loading...' : 'Refresh Bookings'}
        </button>

        <div className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-[#94A3B8] text-center py-8">No bookings yet. Create your first booking above.</p>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="bg-[#0F172A] p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{booking.patient_name}</p>
                  <p className="text-sm text-[#94A3B8]">
                    {booking.appointment_date} at {booking.appointment_time}
                    {booking.doctor_name && ` • Dr. ${booking.doctor_name}`}
                  </p>
                  <p className="text-sm text-[#94A3B8]">{booking.patient_phone}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-900/50 text-green-400' :
                    booking.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                    booking.status === 'completed' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {booking.status}
                  </span>
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                      className="text-xs text-[#3B82F6] hover:underline"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
