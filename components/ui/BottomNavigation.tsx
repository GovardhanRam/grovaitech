'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/BottomNavigation.tsx
 *
 * Fixed bottom navigation bar for mobile and Android Capacitor webview.
 * Provides guaranteed 44px+ touch targets, active state indicators,
 * and safe-area padding for modern Android gesture bars.
 */

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Bot,
  MoreHorizontal,
} from 'lucide-react'

export interface BottomNavItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
  onClick?: () => void
}

export interface BottomNavigationProps {
  items?: BottomNavItem[]
  onMoreClick?: () => void
  isMoreActive?: boolean
  className?: string
}

export const defaultBottomNavItems: BottomNavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Conversations', href: '/conversations', icon: MessageSquare },
  { name: 'AI Employees', href: '/ai-employees', icon: Bot },
]

export function BottomNavigation({
  items = defaultBottomNavItems,
  onMoreClick,
  isMoreActive = false,
  className = '',
}: BottomNavigationProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,20,46,0.06)] ${className}`}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive =
            item.href &&
            (pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')))

          const content = (
            <>
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-[#0066FF]' : 'text-slate-500'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                )}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#E53935] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 leading-none truncate max-w-full ${
                  isActive ? 'font-bold text-[#0066FF]' : 'font-medium text-slate-500'
                }`}
              >
                {item.name}
              </span>
            </>
          )

          if (item.href) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 hover:bg-slate-50/80 active:scale-95"
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={item.name}
              type="button"
              onClick={item.onClick}
              className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 hover:bg-slate-50/80 active:scale-95 cursor-pointer"
            >
              {content}
            </button>
          )
        })}

        {/* More Options Tab */}
        {onMoreClick && (
          <button
            type="button"
            onClick={onMoreClick}
            aria-label="More navigation options"
            className="flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 hover:bg-slate-50/80 active:scale-95 cursor-pointer"
          >
            <div className="relative">
              <MoreHorizontal
                className={`w-5 h-5 transition-transform ${
                  isMoreActive ? 'scale-110 text-[#0066FF]' : 'text-slate-500'
                }`}
              />
              {isMoreActive && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-1 leading-none ${
                isMoreActive ? 'font-bold text-[#0066FF]' : 'font-medium text-slate-500'
              }`}
            >
              More
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}

export default BottomNavigation
