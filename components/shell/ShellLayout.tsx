'use client'

/**
 * components/shell/ShellLayout.tsx
 *
 * Reusable Grovaitech OS application shell — dark navy sidebar, top header,
 * auth gate, notifications, profile dropdown.
 *
 * Used by:
 *   - app/(shell)/layout.tsx  (all pages inside the (shell) route group)
 *   - app/ai-employees/page.tsx  (outside the route group, needs shell inline)
 *
 * DO NOT modify the visual design here without reviewing all consumers.
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Bot,
  Workflow,
  TrendingUp,
  Cpu,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react'

interface ShellLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { name: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
  { name: 'Conversations', href: '/conversations',  icon: MessageSquare },
  { name: 'Leads',         href: '/leads',          icon: Users },
  { name: 'AI Employees',  href: '/ai-employees',   icon: Bot },
  { name: 'Workflows',     href: '/workflows',      icon: Workflow },
  { name: 'Analytics',     href: '/analytics',      icon: TrendingUp },
  { name: 'Integrations',  href: '/integrations',   icon: Cpu },
  { name: 'Blog',          href: '/blog',           icon: BookOpen },
  { name: 'Settings',      href: '/settings',       icon: Settings },
]

const mockNotifications = [
  { id: 1, text: 'AI Receptionist booked a new appointment at Apollo Dental Clinic', time: '5 mins ago', unread: true },
  { id: 2, text: 'New lead qualified via WhatsApp: Ram Charan (Nellore)', time: '1 hour ago', unread: true },
  { id: 3, text: 'Invoice #INV-2026-004 paid successfully', time: '1 day ago', unread: false },
]

export default function ShellLayout({ children }: ShellLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    }
    checkUser()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center animate-spin">
            <span className="font-bold text-white text-lg">G</span>
          </div>
          <p className="text-slate-400 text-sm animate-pulse">Loading Grovaitech OS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950 shrink-0 sticky top-0 h-screen text-slate-400">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-900 bg-slate-950">
          <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
            <Image
              src="/images/Grovaitech_Logo_Optimized.png"
              alt="Grovaitech Logo"
              width={26}
              height={26}
              className="rounded object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wider text-white uppercase leading-none">
              GROVAITECH
            </span>
            <span className="text-[8px] font-bold text-blue-500 uppercase tracking-wider mt-1.5 leading-none">
              AI WORKFORCE OS
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <item.icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar profile */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center font-bold text-white text-sm">
              {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('') : user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.full_name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/65 backdrop-blur-xs">
          <div className="relative flex flex-col w-72 max-w-xs bg-slate-950 border-r border-slate-900 text-slate-400">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-900">
              <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                <Image src="/images/Grovaitech_Logo_Optimized.png" alt="Grovaitech Logo" width={26} height={26} className="rounded object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm tracking-wider text-white uppercase leading-none">GROVAITECH</span>
                <span className="text-[8px] font-bold text-blue-500 uppercase tracking-wider mt-1.5 leading-none">AI WORKFORCE OS</span>
              </div>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-slate-900">
              <div className="flex items-center gap-3 p-2">
                <div className="w-9 h-9 rounded-full bg-blue-600/10 flex items-center justify-center font-bold text-white text-sm">
                  {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('') : user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.full_name || 'Administrator'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 bg-slate-100 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 w-64 md:w-80 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-400 focus-within:border-blue-500/50 transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads, employees, settings..."
                className="bg-transparent border-none text-xs text-slate-700 placeholder-slate-400 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all duration-200 relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="text-xs font-bold text-slate-800">Notifications</span>
                    <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Mark all read</button>
                  </div>
                  <div className="space-y-3">
                    {mockNotifications.map((notif) => (
                      <div key={notif.id} className="flex gap-2.5 items-start p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.unread ? 'bg-blue-600' : 'bg-transparent'}`} />
                        <div className="flex-1">
                          <p className="text-[11px] text-slate-600 leading-normal">{notif.text}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">{notif.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200" />

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-600 text-xs group-hover:scale-105 transition-transform duration-200">
                  {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('') : user.email[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">{user.full_name || 'Admin'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 hidden sm:inline" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-50 text-slate-700">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{user.full_name || 'Administrator'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-50 transition-colors">
                    <Settings className="w-3.5 h-3.5 text-slate-400" /> Settings
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors text-left border-t border-slate-100 mt-1">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
