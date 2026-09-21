'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/SecondaryButton.tsx
 *
 * Secondary button with compliant 44px+ mobile touch targets,
 * subtle borders, soft hover states, and accessible keyboard rings.
 */

import React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  variant?: 'outline' | 'subtle' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export function SecondaryButton({
  children,
  href,
  variant = 'outline',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: SecondaryButtonProps) {
  const sizeStyles = {
    sm: 'h-11 min-h-[44px] px-3.5 text-xs font-semibold rounded-xl gap-2',
    md: 'h-12 min-h-[44px] px-4 text-sm font-semibold rounded-xl gap-2.5',
    lg: 'h-13 min-h-[48px] px-6 text-base font-bold rounded-2xl gap-3',
  }

  const variantStyles = {
    outline:
      'bg-white text-[#00142E] border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 active:bg-slate-100 shadow-2xs',
    subtle:
      'bg-blue-50/80 text-[#0066FF] border border-blue-100/80 hover:bg-blue-100/80 active:bg-blue-200/60 shadow-2xs',
    ghost:
      'bg-transparent text-slate-700 hover:text-[#00142E] hover:bg-slate-100 active:bg-slate-200/70 border border-transparent',
  }

  const baseStyles =
    'inline-flex items-center justify-center transition-all duration-150 active:scale-[0.98] select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

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

export default SecondaryButton
