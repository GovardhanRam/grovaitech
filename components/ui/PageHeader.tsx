'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/PageHeader.tsx
 *
 * Page title header with back navigation button, badges, breadcrumbs,
 * and contextual call-to-actions.
 */

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  onBack?: () => void
  showBack?: boolean
  badge?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  onBack,
  showBack = false,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  const shouldRenderBack = showBack || Boolean(backHref) || Boolean(onBack)

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {shouldRenderBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center rounded-xl text-slate-600 hover:text-[#00142E] hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#00142E] tracking-tight leading-tight">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  )
}

export default PageHeader
