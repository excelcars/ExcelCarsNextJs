import { X } from 'lucide-react'
import { useState } from 'react'
import { Btn, Input, Modal } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { sendInventoryWhatsApp } from './actions'
import type { CustomerOption, Dealer, EmailProgressItem, EmailRecipient, InventoryRow } from './inventoryTypes'

interface InventoryEmailModalProps {
  row: InventoryRow | null
  rows: InventoryRow[]
  recipientType: 'customer' | 'dealer'
  dealerQuery: string
  dealerOpen: boolean
  selectedDealer: Dealer | null
  selectedCustomer: CustomerOption | null
  recipients: EmailRecipient[]
  editingRecipientEmailKey: string | null
  recipientEmailDraft: string
  recipientEmailError: string
  emailError: string
  sentMessage: string | null
  progress: EmailProgressItem[]
  emailConfigured: boolean
  isPending: boolean
  isSending: boolean
  dealerMatches: Dealer[]
  onClose: () => void
  onRecipientTypeChange: (type: 'customer' | 'dealer') => void
  onDealerQueryChange: (value: string) => void
  onDealerFocus: () => void
  onDealerSelect: (dealer: Dealer) => void
  onSelectedDealerClear: () => void
  onSelectedCustomerChange: (customer: CustomerOption | null) => void
  onAddRecipient: (recipient: EmailRecipient) => void
  onRemoveRecipient: (key: string) => void
  onEditRecipient: (recipient: EmailRecipient) => void
  onRecipientEmailDraftChange: (value: string) => void
  onSaveRecipientEmail: (recipient: EmailRecipient) => void
  onCancelRecipientEdit: () => void
  onSend: () => void
}

function emailSubject(row: InventoryRow) {
  const clean = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() || ''
  const vehicle = [
    clean(row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy),
    clean(row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy),
    clean(row.carVariantMaster?.variant ?? row.variantLegacy),
  ].filter(Boolean).join(' ')
  const colour = clean(row.colour)
  return ['Car Details', vehicle ? `for ${vehicle}` : '', colour ? `– ${colour}` : ''].filter(Boolean).join(' ')
}

