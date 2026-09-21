'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/StatCard.tsx
 *
 * Metric display card featuring rounded-2xl geometry, soft elevation shadow,
 * icon badge container, bold numeric readout, and trend indicator.
 */

import React from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'

export interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode
  trend?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  iconColor?: 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'navy'
  href?: string
  className?: string
}

const iconColorStyles = {
  blue: 'text-[#0066FF] bg-blue-50 border-blue-100',
  green: 'text-[#00A859] bg-emerald-50 border-emerald-100',
  amber: 'text-[#FFB703] bg-amber-50 border-amber-100',
  purple: 'text-purple-600 bg-purple-50 border-purple-100',
  red: 'text-[#E53935] bg-red-50 border-red-100',
  navy: 'text-[#00142E] bg-slate-100 border-slate-200',
}

export function StatCard({
  title,
  value,
  subtext,
  icon,
  trend,
  iconColor = 'blue',
  href,
  className = '',
}: StatCardProps) {
  const colorCls = iconColorStyles[iconColor]

  const renderIcon = () => {
    if (!icon) return null
    if (React.isValidElement(icon)) return icon
    const IconComponent = icon as React.ComponentType<{ className?: string }>
    return <IconComponent className="w-5 h-5" />
  }

  const cardContent = (
    <div
      className={`relative p-5 bg-white rounded-2xl border border-slate-200/90 shadow-soft-card transition-all duration-200 flex flex-col justify-between ${
        href ? 'hover:border-blue-300 hover:shadow-md cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider line-clamp-1">
          {title}
        </span>
        {icon && (
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorCls}`}
          >
            {renderIcon()}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-[#00142E] tracking-tight leading-none">
            {value}
          </span>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                trend.isPositive
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 shrink-0" />
              )}
              <span>{trend.value}</span>
            </span>
          )}
        </div>

        {subtext && (
          <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-1">
            {subtext}
          </p>
        )}
      </div>
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

export default StatCard
