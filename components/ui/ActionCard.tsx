'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/ActionCard.tsx
 *
 * Clickable card for launching primary actions, workflows, or conversational features.
 */

import React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export interface ActionCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  href?: string
  onClick?: () => void
  variant?: 'white' | 'subtle' | 'gradient'
  className?: string
}

export function ActionCard({
  title,
  description,
  icon,
  badge,
  href,
  onClick,
  variant = 'white',
  className = '',
}: ActionCardProps) {
  const variantStyles = {
    white:
      'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-md text-[#00142E]',
    subtle:
      'bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border-blue-200/80 hover:border-blue-400 hover:shadow-md text-[#00142E]',
    gradient:
      'bg-gradient-to-r from-[#0066FF] to-[#4F46E5] border-transparent text-white shadow-sm shadow-blue-500/20 hover:shadow-md',
  }

  const isLight = variant !== 'gradient'

  const content = (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 active:scale-[0.99] flex items-center justify-between gap-4 min-h-[64px] cursor-pointer ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-blue-50 text-[#0066FF] border border-blue-100'
                : 'bg-white/15 text-white border border-white/20'
            }`}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold truncate leading-tight">
              {title}
            </h4>
            {badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isLight
                    ? 'bg-blue-100 text-[#0066FF]'
                    : 'bg-white/20 text-white'
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p
              className={`text-xs mt-1 font-normal line-clamp-1 ${
                isLight ? 'text-slate-500' : 'text-blue-100'
              }`}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
          isLight
            ? 'bg-slate-100 text-slate-600'
            : 'bg-white/20 text-white'
        }`}
      >
        <ArrowUpRight className="w-4 h-4" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-2xl group"
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
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-2xl group"
      >
        {content}
      </button>
    )
  }

  return content
}

export default ActionCard
