'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Users, 
  TrendingUp, 
  Settings, 
  CreditCard, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Bell, 
  Search,
  ChevronRight,
  Calendar
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
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

  // Simple theme toggle effect
  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Chat', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Documents RAG', href: '/dashboard/documents', icon: FileText },
    { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Clients', href: '/dashboard/clients', icon: Users },
    { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  ]

  const mockNotifications = [
    { id: 1, text: "AI Receptionist booked a new appointment at Apollo Dental Clinic", time: "5 mins ago", unread: true },
    { id: 2, text: "New lead qualified via WhatsApp: Ram Charan (Nellore)", time: "1 hour ago", unread: true },
    { id: 3, text: "Invoice #INV-2026-004 paid successfully", time: "1 day ago", unread: false }
  ]

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center animate-spin">
            <span className="font-bold text-white text-lg">G</span>
          </div>
          <p className="text-slate-400 text-sm animate-pulse">Loading dashboard workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#0F172A] text-white transition-colors duration-300 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#1E293B] bg-[#0F172A] shrink-0 sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-[#1E293B]">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            G
          </div>
          <span className="font-black text-lg tracking-wider text-white">
            GROVAITECH
          </span>
        </div>
        
        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/20' 
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer in sidebar */}
        <div className="p-4 border-t border-[#1E293B] bg-[#0F172A]/50">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center font-semibold text-white text-sm">
              {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('') : user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.full_name || 'Administrator'}</p>
              <p className="text-[10px] text-[#94A3B8] truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/80 backdrop-blur-sm">
          <div className="relative flex flex-col w-72 max-w-xs bg-[#0F172A] border-r border-[#1E293B] animate-slide-in">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-white bg-[#1E293B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="h-16 flex items-center gap-2.5 px-6 border-b border-[#1E293B]">
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center font-bold text-white">
                G
              </div>
              <span className="font-black text-lg tracking-wider text-white">
                GROVAITECH
              </span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-[#3B82F6] text-white' 
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-[#1E293B]">
              <div className="flex items-center gap-3 p-2">
                <div className="w-9 h-9 rounded-full bg-[#3B82F6]/10 flex items-center justify-center font-semibold text-white text-sm">
                  {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('') : user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.full_name || 'Administrator'}</p>
                  <p className="text-[10px] text-[#94A3B8] truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-white bg-[#1E293B]/60 border border-[#1E293B] md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search Bar */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 w-64 md:w-80 rounded-xl bg-[#1E293B]/60 border border-[#1E293B]/80 text-[#94A3B8] focus-within:border-[#3B82F6]/50 transition-colors">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search clients, agents, docs..." 
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white bg-[#1E293B]/60 border border-[#1E293B] hover:border-[#3B82F6]/50 transition-all duration-200"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setProfileOpen(false)
                }}
                className="p-2 rounded-xl text-[#94A3B8] hover:text-white bg-[#1E293B]/60 border border-[#1E293B] hover:border-[#3B82F6]/50 transition-all duration-200 relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3B82F6] ring-2 ring-slate-950 animate-pulse"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#1E293B] bg-[#1E293B]/95 backdrop-blur-xl p-4 shadow-2xl z-50 animate-fade-in text-white">
                  <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-3">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    <button className="text-[10px] text-blue-400 hover:text-blue-300">Mark all read</button>
                  </div>
                  <div className="space-y-3">
                    {mockNotifications.map((notif) => (
                      <div key={notif.id} className="flex gap-2.5 items-start p-1.5 rounded-lg hover:bg-[#0F172A]/50 transition-colors">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.unread ? 'bg-[#3B82F6]' : 'bg-transparent'}`}></span>
                        <div className="flex-1">
                          <p className="text-[11px] text-[#94A3B8] leading-normal">{notif.text}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block">{notif.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-[#1E293B]/80"></div>

            {/* User Profile Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen)
                  setNotificationsOpen(false)
                }}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] border border-blue-500/20 flex items-center justify-center font-bold text-white text-xs group-hover:scale-105 transition-transform duration-200">
                  {user.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('') : user.email[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-[#94A3B8] group-hover:text-white transition-colors">{user.full_name || 'Admin'}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[#1E293B] bg-[#1E293B]/95 backdrop-blur-xl py-1 shadow-2xl z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-[#1E293B] mb-1">
                    <p className="text-xs font-semibold text-white truncate">{user.full_name || 'Administrator'}</p>
                    <p className="text-[10px] text-[#94A3B8] truncate">{user.email}</p>
                  </div>
                  <Link href="/dashboard/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-[#94A3B8] hover:bg-[#0F172A] hover:text-white transition-colors">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </Link>
                  <Link href="/dashboard/billing" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-xs text-[#94A3B8] hover:bg-[#0F172A] hover:text-white transition-colors">
                    <CreditCard className="w-3.5 h-3.5" /> Billing
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left border-t border-[#1E293B] mt-1">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Shell */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#0F172A] text-white">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
