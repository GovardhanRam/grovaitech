'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/BottomSheet.tsx
 *
 * Mobile-first slide-up bottom sheet with pull bar handle, backdrop blur,
 * and safe-area padding for Android gesture navigation.
 */

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  showCloseButton?: boolean
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
  className = '',
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop Click Dismiss */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        className={`relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-soft-float border-t border-slate-100 max-h-[88vh] flex flex-col pb-safe pb-4 ${className}`}
      >
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center items-center">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 select-none" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
            <div>
              {title && (
                <h3 className="text-base font-bold text-[#00142E] leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sheet"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Sheet Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

export default BottomSheet