export function InventoryEmailModal({
  row, rows, recipientType, dealerQuery, dealerOpen, selectedDealer, selectedCustomer,
  recipients, editingRecipientEmailKey, recipientEmailDraft, recipientEmailError,
  emailError, sentMessage, progress, emailConfigured, isPending, isSending, dealerMatches,
  onClose, onRecipientTypeChange, onDealerQueryChange, onDealerFocus, onDealerSelect,
  onSelectedDealerClear, onSelectedCustomerChange, onAddRecipient, onRemoveRecipient,
  onEditRecipient, onRecipientEmailDraftChange, onSaveRecipientEmail, onCancelRecipientEdit,
  onSend,
}: InventoryEmailModalProps) {
  const [directEmail, setDirectEmail] = useState('')
  const [directEmailError, setDirectEmailError] = useState('')
  const [whatsAppNumbers, setWhatsAppNumbers] = useState('')
  const [whatsAppMessage, setWhatsAppMessage] = useState('')
  const [whatsAppSending, setWhatsAppSending] = useState(false)
  const addCustomer = (customer: CustomerOption) => {
    onAddRecipient({ key: `customer-${customer.custId}`, recipientType: 'customer', recipientId: customer.custId, name: customer.custName, email: customer.custEmail, meta: customer.custMobile ?? 'Customer' })
    onSelectedCustomerChange(null)
  }
  const addDealer = () => {
    if (!selectedDealer) return
    onAddRecipient({ key: `dealer-${selectedDealer.dealerId}`, recipientType: 'dealer', recipientId: selectedDealer.dealerId, name: selectedDealer.dealerName ?? 'Dealer', email: selectedDealer.dealerEmail, meta: 'Dealer' })
    onSelectedDealerClear()
  }
  const addDirectEmail = () => {
    const email = directEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setDirectEmailError('Enter a valid email address.'); return }
    onAddRecipient({ key: `direct-${email}`, recipientType: 'direct', recipientId: 0, name: email, email, meta: 'Direct email' })
    setDirectEmail('')
    setDirectEmailError('')
  }
  const sendWhatsApp = async () => {
    if (!row) return
    const mobiles = whatsAppNumbers.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean)
    if (mobiles.length === 0) { setWhatsAppMessage('Enter at least one mobile number.'); return }
    setWhatsAppSending(true)
    setWhatsAppMessage('')
    try {
      const result = await sendInventoryWhatsApp(row.inventoryId, { mobiles })
      setWhatsAppMessage(result.success ? (result.message ?? 'WhatsApp submitted.') : (result.error ?? 'Could not send WhatsApp.'))
      if (result.success) setWhatsAppNumbers('')
    } finally {
      setWhatsAppSending(false)
    }
  }

  return (
    <Modal title={`Send Car Details${rows.length > 1 ? ` — ${rows.length} vehicles` : row ? ` — ${row.registrationNo ?? row.sku ?? ''}` : ''}`} open={!!row} onClose={onClose}>
      {row ? sentMessage ? (
        <div className="space-y-4">
          {rows.length > 1 ? <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-600">Email sent for these vehicles: {rows.map(item => item.registrationNo ?? item.inventoryNumber ?? `#${item.inventoryId}`).join(', ')}</div> : null}
          {progress.length > 0 ? <EmailProgress progress={progress} /> : null}
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{sentMessage}</div>
          <div className="flex justify-end"><Btn onClick={onClose}>Close</Btn></div>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.length === 1 ? <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5"><div className="text-xs font-medium uppercase tracking-wide text-[#1B2A6B]">Email subject</div><div className="mt-1 text-sm font-medium text-gray-800">{emailSubject(row)}</div><div className="mt-1 text-xs text-gray-500">Generated from the vehicle make, model, variant, and colour.</div></div> : <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs text-gray-600">A separate dynamic subject will be generated for each selected vehicle.</div>}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="text-xs font-medium uppercase tracking-wide text-gray-600">Direct email recipient</div><div className="mt-2 flex gap-2"><Input value={directEmail} onChange={event => { setDirectEmail(event.target.value); setDirectEmailError('') }} placeholder="name@example.com" disabled={isSending} /><Btn size="sm" onClick={addDirectEmail} disabled={isSending || !directEmail.trim()}>Add email</Btn></div>{directEmailError ? <div className="mt-1 text-xs text-red-600">{directEmailError}</div> : <div className="mt-1 text-xs text-gray-500">Add each email address, then send all recipients together.</div>}</div>
          {rows.length === 1 ? <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3"><div className="text-xs font-medium uppercase tracking-wide text-emerald-800">Direct WhatsApp</div><div className="mt-2 flex gap-2"><Input value={whatsAppNumbers} onChange={event => { setWhatsAppNumbers(event.target.value); setWhatsAppMessage('') }} placeholder="One or more mobile numbers" disabled={whatsAppSending} /><Btn size="sm" onClick={sendWhatsApp} disabled={whatsAppSending || !whatsAppNumbers.trim()}>{whatsAppSending ? 'Sending...' : 'Send WhatsApp'}</Btn></div><div className="mt-1 text-xs text-emerald-800">Separate multiple numbers with commas. The message includes a secure car-details link with photos.</div>{whatsAppMessage ? <div className={`mt-2 text-xs ${whatsAppMessage.toLowerCase().includes('submitted') ? 'text-green-700' : 'text-red-600'}`}>{whatsAppMessage}</div> : null}</div> : null}
          <div className="flex gap-1.5">{(['customer', 'dealer'] as const).map(type => <button key={type} type="button" onClick={() => onRecipientTypeChange(type)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${recipientType === type ? 'text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`} style={recipientType === type ? { backgroundColor: '#1B2A6B' } : {}}>{type}</button>)}</div>
          {recipients.length > 0 ? <div className="space-y-2"><div className="text-xs font-medium uppercase tracking-wide text-gray-500">Recipients</div>{recipients.map(recipient => <div key={recipient.key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-medium text-gray-800">{recipient.name}</div><div className="text-xs text-gray-500">{recipient.meta}{recipient.email ? ` · ${recipient.email}` : ''}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => onEditRecipient(recipient)} className="text-xs font-medium text-[#1B2A6B] hover:underline">{recipient.email ? 'Update email' : 'Add email'}</button><button type="button" onClick={() => onRemoveRecipient(recipient.key)} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button></div></div>{editingRecipientEmailKey === recipient.key ? <div className="mt-3 flex flex-wrap items-start gap-2"><div className="min-w-52 flex-1"><input type="email" autoFocus value={recipientEmailDraft} onChange={event => onRecipientEmailDraftChange(event.target.value)} placeholder="Email address" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B]" />{recipientEmailError ? <div className="mt-1 text-xs text-red-600">{recipientEmailError}</div> : null}</div><Btn size="sm" onClick={() => onSaveRecipientEmail(recipient)} disabled={isPending}>Save email</Btn><Btn size="sm" variant="outline" onClick={onCancelRecipientEdit} disabled={isPending}>Cancel</Btn></div> : null}</div>)}</div> : null}
          {recipientType === 'customer' ? <div className="space-y-2">{row.customer ? <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5"><div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#1B2A6B]">Suggested linked customer</div><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800">{row.customer.custName}</div><div className="truncate text-xs text-gray-500">{row.customer.custMobile ?? '—'}{row.customer.custEmail ? ` · ${row.customer.custEmail}` : ''}</div></div><Btn size="sm" onClick={() => addCustomer({ custId: row.customer!.custId, custName: row.customer!.custName, custMobile: row.customer!.custMobile, custEmail: row.customer!.custEmail })} disabled={recipients.some(item => item.key === `customer-${row.customer!.custId}`)}>{recipients.some(item => item.key === `customer-${row.customer!.custId}`) ? 'Added' : 'Add'}</Btn></div></div> : null}<CustomerPicker value={selectedCustomer} onChange={onSelectedCustomerChange} /><div className="text-xs text-gray-500">Search to add another customer, or choose “Create new customer” when no record exists.</div></div> : <div className="relative">{selectedDealer ? <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"><div><div className="text-sm font-medium text-gray-800">{selectedDealer.dealerName}</div><div className="text-xs text-gray-500">{selectedDealer.dealerEmail}</div></div><div className="flex items-center gap-2"><Btn size="sm" onClick={addDealer}>Add</Btn><button type="button" onClick={onSelectedDealerClear} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button></div></div> : <><Input placeholder="Search and add another dealer..." value={dealerQuery} onChange={event => onDealerQueryChange(event.target.value)} onFocus={onDealerFocus} />{dealerOpen ? <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">{dealerMatches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No matches</div> : dealerMatches.map(dealer => <button key={dealer.dealerId} type="button" onClick={() => onDealerSelect(dealer)} className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-0"><div className="font-medium text-gray-800">{dealer.dealerName}</div><div className="text-xs text-gray-500">{dealer.dealerEmail}</div></button>)}</div> : null}</>}</div>}
          {emailError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</div> : null}
          {!emailConfigured && !emailError ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Email is not configured yet. Add <span className="font-mono">SMTP_HOST</span>, <span className="font-mono">SMTP_USER</span>, <span className="font-mono">SMTP_PASSWORD</span> and <span className="font-mono">EMAIL_FROM_ADDRESS</span> to the environment before sending.</div> : null}
          <div className="flex justify-end gap-3 pt-2"><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={onSend} disabled={isPending || isSending || !emailConfigured || recipients.length === 0}>{isSending ? 'Sending...' : `Send Email${recipients.length > 0 ? ` (${recipients.length})` : ''}`}</Btn></div>
        </div>
      ) : null}
    </Modal>
  )
}

function EmailProgress({ progress }: { progress: EmailProgressItem[] }) {
  const complete = progress.filter(item => item.status === 'sent' || item.status === 'failed').length
  return <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"><div className="flex items-center justify-between text-xs font-medium text-gray-600"><span>{progress.some(item => item.status === 'sending') ? `Sending ${progress.findIndex(item => item.status === 'sending') + 1} of ${progress.length} vehicles` : 'Email sending completed'}</span><span>{complete} of {progress.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#1B2A6B] transition-all" style={{ width: `${(complete / progress.length) * 100}%` }} /></div><div className="space-y-1 text-xs">{progress.map(item => <div key={item.inventoryId} className="flex items-center justify-between gap-3"><span className="truncate">{item.label}</span><span className={item.status === 'sent' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : item.status === 'sending' ? 'text-blue-600' : 'text-gray-400'}>{item.status === 'sent' ? 'Sent' : item.status === 'failed' ? `Failed${item.error ? `: ${item.error}` : ''}` : item.status === 'sending' ? 'Sending...' : 'Waiting'}</span></div>)}</div></div>
}
