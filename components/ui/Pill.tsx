'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/Pill.tsx
 *
 * Interactive or static tag pill for category filtering, metadata tags,
 * and quick-selection chips.
 */

import React from 'react'
import { X } from 'lucide-react'

export interface PillProps {
  label: string
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
  variant?: 'default' | 'primary' | 'outline' | 'subtle'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function Pill({
  label,
  selected = false,
  onClick,
  onRemove,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  disabled = false,
}: PillProps) {
  const isInteractive = Boolean(onClick && !disabled)

  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs gap-1.5 min-h-[32px]',
    md: 'h-9 px-3.5 text-xs font-semibold gap-2 min-h-[36px]',
  }

  const variantStyles = {
    default: selected
      ? 'bg-[#00142E] text-white border-[#00142E]'
      : 'bg-white text-slate-700 hover:text-[#00142E] border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    primary: selected
      ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-2xs'
      : 'bg-blue-50/70 text-[#0066FF] border-blue-200/80 hover:bg-blue-100/70',
    outline: selected
      ? 'bg-blue-50 text-[#0066FF] border-[#0066FF] ring-1 ring-[#0066FF]'
      : 'bg-transparent text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    subtle: selected
      ? 'bg-slate-900 text-white border-transparent'
      : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200/70',
  }

  const baseStyles = `inline-flex items-center justify-center rounded-full border transition-all duration-150 select-none ${
    isInteractive ? 'cursor-pointer active:scale-95' : ''
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${sizeStyles[size]} ${
    variantStyles[variant]
  } ${className}`

  return (
    <span
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={baseStyles}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

export default Pill
