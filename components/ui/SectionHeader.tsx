'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/SectionHeader.tsx
 *
 * Section header with deep navy primary title, optional counter badge,
 * descriptive subtext, and right-aligned CTA or action button.
 */

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  badge?: string | number | React.ReactNode
  actionLabel?: string
  actionHref?: string
  onActionClick?: () => void
  actionIcon?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  actionLabel,
  actionHref,
  onActionClick,
  actionIcon,
  className = '',
}: SectionHeaderProps) {
  const hasAction = Boolean(actionLabel || actionHref || onActionClick)

  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg sm:text-xl font-bold text-[#00142E] tracking-tight leading-snug">
            {title}
          </h2>
          {badge !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0066FF] border border-blue-100">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>

      {hasAction && (
        <div className="shrink-0 pt-0.5">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0066FF] hover:text-[#0052CC] min-h-[44px] px-1 py-1 -mr-1 transition-colors group"
            >
              <span>{actionLabel}</span>
              {actionIcon || (
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#0066FF] hover:text-[#0052CC] min-h-[44px] px-1 py-1 -mr-1 transition-colors group cursor-pointer"
            >
              <span>{actionLabel}</span>
              {actionIcon || (
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SectionHeader
