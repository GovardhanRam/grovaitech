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

  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    appointmentDate: '',
    appointmentTime: '',
    doctorName: '',
    reason: ''
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataObj = new FormData()
    formDataObj.append('patientName', formData.patientName)
    formDataObj.append('patientPhone', formData.patientPhone)
    formDataObj.append('patientEmail', formData.patientEmail)
    formDataObj.append('appointmentDate', formData.appointmentDate)
    formDataObj.append('appointmentTime', formData.appointmentTime)
    formDataObj.append('doctorName', formData.doctorName)
    formDataObj.append('reason', formData.reason)

    const result = await createBooking(formDataObj)
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Booking created successfully!' })
      setShowForm(false)
      setFormData({
        patientName: '',
        patientPhone: '',
        patientEmail: '',
        appointmentDate: '',
        appointmentTime: '',
        doctorName: '',
        reason: ''
      })
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
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinic Reception</h2>
          <p className="text-sm text-gray-500">Manage your AI receptionist and bookings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          {showForm ? 'Cancel' : 'New Booking'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Patient Name *"
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone Number *"
              value={formData.patientPhone}
              onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={formData.patientEmail}
              onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={formData.appointmentDate}
              onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.appointmentTime}
              onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
              required
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Time</option>
              <option value="09:00">09:00 AM</option>
              <option value="09:30">09:30 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="10:30">10:30 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="11:30">11:30 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="12:30">12:30 PM</option>
              <option value="13:00">01:00 PM</option>
              <option value="13:30">01:30 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="14:30">02:30 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="15:30">03:30 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="16:30">04:30 PM</option>
              <option value="17:00">05:00 PM</option>
            </select>
            <input
              type="text"
              placeholder="Doctor Name (optional)"
              value={formData.doctorName}
              onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            placeholder="Reason for visit (optional)"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Create Booking
          </button>
        </form>
      )}

      <div className="mt-4">
        <button
          onClick={loadBookings}
          className="text-sm text-blue-600 hover:underline mb-4"
        >
          {loading ? 'Loading...' : 'Refresh Bookings'}
        </button>

        <div className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No bookings yet. Create your first booking above.</p>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-gray-900 font-medium">{booking.patient_name}</p>
                  <p className="text-sm text-gray-500">
                    {booking.appointment_date} at {booking.appointment_time}
                    {booking.doctor_name && ` • Dr. ${booking.doctor_name}`}
                  </p>
                  <p className="text-sm text-gray-500">{booking.patient_phone}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {booking.status}
                  </span>
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Confirm
                    </button>
                  )}
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'completed')}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Complete
                    </button>
                  )}
                  {booking.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancel
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
