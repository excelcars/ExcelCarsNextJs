'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Search, CheckCheck, Inbox } from 'lucide-react'
import { Btn } from '@/components/ui'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

type Message = {
  id: number; senderName: string | null; senderMobile: string; messageType: string; body: string
  mediaId: string | null; sentAt: string; receivedAt: string; readAt: string | null
}
type InboxData = { messages: Message[]; total: number; unread: number }
const date = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

export function WhatsAppInboxClient() {
  const [data, setData] = useState<InboxData>({ messages: [], total: 0, unread: 0 })
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marking, setMarking] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    async function load() {
      if (pending) return
      pending = true
      try {
        const params = new URLSearchParams({ search: debouncedSearch, page: String(page), unread: unreadOnly ? '1' : '0' })
        const response = await fetch(`/api/messages?${params}`, { signal: controller.signal, cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load messages.')
        setData(result)
        setError('')
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load messages.')
      } finally { pending = false; if (!controller.signal.aborted) setLoading(false) }
    }
    setLoading(true)
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [debouncedSearch, page, unreadOnly, refresh])

  const markRead = useCallback(async (message: Message) => {
    setMarking(true)
    try {
      const response = await fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: message.id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to mark as read.')
      setSelected(current => current?.id === message.id ? { ...current, readAt: new Date().toISOString() } : current)
      setRefresh(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to mark as read.') }
    finally { setMarking(false) }
  }, [])

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-[#1B2A6B]"><MessageCircle className="h-7 w-7 text-emerald-600" />WhatsApp Inbox</h1>
        <p className="mt-1 text-sm text-gray-500">Incoming WhatsApp Business messages · Refreshes every 15 seconds</p></div>
      <Btn variant="outline" onClick={() => setRefresh(value => value + 1)} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Btn>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">Unread messages</p><p className="mt-1 text-3xl font-bold text-emerald-700">{data.unread}</p></div>
      <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">{unreadOnly || search ? 'Matching messages' : 'Received messages'}</p><p className="mt-1 text-3xl font-bold text-[#1B2A6B]">{data.total}</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <label className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input aria-label="Search messages" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search name, phone or message…" className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm" /></label>
      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={unreadOnly} onChange={event => { setUnreadOnly(event.target.checked); setPage(1) }} />Unread only</label>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-2">
      <div className="border-b border-gray-200 lg:border-b-0 lg:border-r" aria-busy={loading}>
        <div className="max-h-[600px] overflow-y-auto">
          {data.messages.map(message => <button type="button" key={message.id} onClick={() => setSelected(message)} className={`block w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${selected?.id === message.id ? 'bg-emerald-50' : ''}`}>
            <div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2 font-semibold text-gray-900">{!message.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}<span className="truncate">{message.senderName || `+${message.senderMobile}`}</span></span><span className="shrink-0 text-xs text-gray-500">{date(message.receivedAt)}</span></div>
            <div className="mt-1 text-xs text-gray-500">+{message.senderMobile} · {message.messageType}</div><p className="mt-2 truncate text-sm text-gray-600">{message.body}</p>
          </button>)}
          {!data.messages.length && <div className="px-6 py-16 text-center text-gray-500"><Inbox className="mx-auto mb-3 h-9 w-9 text-gray-300" /><p>{loading ? 'Loading messages…' : 'No messages found'}</p><p className="mt-2 text-sm">{search || unreadOnly ? 'Try changing your filters.' : 'New messages will appear here after the webhook is connected.'}</p></div>}
        </div>
        <div className="flex items-center justify-between gap-2 p-3 text-sm text-gray-500"><Btn size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Btn><span>Page {page} of {Math.max(1, Math.ceil(data.total / 50))}</span><Btn size="sm" variant="outline" disabled={page * 50 >= data.total || loading} onClick={() => setPage(value => value + 1)}>Next</Btn></div>
      </div>
      <div className="min-w-0 p-5">
        {selected ? <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="break-words text-lg font-semibold text-gray-900">{selected.senderName || 'WhatsApp contact'}</h2><p className="text-sm text-gray-500">+{selected.senderMobile}</p></div>{!selected.readAt && <Btn size="sm" variant="outline" disabled={marking} onClick={() => void markRead(selected)}><CheckCheck className="h-4 w-4" />Mark read</Btn>}</div>
          <p className="mt-4 text-xs text-gray-500">Sent {date(selected.sentAt)} IST · {selected.messageType}</p>
          <div className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-gray-800">{selected.body}</div>
          {selected.mediaId && <p className="mt-3 text-sm text-gray-500">This message includes {selected.messageType} media. Media preview is not available.</p>}
          <p className="mt-5 text-xs text-gray-400">Read status is shared across the team. Replies are sent from WhatsApp Business.</p>
        </> : <div className="flex min-h-60 flex-col items-center justify-center text-center text-gray-400"><MessageCircle className="mb-3 h-10 w-10" /><p className="text-sm">Select a message to view its details</p></div>}
      </div>
    </div>
  </div>
}
