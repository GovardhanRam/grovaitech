'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/EmptyState.tsx
 *
 * Friendly, action-oriented empty state for feeds, tables, and search results.
 */

import React from 'react'
import { FolderOpen } from 'lucide-react'
import { PrimaryButton } from './PrimaryButton'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actionLabel?: string
  onActionClick?: () => void
  actionHref?: string
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onActionClick,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-[#0066FF] mb-4">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>

      <h3 className="text-base font-bold text-[#00142E] leading-snug">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && (
        <PrimaryButton
          size="sm"
          href={actionHref}
          onClick={onActionClick}
        >
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  )
}

export default EmptyState
