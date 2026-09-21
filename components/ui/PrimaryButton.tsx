'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/PrimaryButton.tsx
 *
 * Primary CTA button with compliant 44px+ mobile touch targets,
 * loading state, icon slots, and accessible keyboard focus states.
 */

import React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  variant?: 'solid' | 'gradient' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export function PrimaryButton({
  children,
  href,
  variant = 'solid',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  const sizeStyles = {
    sm: 'h-11 min-h-[44px] px-3.5 text-xs font-semibold rounded-xl gap-2',
    md: 'h-12 min-h-[44px] px-4 text-sm font-semibold rounded-xl gap-2.5',
    lg: 'h-13 min-h-[48px] px-6 text-base font-bold rounded-2xl gap-3',
  }

  const variantStyles = {
    solid:
      'bg-[#0066FF] hover:bg-[#0052CC] active:bg-[#0040A3] text-white shadow-xs shadow-blue-500/20 border border-transparent',
    gradient:
      'bg-gradient-to-r from-[#0066FF] to-[#4F46E5] hover:from-[#0052CC] hover:to-[#4338CA] text-white shadow-sm shadow-blue-500/25 border border-transparent',
    danger:
      'bg-[#E53935] hover:bg-[#C62828] active:bg-[#B71C1C] text-white shadow-xs shadow-red-500/20 border border-transparent',
    success:
      'bg-[#00A859] hover:bg-[#008F4C] active:bg-[#00733D] text-white shadow-xs shadow-emerald-500/20 border border-transparent',
  }

  const baseStyles =
    'inline-flex items-center justify-center transition-all duration-150 active:scale-[0.98] select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none'

  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
    fullWidth ? 'w-full' : ''
  } ${className}`

  const content = (
    <>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </>
  )

  if (href && !disabled && !isLoading) {
    return (
      <Link href={href} className={combinedStyles}>
        {content}
      </Link>
    )
  }

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={combinedStyles}
      {...props}
    >
      {content}
    </button>
  )
}

export default PrimaryButton
