'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/Input.tsx
 *
 * Form input with accessible label, error message, helper text,
 * prefix/suffix icon slots, and compliant 44px+ mobile touch targets.
 */

import React, { forwardRef, useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id: customId,
      className = '',
      containerClassName = '',
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = customId || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    return (
      <div className={`flex flex-col w-full gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[#00142E] flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-[#E53935] ml-0.5">*</span>}
            </span>
          </label>
        )}

        <div
          className={`relative flex items-center w-full h-12 min-h-[44px] bg-white border rounded-xl transition-all duration-150 ${
            error
              ? 'border-[#E53935] focus-within:ring-2 focus-within:ring-[#E53935]/20 focus-within:border-[#E53935]'
              : 'border-slate-200 focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/15'
          } ${disabled ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''}`}
        >
          {leftIcon && (
            <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400 shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full h-full bg-transparent px-3 text-sm text-[#00142E] placeholder:text-slate-400 focus:outline-none ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="pr-3 pl-2 flex items-center text-slate-400 shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} className="text-xs text-[#E53935] font-medium mt-0.5">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-500 mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
