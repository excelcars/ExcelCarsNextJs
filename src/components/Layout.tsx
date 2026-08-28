'use client'

import { useState, type ReactNode } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, ChevronDown, ChevronRight, Menu, Bell, LogOut,
  Package, BarChart3, Wrench
} from 'lucide-react'

interface NavItem {
  label: string
  icon: ReactNode
  href?: string
  children?: { label: string; href: string }[]
}

function NavigationLoadingIndicator() {
  const { pending } = useLinkStatus()

  if (!pending) return null

  return (
    <>
      <span
        className="absolute inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-[#C8102E]"
        aria-hidden="true"
      />
      <span
        className="fixed right-5 top-[4.5rem] z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-lg"
        role="status"
        aria-live="polite"
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-[#C8102E]" />
        Loading page...
      </span>
    </>
  )
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard' },
  {
    label: 'Operations', icon: <Wrench className="w-4 h-4" />,
    children: [
      { label: 'Inventory', href: '/inventory' },
      { label: 'Checklist / Docs', href: '/checklist' },
      { label: 'Inquiries', href: '/inquiry' },
      { label: 'Loan Management', href: '/loan' },
      { label: 'Insurance', href: '/insurance' },
      { label: 'RTO Management', href: '/rto' },
      { label: 'Follow-up', href: '/followup' },
      { label: 'DSA Management', href: '/dsa' },
    ],
  },
  {
    label: 'Configuration', icon: <Package className="w-4 h-4" />,
    children: [
      { label: 'User Access', href: '/config/user-access' },
      { label: 'Role Access', href: '/config/role-access' },
      { label: 'Dealers', href: '/config/dealers' },
      { label: 'Customers', href: '/config/customers' },
      { label: 'Agents', href: '/config/agents' },
      { label: 'Vehicle Masters', href: '/config/catalog' },
      { label: 'Feedback', href: '/config/feedback' },
      { label: 'SMS / Email', href: '/config/sms-email' },
    ],
  },
  {
    label: 'Reports', icon: <BarChart3 className="w-4 h-4" />,
    children: [
      { label: 'Stock Report', href: '/reports/stock' },
      { label: 'Outstanding Payments', href: '/reports/outstanding' },
      { label: 'Stock Tracking', href: '/reports/tracking' },
      { label: "Today's Activity", href: '/reports/today' },
      { label: 'Exception Log', href: '/reports/exception' },
    ],
  },
]

export function Layout({ children, accessibleRoutes = [] }: { children: ReactNode; accessibleRoutes?: string[] }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Operations: true, Configuration: false, Reports: false })
  const accessibleRouteSet = new Set(accessibleRoutes)

  const visibleNavItems = navItems
    .map(item => {
      if (item.label !== 'Configuration' || !item.children) return item
      return {
        ...item,
        children: item.children.filter(child => accessibleRouteSet.has(child.href)),
      }
    })
    .map(item => {
      if (item.label === 'Operations' || item.label === 'Reports') {
        return {
          ...item,
          children: item.children?.filter(child => accessibleRouteSet.has(child.href)),
        }
      }
      return item
    })
    .filter(item => item.href || !item.children || item.children.length > 0)

  const toggle = (label: string) => setExpanded(p => ({ ...p, [label]: !p[label] }))

  const isActive = (item: NavItem) => {
    if (item.href) return item.href === pathname || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
    return item.children?.some(c => pathname === c.href || pathname.startsWith(`${c.href}/`))
  }

  const displayName = session?.user?.name || 'User'
  const roleName = session?.user?.roleName || ''

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-excel-car.png" alt="Excel Cars" className="h-8 object-contain bg-white rounded px-2 py-0.5" />
        {sidebarOpen && <span className="ml-3 text-white/60 text-xs font-mono uppercase tracking-widest">CRM</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleNavItems.map(item => (
          <div key={item.label} className="mb-0.5">
            {item.href ? (
              <Link
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${pathname === item.href ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
                <NavigationLoadingIndicator />
              </Link>
            ) : (
              <div>
                <button
                  onClick={() => toggle(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${isActive(item) ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                >
                  {item.icon}
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {expanded[item.label] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </>
                  )}
                </button>
                {sidebarOpen && expanded[item.label] && item.children && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`block text-left px-3 py-2 rounded-lg text-sm transition-all ${pathname === child.href || pathname.startsWith(`${child.href}/`) ? 'text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                      >
                        {(pathname === child.href || pathname.startsWith(`${child.href}/`)) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C8102E] mr-2 mb-0.5" />}
                        {child.label}
                        <NavigationLoadingIndicator />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#C8102E] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {displayName.charAt(0)}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{displayName}</div>
              <div className="text-white/50 text-xs truncate">{roleName}</div>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 transition-all duration-200"
        style={{ width: sidebarOpen ? 240 : 64, background: 'linear-gradient(180deg, #1B2A6B 0%, #12204F 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: 'linear-gradient(180deg, #1B2A6B 0%, #12204F 100%)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
          <button
            onClick={() => { setSidebarOpen(!sidebarOpen); setMobileSidebarOpen(!mobileSidebarOpen) }}
            className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Bell className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-[#1B2A6B] flex items-center justify-center text-white text-xs font-bold">
              {displayName.charAt(0)}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
