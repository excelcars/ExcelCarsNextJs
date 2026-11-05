'use client'

import { WHATSAPP_SENDING_ENABLED, WHATSAPP_PAUSED_MESSAGE } from '@/lib/whatsapp/sendingPolicy.mjs'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowDown, Check, CheckCheck, Clock3, RefreshCw, Send, File, Image as ImageIcon, Video, Mic, AlertCircle } from 'lucide-react'

export type Chat = { id: number | string; senderMobile: string; senderName: string | null; phoneNumberId: string; body: string; messageType?: string; direction?: string; receivedAt: string; unread: number }
type Entry = { key: string; messageId: number | null; body: string; direction: string; sentAt: string; status: string; messageType: string; mediaId: string | null; errorMessage: string | null; templateName?: string | null; templateLanguage?: string | null; buttonUrlSuffix?: string | null }
type Cursor = { before: string; beforeKey: string }
type PendingReply = { requestId: string; body: string; messageId: number }
const time = (value: string) => new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
const day = (value: string) => new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })
const statuses: Record<string, string> = { accepted: 'Accepted by WhatsApp', submitted: 'Submitted to Meta', sent: 'Sent', delivered: 'Delivered', read: 'Read', sending: 'Processing', failed: 'Failed', unknown: 'Unconfirmed' }

