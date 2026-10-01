'use client'

/**
 * Grovaitech AI Platform
 * components/website-upgrade/WebsitePreview.tsx
 *
 * Interactive Website Preview & Copy Manifest.
 * Strictly labels copy status as:
 * - VERIFIED (Green)
 * - PROPOSED (Indigo)
 * - MISSING (Amber/Red)
 */

import React, { useState } from 'react'
import type { WebsitePreviewPlan, UIUXPlan } from '@/lib/website-upgrade/types'
import {
  Eye,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Smartphone,
  Monitor,
  ShieldAlert,
  FileText,
  Lock,
  MessageSquare,
  Phone,
  ChevronRight,
  X,
  Calendar,
} from 'lucide-react'

export const APPOINTMENT_REQUEST_CONFIRMATION_TITLE = 'Appointment request received'
export const APPOINTMENT_REQUEST_CONFIRMATION_SUBTITLE =
  'A clinic receptionist can follow up to confirm the requested time.'

export const DEFAULT_PREVIEW_SERVICES = [
  'Dental Implants',
  'Braces',
  'Root Canal',
  'Cosmetic Dentistry',
]

export const DEFAULT_PREVIEW_WHATSAPP_URL = 'https://wa.me/918919457887'
export const DEFAULT_PREVIEW_PHONE = '+918919457887'

export interface AppointmentRequestData {
  patientName: string
  phoneNumber: string
  service: string
  preferredDate: string
  preferredTime: string
}

export function validateAppointmentRequest(data: Partial<AppointmentRequestData>): {
  isValid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  if (!data.patientName || !data.patientName.trim()) {
    errors.patientName = 'Patient name is required.'
  }
  if (!data.phoneNumber || !data.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required.'
  }
  if (!data.service || !data.service.trim()) {
    errors.service = 'Service is required.'
  }
  if (!data.preferredDate || !data.preferredDate.trim()) {
    errors.preferredDate = 'Preferred date is required.'
  }
  if (!data.preferredTime || !data.preferredTime.trim()) {
    errors.preferredTime = 'Preferred time is required.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function resolvePreviewCtaConfig(params: {
  whatsappUrl?: string
  contactPhone?: string
  services?: string[]
}): {
  effectiveWhatsappUrl: string
  effectivePhone: string
  availableServices: string[]
} {
  const effectiveWhatsappUrl = (() => {
    try {
      const candidate =
        params.whatsappUrl && params.whatsappUrl.trim()
          ? params.whatsappUrl.trim()
          : DEFAULT_PREVIEW_WHATSAPP_URL

      const url = new URL(candidate)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return DEFAULT_PREVIEW_WHATSAPP_URL
      }
      const phoneParam = url.searchParams.get('phone')
      url.search = ''
      url.hash = ''
      if (phoneParam) {
        url.searchParams.set('phone', phoneParam)
      }
      url.searchParams.set(
        'text',
        'Hi, I would like to ask about an appointment.'
      )
      return url.toString()
    } catch {
      return DEFAULT_PREVIEW_WHATSAPP_URL
    }
  })()
  const effectivePhone =
    params.contactPhone && params.contactPhone.trim()
      ? params.contactPhone.trim()
      : DEFAULT_PREVIEW_PHONE

  const availableServices =
    params.services && params.services.length > 0
      ? params.services
      : DEFAULT_PREVIEW_SERVICES

  return {
    effectiveWhatsappUrl,
    effectivePhone,
    availableServices,
  }
}

export interface WebsitePreviewProps {
  previewPlan: WebsitePreviewPlan
  uiPlan: UIUXPlan
  businessName: string
  industry: string
  services?: string[]
  contactPhone?: string
  whatsappUrl?: string
}

