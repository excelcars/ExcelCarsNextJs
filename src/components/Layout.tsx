'use client'

import { useEffect, useRef, useState, useTransition, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, ChevronDown, ChevronRight, Menu, Bell, LogOut,
  Package, BarChart3, Wrench, UserRound, LockKeyhole, ChevronUp
} from 'lucide-react'

interface NavItem {
  label: string
  icon: ReactNode
  href?: string
  children?: { label: string; href: string }[]
}

function ProfileMenu({
  displayName,
  roleName,
  placement,
  sidebarOpen = true,
  onNavigate,
  onExpand,
}: {
  displayName: string
  roleName: string
  placement: 'sidebar' | 'header'
  sidebarOpen?: boolean
  onNavigate?: () => void
  onExpand?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    onNavigate?.()
  }
  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setOpen(false)
    await signOut({ callbackUrl: '/login' })
  }
  const isSidebar = placement === 'sidebar'
  const showSidebarDetails = !isSidebar || sidebarOpen

  return (<>
    <div ref={menuRef} className={`relative ${isSidebar ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => {
          if (isSidebar && !sidebarOpen) onExpand?.()
          setOpen(value => !value)
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={isSidebar && !showSidebarDetails ? `Open profile menu for ${displayName}` : undefined}
        title={isSidebar && !showSidebarDetails ? displayName : undefined}
        className={isSidebar
          ? `w-full flex items-center gap-3 cursor-pointer ${showSidebarDetails ? 'px-2' : 'justify-center px-0'} py-2 rounded-lg text-left transition-all ${open ? 'bg-white/10' : 'hover:bg-white/10'}`
          : 'flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 transition hover:bg-gray-100'
        }
      >
        <div className={`${isSidebar ? 'w-8 h-8 bg-[#C8102E] text-sm' : 'w-7 h-7 bg-[#1B2A6B] text-xs'} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
          {displayName.charAt(0)}
        </div>
        {isSidebar && showSidebarDetails && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{displayName}</div>
            <div className="truncate text-xs text-white/50">{roleName}</div>
          </div>
        )}
        {!isSidebar && (
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
        )}
        {isSidebar && showSidebarDetails && (open ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />)}
      </button>

      {open && showSidebarDetails && (
        <div
          className={isSidebar
            ? 'absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#101a3d] shadow-2xl'
            : 'absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl'
          }
          role="menu"
        >
          <div className={isSidebar ? 'border-b border-white/10 px-4 py-3' : 'border-b border-gray-200 px-4 py-3'}>
            <div className={`truncate text-sm font-semibold ${isSidebar ? 'text-white' : 'text-gray-900'}`}>{displayName}</div>
            <div className={`truncate text-xs ${isSidebar ? 'text-white/50' : 'text-gray-500'}`}>{roleName || 'Excel Cars user'}</div>
          </div>
          <div className="p-1.5">
            <Link
              href="/profile"
              onClick={closeMenu}
              role="menuitem"
              className={`flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-sm transition ${isSidebar ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <UserRound className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/profile#security"
              onClick={closeMenu}
              role="menuitem"
              className={`flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-sm transition ${isSidebar ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <LockKeyhole className="h-4 w-4" />
              Change Password
            </Link>
          </div>
          <div className={`p-1.5 ${isSidebar ? 'border-t border-white/10' : 'border-t border-gray-200'}`}>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              role="menuitem"
              className={`w-full flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm transition disabled:cursor-wait disabled:opacity-60 ${isSidebar ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200' : 'text-red-600 hover:bg-red-50'}`}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
    {isSigningOut && (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/45 text-center backdrop-blur-[1px]" role="status" aria-live="polite">
        <div className="rounded-xl bg-white px-7 py-6 shadow-2xl">
          <svg className="mx-auto h-8 w-8 animate-spin text-[#1B2A6B]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm font-semibold text-gray-900">Signing you out…</p>
          <p className="mt-1 text-xs text-gray-500">Please wait.</p>
        </div>
      </div>
    )}
  </>)
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
      { label: 'Inquiry Source Master', href: '/config/inquiry-sources' },
      { label: 'Portal Assignments', href: '/config/portal-assignments' },
      { label: 'Feedback', href: '/config/feedback' },
      { label: 'Email Templates', href: '/config/sms-email' },
    ],
  },
  {
    label: 'Reports', icon: <BarChart3 className="w-4 h-4" />,
    children: [
      { label: 'Stock Report', href: '/reports/stock' },
      { label: 'Outstanding Payments', href: '/reports/outstanding' },
      { label: 'Stock Tracking', href: '/reports/tracking' },
      { label: "Today's Activity", href: '/reports/today' },
    ],
  },
]

export function Layout({
  children,
  accessibleRoutes = [],
  displayName: initialDisplayName,
  roleName: initialRoleName = '',
}: {
  children: ReactNode
  accessibleRoutes?: string[]
  displayName?: string
  roleName?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Operations: true, Configuration: true, Reports: true })
  const [isNavigationPending, startNavigationTransition] = useTransition()
  const [pendingNavigation, setPendingNavigation] = useState<{ fromPathname: string; label: string } | null>(null)
  const desktopNavRef = useRef<HTMLElement>(null)
  const mobileNavRef = useRef<HTMLElement>(null)
  const sidebarScrollPositionRef = useRef(0)
  const accessibleRouteSet = new Set(accessibleRoutes)

  const rememberSidebarScroll = (scrollTop: number) => {
    sidebarScrollPositionRef.current = scrollTop
    window.sessionStorage.setItem('excel-cars-sidebar-scroll-top', String(scrollTop))
  }

  const restoreSidebarScroll = () => {
    const storedPosition = window.sessionStorage.getItem('excel-cars-sidebar-scroll-top')
    const scrollTop = storedPosition === null ? sidebarScrollPositionRef.current : Number(storedPosition)
    const safeScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0

    sidebarScrollPositionRef.current = safeScrollTop
    desktopNavRef.current?.scrollTo({ top: safeScrollTop })
    mobileNavRef.current?.scrollTo({ top: safeScrollTop })
  }

  useEffect(() => {
    if (pendingNavigation && pathname !== pendingNavigation.fromPathname && !isNavigationPending) {
      setPendingNavigation(null)
    }
  }, [isNavigationPending, pathname, pendingNavigation])

  // Next.js may recreate this scroll container during navigation. Restore the
  // sidebar independently so the selected item stays where the user left it.
  useEffect(() => {
    const frame = window.requestAnimationFrame(restoreSidebarScroll)
    return () => window.cancelAnimationFrame(frame)
  }, [pathname, mobileSidebarOpen, sidebarOpen])

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

  const handleNavigationClick = (event: ReactMouseEvent<HTMLAnchorElement>, label: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const targetPathname = event.currentTarget.pathname
    if (targetPathname === pathname) return

    event.preventDefault()
    setPendingNavigation({ fromPathname: pathname, label })
    startNavigationTransition(() => router.push(targetPathname))
  }

  const isActive = (item: NavItem) => {
    if (item.href) return item.href === pathname || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
    return item.children?.some(c => pathname === c.href || pathname.startsWith(`${c.href}/`))
  }

  const displayName = initialDisplayName || session?.user?.name || session?.user?.username || 'User'
  const roleName = initialRoleName || session?.user?.roleName || ''

  const renderSidebarContent = (navRef: React.RefObject<HTMLElement | null>) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/10 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-excel-car.png" alt="Excel Cars" className="h-8 object-contain bg-white rounded px-2 py-0.5" />
        {sidebarOpen && <span className="ml-3 text-white/60 text-xs font-mono uppercase tracking-widest">CRM</span>}
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        onScroll={event => rememberSidebarScroll(event.currentTarget.scrollTop)}
        className="sidebar-scrollbar flex-1 overflow-y-auto py-4 px-2"
      >
        {visibleNavItems.map(item => (
          <div key={item.label} className="mb-0.5">
            {item.href ? (
              <Link
                href={item.href}
                onClick={event => {
                  setSidebarOpen(false)
                  handleNavigationClick(event, item.label)
                  setMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${pathname === item.href ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    // A collapsed sidebar uses the icon as the entry point;
                    // open it first so the section label and children are visible.
                    if (!sidebarOpen) {
                      setSidebarOpen(true)
                      return
                    }
                    toggle(item.label)
                  }}
                  className={`w-full flex cursor-pointer items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${isActive(item) || expanded[item.label] ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
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
                    {item.children.length === 0 && (
                      <div className="px-3 py-2 text-xs text-white/35">No accessible pages</div>
                    )}
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={event => {
                          setSidebarOpen(false)
                          handleNavigationClick(event, child.label)
                          setMobileSidebarOpen(false)
                        }}
                        className={`block text-left px-3 py-2 rounded-lg text-sm transition-all ${pathname === child.href || pathname.startsWith(`${child.href}/`) ? 'text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                      >
                        {(pathname === child.href || pathname.startsWith(`${child.href}/`)) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C8102E] mr-2 mb-0.5" />}
                        {child.label}
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
        <ProfileMenu
          displayName={displayName}
          roleName={roleName}
          placement="sidebar"
          sidebarOpen={sidebarOpen}
          onNavigate={() => setMobileSidebarOpen(false)}
          onExpand={() => setSidebarOpen(true)}
        />
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
        {renderSidebarContent(desktopNavRef)}
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: 'linear-gradient(180deg, #1B2A6B 0%, #12204F 100%)' }}>
            {renderSidebarContent(mobileNavRef)}
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
          <div className="pl-2 border-l border-gray-200">
            <ProfileMenu displayName={displayName} roleName={roleName} placement="header" />
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${pathname === '/dashboard' ? 'p-0' : 'p-6'}`} aria-busy={Boolean(pendingNavigation)}>
          {pendingNavigation ? (
            <div className="flex min-h-full w-full flex-1 flex-col items-center justify-center bg-gray-50" role="status" aria-live="polite" aria-label={`Loading ${pendingNavigation.label}`}>
              <span className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-[#C8102E]" />
              <p className="mt-4 text-sm font-medium text-gray-600">Loading {pendingNavigation.label}...</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  )
}
