'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/ListCard.tsx
 *
 * Compact row card for feeds, CRM leads, conversations, and task lists.
 * Guarantees 44px+ touch ergonomics on mobile.
 */

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface ListCardProps {
  title: string
  subtitle?: string
  meta?: string
  avatar?: React.ReactNode
  badge?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
  showChevron?: boolean
  className?: string
}

export function ListCard({
  title,
  subtitle,
  meta,
  avatar,
  badge,
  trailing,
  href,
  onClick,
  showChevron = true,
  className = '',
}: ListCardProps) {
  const isInteractive = Boolean(href || onClick)

  const content = (
    <div
      className={`p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 min-h-[52px] transition-all duration-150 ${
        isInteractive
          ? 'hover:border-blue-300 hover:bg-slate-50/50 active:bg-slate-100/80 cursor-pointer'
          : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {avatar && <div className="shrink-0">{avatar}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#00142E] truncate leading-tight">
              {title}
            </h4>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>

          {(subtitle || meta) && (
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-normal truncate">
              {subtitle && <span className="truncate">{subtitle}</span>}
              {subtitle && meta && <span className="text-slate-300">•</span>}
              {meta && <span className="text-slate-400 shrink-0">{meta}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {trailing}
        {isInteractive && showChevron && (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-xl sm:rounded-2xl"
      >
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-xl sm:rounded-2xl"
      >
        {content}
      </button>
    )
  }

  return content
}

export default ListCard
