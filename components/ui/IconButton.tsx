'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/IconButton.tsx
 *
 * Square/round icon button guaranteeing minimum 44x44px touch target area,
 * accessible label, indicator badge, and tactile feedback.
 */

import React from 'react'
import Link from 'next/link'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  'aria-label': string
  href?: string
  variant?: 'outline' | 'subtle' | 'ghost' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  shape?: 'rounded' | 'circle'
  badgeCount?: number
  showBadgeDot?: boolean
}

export function IconButton({
  icon,
  'aria-label': ariaLabel,
  href,
  variant = 'outline',
  size = 'md',
  shape = 'rounded',
  badgeCount,
  showBadgeDot = false,
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  // Mobile touch target is always at least 44x44px
  const sizeStyles = {
    sm: 'w-11 h-11 min-w-[44px] min-h-[44px] p-2',
    md: 'w-12 h-12 min-w-[44px] min-h-[44px] p-2.5',
    lg: 'w-13 h-13 min-w-[48px] min-h-[48px] p-3',
  }

  const shapeStyles = {
    rounded: 'rounded-xl',
    circle: 'rounded-full',
  }

  const variantStyles = {
    outline:
      'bg-white text-slate-700 hover:text-[#00142E] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-2xs',
    subtle:
      'bg-blue-50/80 text-[#0066FF] border border-blue-100/60 hover:bg-blue-100 active:bg-blue-200/70',
    ghost:
      'bg-transparent text-slate-600 hover:text-[#00142E] hover:bg-slate-100 active:bg-slate-200/60 border border-transparent',
    solid:
      'bg-[#0066FF] text-white hover:bg-[#0052CC] active:bg-[#0040A3] border border-transparent shadow-xs',
  }

  const combinedStyles = `relative inline-flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${sizeStyles[size]} ${shapeStyles[shape]} ${variantStyles[variant]} ${className}`

  const content = (
    <>
      <span className="shrink-0 flex items-center justify-center">{icon}</span>
      {showBadgeDot && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#0066FF] ring-2 ring-white"
          aria-hidden="true"
        />
      )}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E53935] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
          aria-hidden="true"
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </>
  )

  if (href && !disabled) {
    return (
      <Link href={href} aria-label={ariaLabel} className={combinedStyles}>
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={combinedStyles}
      {...props}
    >
      {content}
    </button>
  )
}

export default IconButton
