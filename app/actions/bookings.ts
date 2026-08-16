'use server'
import { createServerClient } from '@/lib/supabase/server'

export async function createBooking(formData: FormData) {
  const supabase = await createServerClient()
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Please log in first' }
  }

  // Extract form data
  const patientName = formData.get('patientName')?.toString()
  const patientPhone = formData.get('patientPhone')?.toString()
  const patientEmail = formData.get('patientEmail')?.toString()
  const appointmentDate = formData.get('appointmentDate')?.toString()
  const appointmentTime = formData.get('appointmentTime')?.toString()
  const doctorName = formData.get('doctorName')?.toString()
  const reason = formData.get('reason')?.toString()

  // Validation
  if (!patientName || !patientPhone || !appointmentDate || !appointmentTime) {
    return { error: 'Please fill in all required fields' }
  }

  // Insert into database
  const { data, error } = await supabase
    .from('clinic_bookings')
    .insert({
      clinic_id: user.id,
      patient_name: patientName,
      patient_phone: patientPhone,
      patient_email: patientEmail,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      doctor_name: doctorName,
      reason: reason,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Booking error:', error)
    return { error: 'Failed to create booking' }
  }

  return { success: true, booking: data }
}

export async function getBookings() {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Please log in first' }
  }

  const { data, error } = await supabase
    .from('clinic_bookings')
    .select('*')
    .eq('clinic_id', user.id)
    .order('appointment_date', { ascending: true })

  if (error) {
    console.error('Fetch bookings error:', error)
    return { error: 'Failed to fetch bookings' }
  }

  return { bookings: data }
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Please log in first' }
  }

  const { data, error } = await supabase
    .from('clinic_bookings')
    .update({ status })
    .eq('id', bookingId)
    .eq('clinic_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Update booking error:', error)
    return { error: 'Failed to update booking' }
  }

  return { success: true, booking: data }
}
