'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/ProgressBar.tsx
 *
 * Rounded progress bar with brand color, smooth transition, and optional percentage label.
 */

import React from 'react'

export interface ProgressBarProps {
  value: number // 0 to 100
  max?: number
  label?: string
  showValueText?: boolean
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colorStyles = {
  blue: 'bg-[#0066FF]',
  green: 'bg-[#00A859]',
  amber: 'bg-[#FFB703]',
  red: 'bg-[#E53935]',
  gradient: 'bg-gradient-to-r from-[#0066FF] to-indigo-500',
}

const sizeHeights = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValueText = false,
  color = 'blue',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  return (
    <div className={`w-full ${className}`}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          {label && <span>{label}</span>}
          {showValueText && <span className="text-slate-500">{percentage}%</span>}
        </div>
      )}

      <div
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeHeights[size]}`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
