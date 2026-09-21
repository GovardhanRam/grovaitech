'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/StatusBadge.tsx
 *
 * Consistent status badge pill with high-contrast semantic styling
 * and optional live pulse indicator.
 */

import React from 'react'

export type StatusVariant =
  | 'active'
  | 'live'
  | 'beta'
  | 'demo'
  | 'in_development'
  | 'pending'
  | 'warning'
  | 'error'
  | 'failed'
  | 'neutral'
  | 'success'

export interface StatusBadgeProps {
  status?: StatusVariant | string
  label?: string
  dot?: boolean
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
  children?: React.ReactNode
}

const variantStyles: Record<
  string,
  { bg: string; text: string; border: string; dotColor: string }
> = {
  active: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/90',
    dotColor: 'bg-[#00A859]',
  },
  live: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/90',
    dotColor: 'bg-[#00A859]',
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/90',
    dotColor: 'bg-[#00A859]',
  },
  beta: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200/90',
    dotColor: 'bg-[#0066FF]',
  },
  demo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200/90',
    dotColor: 'bg-[#4F46E5]',
  },
  in_development: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/90',
    dotColor: 'bg-[#FFB703]',
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/90',
    dotColor: 'bg-[#FFB703]',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/90',
    dotColor: 'bg-[#FFB703]',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200/90',
    dotColor: 'bg-[#E53935]',
  },
  failed: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200/90',
    dotColor: 'bg-[#E53935]',
  },
  neutral: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dotColor: 'bg-slate-400',
  },
}

export function StatusBadge({
  status = 'neutral',
  label,
  dot = true,
  pulse = false,
  size = 'sm',
  className = '',
  children,
}: StatusBadgeProps) {
  const meta = variantStyles[status] || variantStyles.neutral
  const displayText = children || label || status

  const sizeCls =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px] font-semibold gap-1.5'
      : 'px-3 py-1 text-xs font-semibold gap-2'

  return (
    <span
      className={`inline-flex items-center rounded-full border shrink-0 leading-none select-none ${meta.bg} ${meta.text} ${meta.border} ${sizeCls} ${className}`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.dotColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${meta.dotColor}`} />
        </span>
      )}
      <span className="capitalize">{displayText}</span>
    </span>
  )
}

export default StatusBadge
