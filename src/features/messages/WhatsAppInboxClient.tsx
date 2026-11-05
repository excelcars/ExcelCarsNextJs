'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Search, X, ListChecks } from 'lucide-react'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { WhatsAppDeliveryPanel } from './WhatsAppDeliveryPanel'
import { WhatsAppConversation, ChatAvatar, type Chat } from './WhatsAppConversation'

export function WhatsAppInboxClient() {
  const [chats, setChats] = useState<Chat[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search, 300)
  const [unread, setUnread] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Chat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    async function load() {
      if (pending) return
      pending = true
      try {
        const params = new URLSearchParams({ search: query, page: String(page), unread: unread ? '1' : '0' })
        const response = await fetch(`/api/messages/conversations?${params}`, { signal: controller.signal, cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to load chats.')
        if (!controller.signal.aborted) { setChats(result.conversations); setTotal(result.total); setError('') }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load chats.') }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false) }
    }
    setLoading(true)
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [query, page, unread, refresh])

  return <div className="relative flex h-[calc(100dvh-160px)] min-h-[440px] overflow-hidden rounded-xl border border-[#d9dfdb] bg-[#f0f2f5] shadow-sm md:min-h-[540px]">
    <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-[#d9dfdb] bg-white md:w-[330px] lg:w-[370px] xl:w-[400px]`} aria-label="WhatsApp chats">
      <header className="flex h-[76px] shrink-0 items-center justify-between px-5"><h1 className="text-[25px] font-bold tracking-tight text-[#111b21]">WhatsApp</h1><div className="flex items-center gap-1">
        <button type="button" aria-label="Template delivery status" title="Template delivery status" onClick={() => setDeliveryOpen(true)} className="rounded-full p-2 text-[#54656f] hover:bg-[#f0f2f5]"><ListChecks className="h-5 w-5" /></button>
        <button type="button" aria-label="Refresh chats" title="Refresh chats" onClick={() => setRefresh(value => value + 1)} disabled={loading} className="rounded-full p-2 text-[#54656f] hover:bg-[#f0f2f5]"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div></header>
      <div className="px-3 pb-3"><label className="flex items-center gap-4 rounded-lg bg-[#f0f2f5] px-4 py-2.5"><Search className="h-4 w-4 shrink-0 text-[#54656f]" /><input aria-label="Search chats" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-sm text-[#111b21] outline-none placeholder:text-[#667781]" />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><X className="h-4 w-4 text-[#667781]" /></button>}</label>
        <div className="mt-3 flex gap-2">{[false, true].map(value => <button key={String(value)} onClick={() => { setUnread(value); setPage(1) }} aria-pressed={unread === value} className={`rounded-full px-4 py-1.5 text-sm ${unread === value ? 'bg-[#d9fdd3] font-medium text-[#008069]' : 'bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]'}`}>{value ? 'Unread' : 'All'}</button>)}</div>
      </div>
      {error && <p role="alert" className="mx-3 mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
        {chats.map(chat => {
          const active = selected?.phoneNumberId === chat.phoneNumberId && selected?.senderMobile === chat.senderMobile
          return <button key={`${chat.phoneNumberId}-${chat.senderMobile}`} type="button" onClick={() => setSelected(chat)} aria-pressed={active} className={`flex w-full items-center gap-3 px-4 text-left transition-colors ${active ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}>
            <ChatAvatar name={chat.senderName || chat.senderMobile} />
            <div className="min-w-0 flex-1 border-b border-[#f0f2f5] py-4"><div className="flex items-baseline justify-between gap-2"><span className="truncate text-[16px] font-medium text-[#111b21]">{chat.senderName || `+${chat.senderMobile}`}</span><span className={`shrink-0 text-[11px] ${chat.unread ? 'font-semibold text-[#00a884]' : 'text-[#667781]'}`}>{new Date(chat.receivedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="mt-1 flex items-center justify-between gap-3"><p className="truncate text-[13px] text-[#667781]">{chat.direction === 'outgoing' ? 'You: ' : ''}{chat.body}</p>{chat.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1 text-[11px] font-semibold text-white">{chat.unread}</span>}</div></div>
          </button>
        })}
        {!chats.length && <div className="px-6 py-16 text-center text-sm text-[#667781]">{loading ? 'Loading chats…' : search || unread ? 'No matching chats' : 'Your incoming chats will appear here'}</div>}
      </div>
      {total > 50 && <footer className="flex items-center justify-between border-t border-[#e9edef] px-4 py-2 text-xs text-[#667781]"><button disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)} className="p-2 disabled:opacity-30">Previous</button><span>{page} / {Math.ceil(total / 50)}</span><button disabled={page * 50 >= total || loading} onClick={() => setPage(value => value + 1)} className="p-2 disabled:opacity-30">Next</button></footer>}
    </aside>
    <main className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
      {selected ? <WhatsAppConversation key={`${selected.phoneNumberId}-${selected.senderMobile}`} chat={selected} onBack={() => setSelected(null)} onRead={() => setRefresh(value => value + 1)} /> : <div className="flex h-full flex-col items-center justify-center border-b-[6px] border-[#25d366] px-8 text-center"><div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#e3ece7]"><MessageCircle className="h-16 w-16 text-[#00a884]" strokeWidth={1.3} /></div><h2 className="text-[30px] font-light text-[#41525d]">WhatsApp for Excel Cars</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[#667781]">Keep your customer conversations in one place.<br />Select a chat to read messages and reply.</p></div>}
    </main>
    {deliveryOpen && <div className="absolute inset-0 z-20 flex flex-col bg-[#f0f2f5] md:left-auto md:w-[min(620px,100%)] md:border-l md:border-[#d9dfdb] md:shadow-xl"><header className="flex items-center gap-4 bg-white p-4"><button aria-label="Close delivery status" onClick={() => setDeliveryOpen(false)} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5 text-[#54656f]" /></button><h2 className="font-semibold text-[#111b21]">Message delivery</h2></header><div className="overflow-y-auto p-4"><WhatsAppDeliveryPanel /></div></div>}
  </div>
}
