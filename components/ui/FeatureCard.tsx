'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/FeatureCard.tsx
 *
 * Feature showcase card for AI capabilities, workflow tools, and product highlights.
 */

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { StatusBadge, type StatusVariant } from './StatusBadge'

export interface FeatureCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  status?: StatusVariant
  category?: string
  href?: string
  actionText?: string
  className?: string
}

export function FeatureCard({
  title,
  description,
  icon,
  status,
  category,
  href,
  actionText = 'Explore',
  className = '',
}: FeatureCardProps) {
  const cardContent = (
    <div
      className={`group p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-card hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 group-hover:scale-105 transition-transform">
                {icon}
              </div>
            )}
            {category && (
              <span className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider">
                {category}
              </span>
            )}
          </div>
          {status && <StatusBadge status={status} size="sm" />}
        </div>

        <h3 className="text-base font-bold text-[#00142E] leading-snug group-hover:text-[#0066FF] transition-colors">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5 leading-relaxed">
          {description}
        </p>
      </div>

      {href && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0066FF]">
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-2xl">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

export default FeatureCard
