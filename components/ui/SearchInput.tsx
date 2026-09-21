'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/SearchInput.tsx
 *
 * Mobile-friendly search input with 44px+ touch target, prefix icon,
 * fast-clear button, and subtle focus states.
 */

import React, { useRef } from 'react'
import { Search, X } from 'lucide-react'

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  containerClassName?: string
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search leads, employees, workflows...',
  className = '',
  containerClassName = '',
  disabled,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasValue = Boolean(value && String(value).length > 0)

  const handleClear = () => {
    if (onClear) {
      onClear()
    } else if (inputRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputRef.current, '')
        const event = new Event('input', { bubbles: true })
        inputRef.current.dispatchEvent(event)
      }
    }
    inputRef.current?.focus()
  }

  return (
    <div
      className={`relative flex items-center w-full h-11 min-h-[44px] bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 focus-within:border-[#0066FF] rounded-xl transition-all duration-150 focus-within:ring-2 focus-within:ring-[#0066FF]/20 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${containerClassName}`}
    >
      <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400 shrink-0">
        <Search className="w-4 h-4" aria-hidden="true" />
      </div>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-full bg-transparent text-sm text-[#00142E] placeholder:text-slate-400 focus:outline-none pr-3 ${className}`}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search query"
          className="mr-2 p-1.5 min-w-[32px] min-h-[32px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors flex items-center justify-center cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default SearchInput