export default function WebsitePreview({
  previewPlan,
  uiPlan,
  businessName,
  industry,
  services,
  contactPhone,
  whatsappUrl,
}: WebsitePreviewProps) {
  const [activeTab, setActiveTab] = useState<'mockup' | 'manifest' | 'gated' | 'inputs'>('mockup')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')

  const { effectiveWhatsappUrl, availableServices } = resolvePreviewCtaConfig({
    whatsappUrl,
    contactPhone,
    services,
  })

  // In-Sandbox Appointment Request Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isBookingSubmitted, setIsBookingSubmitted] = useState(false)
  const [bookingForm, setBookingForm] = useState<AppointmentRequestData>({
    patientName: '',
    phoneNumber: '',
    service: availableServices[0] || 'General Consultation',
    preferredDate: '',
    preferredTime: 'Morning (9:00 AM - 12:00 PM)',
  })

  const handleOpenBooking = () => {
    setIsBookingSubmitted(false)
    setIsBookingModalOpen(true)
  }

  const handleCloseBooking = () => {
    setIsBookingModalOpen(false)
    setIsBookingSubmitted(false)
  }

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Demonstration only: do NOT write to Supabase, do NOT send real messages
    setIsBookingSubmitted(true)
  }

  return (
    <div className="space-y-8">
      {/* Sub-navigation & Device toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('mockup')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'mockup'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Interactive Mockup
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'manifest'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Copy Manifest ({previewPlan.copy_manifest.length})
          </button>
          <button
            onClick={() => setActiveTab('gated')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'gated'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Gated Claims ({previewPlan.gated_claims.length})
          </button>
          <button
            onClick={() => setActiveTab('inputs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'inputs'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Required Inputs ({previewPlan.required_customer_inputs.length})
          </button>
        </div>

        {activeTab === 'mockup' && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <Monitor className="w-4 h-4" />
              Desktop
            </button>
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              <Smartphone className="w-4 h-4" />
              Mobile
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: INTERACTIVE MOCKUP */}
      {activeTab === 'mockup' && (
        <div className="flex justify-center">
          <div
            className={`transition-all duration-300 w-full bg-white rounded-2xl border border-slate-300 shadow-lg overflow-hidden ${previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-5xl'
              }`}
          >
            {/* Browser Frame Header */}
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div className="bg-white px-3 py-1 rounded text-[11px] text-slate-600 border border-slate-200 truncate max-w-xs">
                https://{businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'preview'}.grovaitech.app
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Live Preview Sandbox
              </span>
            </div>

            {/* Mockup Canvas */}
            <div className="divide-y divide-slate-100 font-sans relative min-h-[500px]">
              {/* Mock Nav */}
              <div className="p-4 flex items-center justify-between bg-white">
                <div className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    G
                  </span>
                  {businessName}
                </div>
                {previewDevice === 'desktop' ? (
                  <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
                    <span>Services</span>
                    <span>Reviews</span>
                    <span>About</span>
                    <button
                      type="button"
                      onClick={handleOpenBooking}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      {previewPlan.cta_configuration.primary.label}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenBooking}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {previewPlan.cta_configuration.primary.label}
                  </button>
                )}
              </div>

              {/* Mock Hero */}
              <div className="p-6 sm:p-12 text-center bg-linear-to-b from-slate-50 to-white">
                <span className="inline-block px-3 py-1 bg-blue-100/60 text-blue-800 text-[11px] font-bold rounded-full mb-3">
                  Verified {industry} Specialist
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
                  {previewPlan.copy_manifest.find((c) => c.element === 'Headline')?.content}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto mb-6">
                  {previewPlan.copy_manifest.find((c) => c.element === 'Subheadline')?.content}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenBooking}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    {previewPlan.cta_configuration.primary.label}
                  </button>
                  <a
                    href={effectiveWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{previewPlan.cta_configuration.secondary.label}</span>
                  </a>
                </div>
              </div>

              {/* Mock Value Pillars */}
              <div className="p-6 sm:p-8 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 font-bold text-xs">
                    01
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mb-1">Prompt Response</h4>
                  <p className="text-[11px] text-slate-500">Autonomous inquiry qualification within 30 seconds 24/7.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-xs">
                    02
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mb-1">Transparent Guidance</h4>
                  <p className="text-[11px] text-slate-500">Upfront consultation with zero hidden fees or surprises.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 font-bold text-xs">
                    03
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mb-1">Tailored Delivery</h4>
                  <p className="text-[11px] text-slate-500">Customized solutions designed around your exact timeline.</p>
                </div>
              </div>

              {/* Mock Sticky Mobile CTA preview */}
              {previewDevice === 'mobile' && previewPlan.cta_configuration.sticky_mobile.enabled && (
                <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 sticky bottom-0">
                  <button
                    type="button"
                    onClick={handleOpenBooking}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {previewPlan.cta_configuration.primary.label}
                  </button>
                  <a
                    href={effectiveWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
                    aria-label={previewPlan.cta_configuration.secondary.label || 'Ask on WhatsApp'}
                    title={previewPlan.cta_configuration.secondary.label || 'Ask on WhatsApp'}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* In-Sandbox Appointment Request Modal */}
              {isBookingModalOpen && (
                <div
                  className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      handleCloseBooking()
                    }
                  }}
                  data-testid="appointment-modal-overlay"
                >
                  <div
                    className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-4 sm:p-6 text-left relative my-auto animate-in fade-in duration-150"
                    data-testid="appointment-modal-dialog"
                  >
                    <button
                      type="button"
                      onClick={handleCloseBooking}
                      className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {!isBookingSubmitted ? (
                      <form onSubmit={handleAppointmentSubmit} className="space-y-3.5">
                        <div>
                          <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-[11px] uppercase tracking-wide">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Appointment Request Demo</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">
                            Request an Appointment
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Share your preferred time for {businessName}.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Patient Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bookingForm.patientName}
                            onChange={(e) =>
                              setBookingForm({ ...bookingForm, patientName: e.target.value })
                            }
                            placeholder="e.g. Ramesh Kumar"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={bookingForm.phoneNumber}
                            onChange={(e) =>
                              setBookingForm({ ...bookingForm, phoneNumber: e.target.value })
                            }
                            placeholder="e.g. +91 98765 43210"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Service <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={bookingForm.service}
                            onChange={(e) =>
                              setBookingForm({ ...bookingForm, service: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                          >
                            {availableServices.map((svc) => (
                              <option key={svc} value={svc}>
                                {svc}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Preferred Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={bookingForm.preferredDate}
                              onChange={(e) =>
                                setBookingForm({ ...bookingForm, preferredDate: e.target.value })
                              }
                              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Preferred Time <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={bookingForm.preferredTime}
                              onChange={(e) =>
                                setBookingForm({ ...bookingForm, preferredTime: e.target.value })
                              }
                              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                            >
                              <option value="Morning (9:00 AM - 12:00 PM)">
                                Morning (9:00 AM - 12:00 PM)
                              </option>
                              <option value="Afternoon (12:00 PM - 4:00 PM)">
                                Afternoon (12:00 PM - 4:00 PM)
                              </option>
                              <option value="Evening (4:00 PM - 8:00 PM)">
                                Evening (4:00 PM - 8:00 PM)
                              </option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                          >
                            Request Appointment
                          </button>
                          <p className="text-[10px] text-slate-400 text-center mt-1.5">
                            Appointment request demonstration • Receptionist will confirm time
                          </p>
                        </div>
                      </form>
                    ) : (
                      <div
                        className="text-center py-4 space-y-3"
                        data-testid="appointment-confirmation"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900">
                            {APPOINTMENT_REQUEST_CONFIRMATION_TITLE}
                          </h4>
                          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                            {APPOINTMENT_REQUEST_CONFIRMATION_SUBTITLE}
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-left space-y-1 text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-500">Patient:</span>{' '}
                            {bookingForm.patientName}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Service:</span>{' '}
                            {bookingForm.service}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Requested:</span>{' '}
                            {bookingForm.preferredDate} ({bookingForm.preferredTime})
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Phone:</span>{' '}
                            {bookingForm.phoneNumber}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCloseBooking}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Close Preview
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: COPY MANIFEST TABLE */}
      {activeTab === 'manifest' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Copy & Evidence Manifest</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every copy element is classified as VERIFIED, PROPOSED, or MISSING.
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded">
                Verified: {previewPlan.copy_manifest.filter((c) => c.status === 'VERIFIED').length}
              </span>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded">
                Proposed: {previewPlan.copy_manifest.filter((c) => c.status === 'PROPOSED').length}
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded">
                Missing: {previewPlan.copy_manifest.filter((c) => c.status === 'MISSING').length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="p-3.5">Section</th>
                  <th className="p-3.5">Element</th>
                  <th className="p-3.5">Content</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewPlan.copy_manifest.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="p-3.5 font-medium text-slate-900">{item.section}</td>
                    <td className="p-3.5 text-slate-600">{item.element}</td>
                    <td className="p-3.5 max-w-md font-mono text-[11px]">{item.content}</td>
                    <td className="p-3.5">
                      {item.status === 'VERIFIED' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                          VERIFIED
                        </span>
                      )}
                      {item.status === 'PROPOSED' && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded">
                          PROPOSED
                        </span>
                      )}
                      {item.status === 'MISSING' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">
                          MISSING
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: GATED CLAIMS */}
      {activeTab === 'gated' && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Gated Claims (Requires Corroborating Evidence)
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Grovaitech Claim Guard blocks unsubstantiated superlatives, guarantees, or clinical claims from entering production without proof.
            </p>
          </div>

          {previewPlan.gated_claims.length === 0 ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold">Zero Gated Claims Detected</p>
              <p className="text-slate-600 mt-1">
                The provided business profile contains no uncorroborated superlatives or liability-generating statements.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {previewPlan.gated_claims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 uppercase tracking-wide">
                      {claim.claim_type} — Pattern: &quot;{claim.detected_pattern}&quot;
                    </span>
                    <span className="px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded font-semibold text-[10px]">
                      Gated in Preview
                    </span>
                  </div>
                  <p className="text-slate-800 font-mono bg-white p-2 rounded border border-amber-200/80">
                    &quot;{claim.text}&quot;
                  </p>
                  <div className="text-amber-800">
                    <span className="font-semibold">Gating Rule: </span>
                    {claim.gating_reason}
                  </div>
                  {claim.replacement_suggestion && (
                    <div className="text-blue-800 bg-blue-50 p-2 rounded border border-blue-200">
                      <span className="font-semibold">Recommended Replacement: </span>
                      {claim.replacement_suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: REQUIRED CUSTOMER INPUTS */}
      {activeTab === 'inputs' && (
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Checklist of Required Customer Inputs Before Launch
          </h3>
          <p className="text-xs text-slate-600">
            Assets, verified credentials, and configurations required from the business owner prior to public live rollout.
          </p>

          <ul className="space-y-2 text-xs text-slate-700 pt-2">
            {previewPlan.required_customer_inputs.map((req, i) => (
              <li
                key={i}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3"
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {i + 1}
                </span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
