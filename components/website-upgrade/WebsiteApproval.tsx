'use client'

/**
 * Grovaitech AI Platform
 * components/website-upgrade/WebsiteApproval.tsx
 *
 * Human Approval & Safe Deployment Engine Handoff Gate.
 * Strict standard: Deployment is a deliberate human-approved action.
 * Verifies CRM readiness, unverified claims gating, and delegates to
 * existing canonical `provisionClientDeploymentFromLead()`.
 */

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import type { DeploymentHandoffPayload } from '@/lib/website-upgrade/types'
import { approveAndHandoffToDeploymentAction } from '@/app/actions/website-upgrade'
import type { ProvisionClientResult } from '@/lib/deployment'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Workflow,
  ArrowRight,
  Loader2,
  Lock,
  ExternalLink,
  UserCheck,
} from 'lucide-react'

interface WebsiteApprovalProps {
  handoff: DeploymentHandoffPayload
  onDeploymentSuccess?: (result: ProvisionClientResult) => void
}

export default function WebsiteApproval({ handoff, onDeploymentSuccess }: WebsiteApprovalProps) {
  const [approverName, setApproverName] = useState('')
  const [confirmedGating, setConfirmedGating] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deploymentResult, setDeploymentResult] = useState<ProvisionClientResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Local prospect qualification fields if missing
  const [contactName, setContactName] = useState(handoff.prospect.contact_name || '')
  const [phone, setPhone] = useState(handoff.prospect.phone || '')
  const [location, setLocation] = useState(handoff.prospect.location || '')
  const [budget, setBudget] = useState(handoff.prospect.budget || 'Standard Setup')
  const [timeline, setTimeline] = useState(handoff.prospect.timeline || 'Immediate')

  const handleApprove = () => {
    if (!approverName.trim()) {
      setErrorMessage('Please provide your name or credential to authorize this deployment.')
      return
    }

    if (!confirmedGating) {
      setErrorMessage('Please confirm that unverified claims have been reviewed.')
      return
    }

    // Merge any updated CRM fields into prospect
    const updatedProspect = {
      ...handoff.prospect,
      contact_name: contactName.trim(),
      phone: phone.trim(),
      location: location.trim(),
      budget: budget.trim(),
      timeline: timeline.trim(),
    }

    const updatedHandoff: DeploymentHandoffPayload = {
      ...handoff,
      prospect: updatedProspect,
      approval_status: 'APPROVED',
      approved_by: approverName.trim(),
      approved_at: new Date().toISOString(),
    }

    setErrorMessage(null)

    startTransition(async () => {
      const res = await approveAndHandoffToDeploymentAction(
        updatedHandoff,
        approverName.trim(),
        'APPROVED'
      )

      if (res.success && res.deploymentResult) {
        setDeploymentResult(res.deploymentResult)
        if (onDeploymentSuccess) {
          onDeploymentSuccess(res.deploymentResult)
        }
      } else {
        setErrorMessage(res.error || 'Failed to complete deployment handoff.')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Human Review & Deployment Handoff
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Final verification before provisioning client workspace and binding canonical AI Employees.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full border border-amber-200">
            Human Approval Gate
          </span>
        </div>

        {/* Handoff Specs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Client Account</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{handoff.prospect.company_name}</p>
            <p className="text-slate-500">{handoff.prospect.industry}</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Assigned Canonical Agent</span>
            <p className="text-sm font-bold text-indigo-700 mt-0.5">{handoff.primary_employee_slug}</p>
            <p className="text-slate-500 font-mono text-[10px]">Workflow: {handoff.assigned_workflow_id}</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Audit Verification</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {handoff.website_metadata.audit_findings_count} Findings
            </p>
            <p className="text-slate-500">{handoff.website_metadata.revenue_leaks_count} Leaks Fixed</p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Claims Guard Status</span>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">
              {handoff.website_metadata.verified_claims_count} Verified Facts
            </p>
            <p className="text-amber-700 font-medium">
              {handoff.website_metadata.gated_claims_count} Unverified Gated
            </p>
          </div>
        </div>

        {/* CRM Readiness Qualification Check */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              CRM Qualification Data (Required for Provisioning)
            </h4>
            <span className="text-xs text-slate-500">
              Strict 5-field Grovaitech LeadData specification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contact Phone *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mumbai, Maharashtra"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Budget Tier *
              </label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Standard / Custom"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Timeline *
              </label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="Immediate / 30 Days"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Approval Form */}
        {!deploymentResult && (
          <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
            <h4 className="font-bold text-sm text-slate-900">Sign-Off & Deployment Authorization</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Name / Employee ID *
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="e.g. Govardhan Ram (Director of Operations)"
                  className="w-full max-w-md px-3.5 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-blue-600"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmedGating}
                  onChange={(e) => setConfirmedGating(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I confirm that all uncorroborated marketing claims, superlatives, and medical/financial
                  guarantees remain gated or replaced, and authorize this workspace to be provisioned in the
                  Grovaitech Deployment Engine.
                </span>
              </label>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleApprove}
                  disabled={isPending || !approverName.trim() || !confirmedGating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Provisioning in Deployment Engine...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Hand Off to Deployment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {deploymentResult && (
          <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <h4 className="text-base font-bold text-emerald-950">
                  Deployment Successfully Handed Off & Provisioned
                </h4>
                <p className="text-xs text-emerald-800">
                  Client workspace and canonical AI Employee bindings are now active in the deployment engine.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Deployment ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {deploymentResult.deployment?.id || 'Active'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Client ID</span>
                <span className="font-mono font-bold text-slate-800">
                  {deploymentResult.deployment?.client_id || 'Active'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Status</span>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {deploymentResult.deployment?.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/deploy"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                Go to Deployment Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
