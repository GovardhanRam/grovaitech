'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/AppHeader.tsx
 *
 * Mobile-first application top bar with safe-area support, official GR logo,
 * search trigger, GOVA quick-access button, and profile trigger.
 */

import React from 'react'
import { Menu, Search, Mic, Bell } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

export interface AppHeaderProps {
  onMenuClick?: () => void
  onVoiceClick?: () => void
  onNotificationsClick?: () => void
  onSearchClick?: () => void
  userAvatar?: React.ReactNode
  notificationCount?: number
  showSearch?: boolean
  showVoice?: boolean
  className?: string
}

export function AppHeader({
  onMenuClick,
  onVoiceClick,
  onNotificationsClick,
  onSearchClick,
  userAvatar,
  notificationCount = 0,
  showSearch = true,
  showVoice = true,
  className = '',
}: AppHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 pt-safe ${className}`}
    >
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Toggle navigation drawer"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-[#00142E] hover:bg-slate-100 transition-colors md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <BrandLogo variant="horizontal" size="sm" href="/dashboard" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {showSearch && onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              aria-label="Search"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-[#00142E] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {showVoice && onVoiceClick && (
            <button
              type="button"
              onClick={onVoiceClick}
              aria-label="Talk to GOVA AI"
              className="flex items-center gap-1.5 px-3 py-2 h-11 min-h-[44px] rounded-xl bg-gradient-to-r from-[#0066FF] to-indigo-600 hover:from-[#0052CC] hover:to-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">GOVA</span>
            </button>
          )}

          {onNotificationsClick && (
            <button
              type="button"
              onClick={onNotificationsClick}
              aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
              className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-[#00142E] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E53935] ring-2 ring-white" />
              )}
            </button>
          )}

          {userAvatar && <div className="ml-1 shrink-0">{userAvatar}</div>}
        </div>
      </div>
    </header>
  )
}

export default AppHeader