export function ChatAvatar({ name }: { name: string }) {
  const colors = ['bg-[#d6ebe4] text-[#527d70]', 'bg-[#e7def3] text-[#8b6cab]', 'bg-[#f7e4d6] text-[#ad805e]', 'bg-[#dce9f2] text-[#6086a4]']
  const initials = /^\d+$/.test(name) ? name.slice(-2) : name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const color = colors[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length]
  return <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-medium ${color}`}>{initials}</span>
}

function merge(current: Entry[], incoming: Entry[]) {
  const entries = new Map(current.map(entry => [entry.key, entry]))
  for (const entry of incoming) entries.set(entry.key, entry)
  return [...entries.values()].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime() || a.key.localeCompare(b.key))
}

export function WhatsAppConversation({ chat, onBack, onRead }: { chat: Chat; onBack: () => void; onRead: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [latestId, setLatestId] = useState<number | null>(null)
  const [windowCloses, setWindowCloses] = useState<string | null>(null)
  const [canReply, setCanReply] = useState(false)
  const [loading, setLoading] = useState(true)
  const [olderLoading, setOlderLoading] = useState(false)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [jumpVisible, setJumpVisible] = useState(false)
  const [pendingReply, setPendingReply] = useState<PendingReply | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const entriesRef = useRef<Entry[]>([])
  const initialized = useRef(false)
  const submitting = useRef(false)
  const readCallback = useRef(onRead)
  const scrollIntent = useRef<{ bottom?: boolean; top?: number; height?: number } | null>(null)
  const alive = useRef(true)
  useEffect(() => { readCallback.current = onRead }, [onRead])
  useEffect(() => { entriesRef.current = entries }, [entries])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  useLayoutEffect(() => {
    const element = scroll.current
    const intent = scrollIntent.current
    if (element && intent) {
      element.scrollTop = intent.bottom ? element.scrollHeight : (intent.top || 0) + element.scrollHeight - (intent.height || 0)
      scrollIntent.current = null
    }
  }, [entries])

  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    async function load() {
      if (pending) return
      pending = true
      try {
        const response = await fetch(`/api/messages/${chat.id}/conversation`, { signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load chat.')
        if (controller.signal.aborted) return
        const element = scroll.current
        const nearBottom = !element || element.scrollHeight - element.scrollTop - element.clientHeight < 120
        if (!initialized.current || nearBottom) scrollIntent.current = { bottom: true }
        if (!initialized.current) setCursor(data.nextCursor)
        initialized.current = true
        const incoming = data.entries as Entry[]
        const previous = entriesRef.current
        // If more than a page arrived while inactive, restart at the newest page so history has no hidden gap.
        const hasGap = previous.length > 0 && incoming.length > 0 && !incoming.some(entry => previous.some(item => item.key === entry.key))
        if (hasGap) setCursor(data.nextCursor)
        setEntries(current => hasGap ? incoming : merge(current, incoming))
        setLatestId(data.latestMessageId)
        setWindowCloses(data.replyWindowClosesAt)
        setCanReply(data.canReply)
        setError('')
        // Only mark messages up to the ID that was actually loaded, never newer unseen arrivals.
        if (data.latestMessageId) {
          const readResponse = await fetch(`/api/messages/${data.latestMessageId}/conversation`, { method: 'PATCH', signal: controller.signal })
          if (!readResponse.ok) throw new Error('Messages loaded, but the chat could not be marked as read.')
          const read = await readResponse.json()
          if (!controller.signal.aborted && read.markedRead) readCallback.current()
        }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load chat.') }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [chat.id, refresh])

  async function loadOlder() {
    if (!cursor || olderLoading) return
    setOlderLoading(true)
    try {
      const response = await fetch(`/api/messages/${chat.id}/conversation?${new URLSearchParams(cursor)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load older messages.')
      if (!alive.current) return
      const element = scroll.current
      scrollIntent.current = { top: element?.scrollTop || 0, height: element?.scrollHeight || 0 }
      setEntries(current => merge(current, data.entries))
      setCursor(data.nextCursor)
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Unable to load older messages.') }
    finally { if (alive.current) setOlderLoading(false) }
  }

  async function send() {
    if (submitting.current || !latestId || !body.trim() || !canReply || (windowCloses && Date.now() >= new Date(windowCloses).getTime())) return
    submitting.current = true
    setSending(true)
    setError('')
    const attempt = pendingReply || { requestId: crypto.randomUUID(), body: body.trim(), messageId: latestId }
    setPendingReply(attempt)
    try {
      const response = await fetch(`/api/messages/${attempt.messageId}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt) })
      const data = await response.json()
      if (!response.ok) {
        if ([400, 403, 404, 503].includes(response.status)) setPendingReply(null)
        throw new Error(data.error || 'Unable to confirm reply status.')
      }
      if (!alive.current) return
      const reply = data.reply
      scrollIntent.current = { bottom: true }
      setEntries(current => merge(current, [{ key: `out-${reply.id}`, messageId: attempt.messageId, body: reply.body, sentAt: reply.createdAt, direction: 'outgoing', status: reply.status, messageType: 'text', mediaId: null, errorMessage: reply.errorMessage }]))
      setPendingReply(null)
      setBody('')
      setRefresh(value => value + 1)
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Unable to confirm reply status. Retry this same reply to check its status.') }
    finally { submitting.current = false; if (alive.current) setSending(false) }
  }

  const replyOpen = WHATSAPP_SENDING_ENABLED && canReply && (!windowCloses || Date.now() < new Date(windowCloses).getTime())
  return <>
    <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-[#d9dfdb] bg-[#f0f2f5] px-3 md:px-5">
      <button onClick={onBack} aria-label="Back to chats" className="rounded-full p-2 text-[#54656f] hover:bg-[#e2e5e7] md:hidden"><ArrowLeft className="h-5 w-5" /></button>
      <ChatAvatar name={chat.senderName || chat.senderMobile} /><div className="min-w-0 flex-1"><h2 className="truncate text-[16px] font-medium text-[#111b21]">{chat.senderName || `+${chat.senderMobile}`}</h2><p className="mt-0.5 text-xs text-[#667781]">+{chat.senderMobile}</p></div>
      <button aria-label="Refresh conversation" title="Refresh conversation" onClick={() => setRefresh(value => value + 1)} className="rounded-full p-2 text-[#54656f] hover:bg-[#e2e5e7]"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
    </header>
    <div className="relative min-h-0 flex-1 bg-[#efeae2]" style={{ backgroundImage: 'radial-gradient(#c8c1b6 0.6px, transparent 0.6px)', backgroundSize: '22px 22px' }}>
      <div ref={scroll} onScroll={() => { const element = scroll.current; if (element) setJumpVisible(element.scrollHeight - element.scrollTop - element.clientHeight > 180) }} className="h-full overflow-y-auto px-4 py-5 md:px-8 lg:px-12" role="log" aria-label="Conversation messages" aria-busy={loading}>
        {cursor && <div className="mb-4 text-center"><button onClick={() => void loadOlder()} disabled={olderLoading} className="rounded-lg bg-white/90 px-4 py-2 text-xs font-medium text-[#008069] shadow-sm">{olderLoading ? 'Loading…' : 'Load older messages'}</button></div>}
        {loading && !entries.length && <p className="text-center text-sm text-[#667781]">Loading conversation…</p>}
        {entries.map((entry, index) => {
          const outgoing = entry.direction === 'outgoing'
          const mediaIcon = entry.messageType === 'video' ? <Video className="h-5 w-5" /> : entry.messageType === 'image' ? <ImageIcon className="h-5 w-5" /> : entry.messageType === 'audio' ? <Mic className="h-5 w-5" /> : <File className="h-5 w-5" />
          return <div key={entry.key}>
            {(index === 0 || day(entries[index - 1].sentAt) !== day(entry.sentAt)) && <div className="my-4 text-center"><span className="rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-[#54656f] shadow-sm">{day(entry.sentAt)}</span></div>}
            <div className={`mb-2 flex ${outgoing ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[90%] rounded-lg px-3 pb-1.5 pt-2 shadow-[0_1px_1px_#00000018] sm:max-w-[80%] lg:max-w-[72%] ${outgoing ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white'}`}>
              {entry.templateName && <div className="mb-2 border-b border-[#b7dbb2] pb-2"><p className="text-[11px] font-semibold text-[#008069]">Template · {entry.templateName}{entry.templateLanguage ? ` · ${entry.templateLanguage}` : ''}</p><p className="mt-0.5 text-[10px] text-[#667781]">Saved template details</p></div>}
              {entry.mediaId && <div className="mb-2 flex items-center gap-2 rounded-md bg-black/5 px-3 py-3 text-sm capitalize text-[#54656f]">{mediaIcon}<span>{entry.messageType} attachment<span className="block text-[11px] normal-case">Preview unavailable</span></span></div>}
              <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.55] text-[#111b21]">{entry.body === `[${entry.messageType}]` && entry.mediaId ? '' : entry.body}</p>
              {entry.buttonUrlSuffix && <div className="mt-2 border-t border-[#b7dbb2] pt-2"><p className="text-[10px] text-[#667781]">URL button parameter</p><p className="max-w-sm break-all text-xs text-[#008069]">{entry.buttonUrlSuffix}</p></div>}
              {entry.errorMessage && <p className="mt-2 max-w-sm text-xs text-red-700">{entry.errorMessage}</p>}
              <div className="ml-8 mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]"><span>{time(entry.sentAt)}</span>{outgoing && <span title={statuses[entry.status] || entry.status} aria-label={statuses[entry.status] || entry.status} className="flex items-center gap-1"><span>{statuses[entry.status] || entry.status}</span>{entry.status === 'read' || entry.status === 'delivered' ? <CheckCheck className={`h-3.5 w-3.5 ${entry.status === 'read' ? 'text-sky-500' : ''}`} /> : ['accepted', 'sent', 'submitted'].includes(entry.status) ? <Check className="h-3.5 w-3.5" /> : entry.status === 'failed' || entry.status === 'unknown' ? <AlertCircle className="h-3.5 w-3.5 text-red-600" /> : <Clock3 className="h-3 w-3" />}</span>}</div>
            </div></div>
          </div>
        })}
      </div>
      {jumpVisible && <button aria-label="Jump to latest message" onClick={() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight }} className="absolute bottom-4 right-4 rounded-full bg-white p-3 text-[#54656f] shadow-md"><ArrowDown className="h-5 w-5" /></button>}
    </div>
    {error && <p role="alert" className="shrink-0 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
    {pendingReply && !sending && <p className="shrink-0 bg-[#fff4ce] px-4 py-2 text-xs text-[#6b592d]">Reply status is unconfirmed. Use the send button to check the same reply before composing another.</p>}
    {!loading && !replyOpen && <p className="shrink-0 bg-[#fff4ce] px-4 py-2 text-xs text-[#6b592d]">{!WHATSAPP_SENDING_ENABLED ? WHATSAPP_PAUSED_MESSAGE : `${latestId ? 'The reply window has closed.' : 'No incoming customer message yet.'} Use an approved template or wait for a new customer message.`}</p>}
    <form onSubmit={event => { event.preventDefault(); void send() }} className="flex shrink-0 items-end gap-3 bg-[#f0f2f5] px-4 py-3">
      <textarea aria-label="Type a message" placeholder="Type a message" value={body} maxLength={4096} rows={1} disabled={sending || !!pendingReply || loading || !replyOpen} onChange={event => { setBody(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px` }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} className="max-h-[120px] min-h-11 min-w-0 flex-1 resize-none rounded-lg border-0 bg-white px-4 py-3 text-sm leading-5 text-[#111b21] outline-none placeholder:text-[#667781] disabled:opacity-60" />
      <button type="submit" disabled={sending || loading || !replyOpen || !body.trim()} aria-label={pendingReply ? 'Retry pending reply' : 'Send message'} title={pendingReply ? 'Check or retry the same reply' : 'Send message'} className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008f72] disabled:bg-[#c6d1cc]">{sending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
    </form>
  </>
}
