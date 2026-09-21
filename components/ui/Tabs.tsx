'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/Tabs.tsx
 *
 * Mobile-friendly tabs supporting segmented and underline variants,
 * horizontal touch scrolling, and accessible tab semantics.
 */

import React from 'react'

export interface TabItem {
  id: string
  label: string
  count?: number | string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  variant?: 'segmented' | 'underline' | 'pills'
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'segmented',
  size = 'md',
  fullWidth = false,
  className = '',
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={`flex items-center border-b border-slate-200 overflow-x-auto no-scrollbar gap-4 sm:gap-6 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-2 py-3 px-1 min-h-[44px] text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer select-none ${
                isActive
                  ? 'text-[#0066FF]'
                  : 'text-slate-500 hover:text-slate-800'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-blue-100 text-[#0066FF]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Segmented (Default)
  const sizeStyles = {
    sm: 'p-1 gap-1 text-xs',
    md: 'p-1.5 gap-1.5 text-xs sm:text-sm',
  }

  return (
    <div
      role="tablist"
      className={`inline-flex items-center bg-slate-100 rounded-xl overflow-x-auto no-scrollbar max-w-full ${
        fullWidth ? 'w-full' : ''
      } ${sizeStyles[size]} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-2 h-9 min-h-[38px] px-3.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer select-none ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-white text-[#00142E] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
