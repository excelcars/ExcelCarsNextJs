'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'

type NotificationItem = { notificationId: number; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string }
type NotificationSnapshot = { items: NotificationItem[]; unreadCount: number }

function relativeTime(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<NotificationSnapshot>({ items: [], unreadCount: 0 })
  const [loading, setLoading] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const load = async () => { try { const response = await fetch('/api/notifications', { cache: 'no-store' }); if (response.ok) setSnapshot(await response.json()) } finally { setLoading(false) } }
  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 60_000); return () => window.clearInterval(interval) }, [])
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [open])
  const markRead = async (notificationId: number) => {
    setSnapshot(current => { const item = current.items.find(row => row.notificationId === notificationId); return { ...current, unreadCount: Math.max(0, current.unreadCount - (item?.readAt ? 0 : 1)), items: current.items.map(row => row.notificationId === notificationId ? { ...row, readAt: new Date().toISOString() } : row) } })
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId }) })
  }
  const markAllRead = async () => { setSnapshot(current => ({ ...current, unreadCount: 0, items: current.items.map(item => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) })); await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }) }
  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => { setOpen(value => !value); if (!open) void load() }} aria-label={snapshot.unreadCount ? `${snapshot.unreadCount} unread notifications` : 'Notifications'} aria-expanded={open} className="relative rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white">
      <Bell className="h-4 w-4" />
      {snapshot.unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#C8102E] px-1 text-center text-[10px] font-bold leading-4 text-white ring-1 ring-white">{snapshot.unreadCount > 9 ? '9+' : snapshot.unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3"><div><p className="text-sm font-semibold">Notifications</p><p className="text-xs text-gray-500">Your lead and follow-up work</p></div>{snapshot.unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#1B2A6B] hover:bg-blue-50"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button>}</div>
      <div className="max-h-[24rem] overflow-y-auto">{loading ? <p className="px-4 py-6 text-center text-sm text-gray-500">Loading notifications…</p> : snapshot.items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-gray-500">You’re all caught up.</p> : snapshot.items.map(item => {
        const content = <div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.readAt ? 'bg-gray-300' : 'bg-[#C8102E]'}`} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium">{item.title}</p><time className="shrink-0 text-[11px] text-gray-400">{relativeTime(item.createdAt)}</time></div>{item.body && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-600">{item.body}</p>}</div></div>
        const className = `block border-b border-gray-100 px-4 py-3 last:border-b-0 transition hover:bg-gray-50 ${item.readAt ? '' : 'bg-blue-50/40'}`
        return item.href ? <Link key={item.notificationId} href={item.href} onClick={() => { void markRead(item.notificationId); setOpen(false) }} className={className}>{content}</Link> : <button key={item.notificationId} type="button" onClick={() => void markRead(item.notificationId)} className={`${className} w-full text-left`}>{content}</button>
      })}</div>
    </div>}
  </div>
}
