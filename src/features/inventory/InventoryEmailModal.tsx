import { Mail, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Btn, Input, Modal } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { sendInventoryEmail, sendInventoryWhatsApp } from './actions'
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

type WhatsAppRecipient = { key: string; name: string; mobile: string; source: 'Customer' | 'Dealer' }
type InterestedInquiry = { inquiryId: number; inquiryNo: string | null; name: string; mobile: string | null; email: string | null; status: string | null }

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
  const [whatsAppRecipients, setWhatsAppRecipients] = useState<WhatsAppRecipient[]>([])
  const [whatsAppContactType, setWhatsAppContactType] = useState<'customer' | 'dealer'>('customer')
  const [activeChannel, setActiveChannel] = useState<'email' | 'whatsapp' | 'direct' | 'multiple' | 'interested'>('email')
  const [selectedInterestedIds, setSelectedInterestedIds] = useState<number[]>([])
  const [interestedSending, setInterestedSending] = useState<'email' | 'whatsapp' | null>(null)
  const [interestedMessage, setInterestedMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    setActiveChannel('email')
    setSelectedInterestedIds([])
    setInterestedMessage(null)
    if (row) return

    // These fields belong to this modal (rather than the inventory page), so
    // clear them explicitly when the parent closes the modal.
    setDirectEmail('')
    setDirectEmailError('')
    setWhatsAppNumbers('')
    setWhatsAppMessage('')
    setWhatsAppRecipients([])
    setWhatsAppContactType('customer')
  }, [row?.inventoryId])
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
    const mobiles = [...whatsAppRecipients.map(recipient => recipient.mobile), ...whatsAppNumbers.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean)]
    if (mobiles.length === 0) { setWhatsAppMessage('Enter at least one mobile number.'); return }
    setWhatsAppSending(true)
    setWhatsAppMessage('')
    try {
      const result = await sendInventoryWhatsApp(row.inventoryId, { mobiles })
      setWhatsAppMessage(result.success ? (result.message ?? 'WhatsApp submitted.') : (result.error ?? 'Could not send WhatsApp.'))
      if (result.success) { setWhatsAppNumbers(''); setWhatsAppRecipients([]) }
    } finally {
      setWhatsAppSending(false)
    }
  }

  const addWhatsAppRecipient = (recipient: WhatsAppRecipient) => {
    if (!recipient.mobile.trim()) { setWhatsAppMessage(`${recipient.name} does not have a mobile number saved.`); return }
    setWhatsAppRecipients(current => current.some(item => item.key === recipient.key) ? current : [...current, recipient])
    setWhatsAppMessage('')
  }

  const addPickedWhatsAppCustomer = (customer: CustomerOption | null) => {
    if (!customer) {
      onSelectedCustomerChange(null)
      return
    }
    if (!customer.custMobile?.trim()) {
      setWhatsAppMessage(`${customer.custName} does not have a mobile number saved.`)
      onSelectedCustomerChange(null)
      return
    }
    addWhatsAppRecipient({ key: `customer-${customer.custId}`, name: customer.custName, mobile: customer.custMobile, source: 'Customer' })
    onSelectedCustomerChange(null)
  }

  const addSelectedWhatsAppDealer = () => {
    if (!selectedDealer) return
    if (!selectedDealer.dealerMobileNo?.trim()) {
      setWhatsAppMessage(`${selectedDealer.dealerName ?? 'This dealer'} does not have a mobile number saved.`)
      return
    }
    addWhatsAppRecipient({ key: `dealer-${selectedDealer.dealerId}`, name: selectedDealer.dealerName ?? 'Dealer', mobile: selectedDealer.dealerMobileNo ?? '', source: 'Dealer' })
    onSelectedDealerClear()
  }

  const addPickedEmailDealer = (dealer: Dealer) => {
    onDealerSelect(dealer)
    onAddRecipient({ key: `dealer-${dealer.dealerId}`, recipientType: 'dealer', recipientId: dealer.dealerId, name: dealer.dealerName ?? 'Dealer', email: dealer.dealerEmail, meta: 'Dealer' })
    onSelectedDealerClear()
  }

  const addPickedWhatsAppDealer = (dealer: Dealer) => {
    onDealerSelect(dealer)
    addWhatsAppRecipient({ key: `dealer-${dealer.dealerId}`, name: dealer.dealerName ?? 'Dealer', mobile: dealer.dealerMobileNo ?? '', source: 'Dealer' })
    onSelectedDealerClear()
  }

  const linkedCustomer = row?.customer
  const directPanel = <div className="space-y-5"><div><div className="text-lg font-semibold text-gray-900">Direct email</div><p className="mt-1 text-sm text-gray-600">Add one or more email addresses manually, then review them before sending.</p></div><div className="rounded-xl border border-gray-200 bg-gray-50 p-4"><label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Email address</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input value={directEmail} onChange={event => { setDirectEmail(event.target.value); setDirectEmailError('') }} placeholder="name@example.com" disabled={isSending} /><Btn onClick={addDirectEmail} disabled={isSending || !directEmail.trim()}>Add recipient</Btn></div>{directEmailError ? <div className="mt-2 text-xs text-red-600">{directEmailError}</div> : <div className="mt-2 text-xs text-gray-500">You can add addresses one at a time.</div>}</div><div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3"><span className="text-sm text-gray-700">{recipients.filter(item => item.recipientType === 'direct').length} direct recipient{recipients.filter(item => item.recipientType === 'direct').length === 1 ? '' : 's'} added</span><Btn size="sm" variant="outline" onClick={() => setActiveChannel('email')} disabled={recipients.length === 0}>Review email</Btn></div></div>
  const multiplePanel = <div className="space-y-5"><div><div className="text-lg font-semibold text-gray-900">Multiple recipients</div><p className="mt-1 text-sm text-gray-600">Build an email list from saved customers and dealers. Each selection is added to your draft.</p></div><div className="flex gap-2 rounded-lg bg-gray-100 p-1">{(['customer', 'dealer'] as const).map(type => <button key={type} type="button" onClick={() => onRecipientTypeChange(type)} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold capitalize transition ${recipientType === type ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{type}</button>)}</div>{recipientType === 'customer' ? <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">{row?.customer ? <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800">{row.customer.custName}</div><div className="truncate text-xs text-gray-500">{row.customer.custMobile ?? '—'}{row.customer.custEmail ? ` · ${row.customer.custEmail}` : ''}</div></div><Btn size="sm" onClick={() => addCustomer({ custId: row.customer!.custId, custName: row.customer!.custName, custMobile: row.customer!.custMobile, custEmail: row.customer!.custEmail })} disabled={recipients.some(item => item.key === `customer-${row.customer!.custId}`)}>{recipients.some(item => item.key === `customer-${row.customer!.custId}`) ? 'Added' : 'Add'}</Btn></div> : null}<CustomerPicker value={selectedCustomer} onChange={customer => { if (customer) addCustomer(customer); else onSelectedCustomerChange(null) }} /><div className="text-xs text-gray-500">Search and select another customer to add them.</div></div> : <div className="relative rounded-xl border border-blue-100 bg-blue-50/40 p-4">{selectedDealer ? <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800">{selectedDealer.dealerName}</div><div className="truncate text-xs text-gray-500">{selectedDealer.dealerEmail ?? 'No email address'}</div></div><div className="flex items-center gap-2"><Btn size="sm" onClick={addDealer}>Add</Btn><button type="button" onClick={onSelectedDealerClear} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button></div></div> : <><Input placeholder="Search dealer by name..." value={dealerQuery} onChange={event => onDealerQueryChange(event.target.value)} onFocus={onDealerFocus} />{dealerOpen ? <div className="absolute z-10 mt-1 max-h-56 w-[calc(100%-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">{dealerMatches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No matches</div> : dealerMatches.map(dealer => <button key={dealer.dealerId} type="button" onClick={() => addPickedEmailDealer(dealer)} className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-0"><div className="font-medium text-gray-800">{dealer.dealerName}</div><div className="text-xs text-gray-500">{dealer.dealerEmail ?? 'No email address'}</div></button>)}</div> : null}</>}</div>}<div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-4 py-3"><span className="text-sm text-gray-700">{recipients.length} recipient{recipients.length === 1 ? '' : 's'} in your draft</span><Btn size="sm" variant="outline" onClick={() => setActiveChannel('email')} disabled={recipients.length === 0}>Review email</Btn></div></div>
  void directPanel
  void multiplePanel
  const interestedInquiries: InterestedInquiry[] = (row?.inquiryInventoryLinks ?? []).map(link => ({
    inquiryId: link.inquiryId,
    inquiryNo: link.inquiry.inquiryNo,
    name: link.inquiry.customer?.custName ?? link.inquiry.customerNameLegacy ?? 'Unnamed enquiry',
    mobile: link.inquiry.customer?.custMobile ?? link.inquiry.mobileno,
    email: link.inquiry.customer?.custEmail ?? link.inquiry.email,
    status: link.inquiry.status,
  }))
  const selectedInterested = interestedInquiries.filter(item => selectedInterestedIds.includes(item.inquiryId))
  const sendInterestedEmail = async () => {
    if (!row) return
    const emailRecipients = selectedInterested.filter(item => item.email?.trim()).map(item => ({
      key: `inquiry-${item.inquiryId}-${item.email!.trim().toLowerCase()}`,
      recipientType: 'direct', recipientId: 0, name: item.name, email: item.email, meta: item.inquiryNo ?? 'Interested enquiry',
    } as EmailRecipient))
    if (emailRecipients.length === 0) return
    setInterestedSending('email')
    setInterestedMessage(null)
    try {
      const result = await sendInventoryEmail(row.inventoryId, { recipients: emailRecipients })
      setInterestedMessage({ ok: result.success, text: result.message ?? result.error ?? 'Could not send email.' })
    } finally {
      setInterestedSending(null)
    }
  }
  const sendInterestedWhatsApp = async () => {
    if (!row) return
    const mobiles = selectedInterested.map(item => item.mobile?.trim()).filter((mobile): mobile is string => Boolean(mobile))
    if (mobiles.length === 0) return
    setInterestedSending('whatsapp')
    setInterestedMessage(null)
    try {
      const result = await sendInventoryWhatsApp(row.inventoryId, { mobiles })
      setInterestedMessage({ ok: result.success, text: result.message ?? result.error ?? 'Could not send WhatsApp.' })
    } finally {
      setInterestedSending(null)
    }
  }
  const interestedPanel = <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
    <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-gray-900">Interested enquiries</div><p className="mt-1 text-sm text-gray-600">Select one or more people who enquired about this vehicle, then add them to Email or WhatsApp recipients.</p></div>{interestedInquiries.length > 0 ? <button type="button" onClick={() => setSelectedInterestedIds(selectedInterestedIds.length === interestedInquiries.length ? [] : interestedInquiries.map(item => item.inquiryId))} className="shrink-0 text-xs font-semibold text-violet-700 hover:underline">{selectedInterestedIds.length === interestedInquiries.length ? 'Clear all' : 'Select all'}</button> : null}</div>
    <div className="mt-4 overflow-hidden rounded-lg border border-violet-100 bg-white">
      {interestedInquiries.length === 0 ? <div className="px-4 py-8 text-center text-sm text-gray-500">No interested enquiries have been received for this vehicle yet.</div> : <div className="divide-y divide-violet-50">{interestedInquiries.map(item => <label key={item.inquiryId} className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-violet-50/60"><input type="checkbox" checked={selectedInterestedIds.includes(item.inquiryId)} onChange={() => setSelectedInterestedIds(current => current.includes(item.inquiryId) ? current.filter(id => id !== item.inquiryId) : [...current, item.inquiryId])} className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2"><span className="font-medium text-gray-900">{item.name}</span>{item.inquiryNo ? <span className="font-mono text-xs text-gray-500">{item.inquiryNo}</span> : null}{item.status ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{item.status}</span> : null}</span><span className="mt-1 block text-xs text-gray-500">{item.mobile ?? 'No mobile'}{item.email ? ` · ${item.email}` : ' · No email'}</span></span></label>)}</div>}
    </div>
    {selectedInterested.length > 0 ? <div className="mt-4 space-y-3 rounded-lg border border-violet-200 bg-white/80 px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-medium text-violet-950">{selectedInterested.length} selected</span><div className="flex flex-wrap gap-2"><Btn size="sm" variant="outline" onClick={() => void sendInterestedEmail()} disabled={!emailConfigured || interestedSending !== null || !selectedInterested.some(item => item.email?.trim())}>{interestedSending === 'email' ? 'Sending email…' : `Send Email (${selectedInterested.filter(item => item.email?.trim()).length})`}</Btn><Btn size="sm" onClick={() => void sendInterestedWhatsApp()} disabled={interestedSending !== null || !selectedInterested.some(item => item.mobile?.trim())}>{interestedSending === 'whatsapp' ? 'Sending WhatsApp…' : `Send WhatsApp (${selectedInterested.filter(item => item.mobile?.trim()).length})`}</Btn></div></div>{interestedMessage ? <div className={`rounded-md px-3 py-2 text-sm ${interestedMessage.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{interestedMessage.text}</div> : null}</div> : null}
  </div>
  const whatsAppPanel = <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><MessageCircle className="h-5 w-5" /></span><div><div className="text-sm font-semibold text-gray-900">Share via WhatsApp</div><p className="mt-1 text-sm text-gray-600">Send a secure vehicle-details link, including photos, to saved contacts or manual numbers.</p></div></div>
    <div className="mt-5 rounded-lg border border-emerald-100 bg-white/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Add saved contact</div>
      <div className="mt-2 flex gap-1.5">{(['customer', 'dealer'] as const).map(type => <button key={type} type="button" onClick={() => setWhatsAppContactType(type)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${whatsAppContactType === type ? 'bg-emerald-700 text-white' : 'border border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50'}`}>{type}</button>)}</div>
      {whatsAppContactType === 'customer' ? <div className="mt-3 space-y-2">{linkedCustomer ? <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-3 py-2"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800">{linkedCustomer.custName}</div><div className="text-xs text-gray-500">{linkedCustomer.custMobile ?? 'No mobile number'}</div></div><Btn size="sm" onClick={() => addWhatsAppRecipient({ key: `customer-${linkedCustomer!.custId}`, name: linkedCustomer!.custName, mobile: linkedCustomer!.custMobile ?? '', source: 'Customer' })} disabled={whatsAppRecipients.some(item => item.key === `customer-${linkedCustomer!.custId}`)}>Add</Btn></div> : null}<CustomerPicker value={selectedCustomer} onChange={addPickedWhatsAppCustomer} /><div className="text-xs text-emerald-800">Selecting a customer adds their saved mobile number immediately.</div></div> : <div className="relative mt-3">{selectedDealer ? <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800">{selectedDealer.dealerName}</div><div className="text-xs text-gray-500">{selectedDealer.dealerMobileNo ?? 'No mobile number'}</div></div><div className="flex items-center gap-2"><Btn size="sm" onClick={addSelectedWhatsAppDealer} disabled={whatsAppRecipients.some(item => item.key === `dealer-${selectedDealer.dealerId}`)}>Add</Btn><button type="button" onClick={onSelectedDealerClear} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button></div></div> : <><Input placeholder="Search dealer by name or mobile..." value={dealerQuery} onChange={event => onDealerQueryChange(event.target.value)} onFocus={onDealerFocus} />{dealerOpen ? <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">{dealerMatches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No dealers found</div> : dealerMatches.map(dealer => <button key={dealer.dealerId} type="button" onClick={() => addPickedWhatsAppDealer(dealer)} className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-emerald-50 last:border-0"><div className="font-medium text-gray-800">{dealer.dealerName}</div><div className="text-xs text-gray-500">{dealer.dealerMobileNo ?? 'No mobile number'}</div></button>)}</div> : null}</>}</div>}
    </div>
    {whatsAppRecipients.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{whatsAppRecipients.map(recipient => <span key={recipient.key} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-emerald-900"><span>{recipient.name} · {recipient.mobile}</span><button type="button" onClick={() => setWhatsAppRecipients(current => current.filter(item => item.key !== recipient.key))} aria-label={`Remove ${recipient.name}`} className="ml-1 text-emerald-700 hover:text-red-600"><X className="h-3.5 w-3.5" /></button></span>)}</div> : null}
    <div className="mt-5"><label className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Or enter WhatsApp numbers</label><div className="mt-2 flex gap-2"><Input value={whatsAppNumbers} onChange={event => { setWhatsAppNumbers(event.target.value); setWhatsAppMessage('') }} placeholder="e.g. 9876543210, 9876543211" disabled={whatsAppSending} /><Btn onClick={sendWhatsApp} disabled={whatsAppSending || (!whatsAppNumbers.trim() && whatsAppRecipients.length === 0)}>{whatsAppSending ? 'Sending...' : 'Send WhatsApp'}</Btn></div><p className="mt-2 text-xs text-emerald-800">Separate manual numbers with commas, spaces, or new lines. Up to 20 recipients.</p>{whatsAppMessage ? <div className={`mt-3 rounded-md px-3 py-2 text-sm ${whatsAppMessage.toLowerCase().includes('submitted') ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>{whatsAppMessage}</div> : null}</div>
    <div className="mt-5 flex justify-end"><Btn variant="outline" onClick={onClose}>Close</Btn></div>
  </div>

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
          <div className="grid grid-cols-3 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Delivery channel">
            <button type="button" role="tab" aria-selected={activeChannel === 'email'} onClick={() => setActiveChannel('email')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeChannel === 'email' ? 'bg-white text-[#1B2A6B] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}><Mail className="h-4 w-4" />Email</button>
            <button type="button" role="tab" aria-selected={activeChannel === 'whatsapp'} onClick={() => setActiveChannel('whatsapp')} disabled={rows.length !== 1} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeChannel === 'whatsapp' ? 'bg-[#e8f7f0] text-emerald-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'} disabled:cursor-not-allowed disabled:opacity-45`}><MessageCircle className="h-4 w-4" />WhatsApp</button>
            <button type="button" role="tab" aria-selected={activeChannel === 'interested'} onClick={() => setActiveChannel('interested')} disabled={rows.length !== 1} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeChannel === 'interested' ? 'bg-violet-100 text-violet-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'} disabled:cursor-not-allowed disabled:opacity-45`}>Interested</button>
          </div>
          {activeChannel === 'email' ? <>
          {rows.length === 1 ? <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5"><div className="text-xs font-medium uppercase tracking-wide text-[#1B2A6B]">Email subject</div><div className="mt-1 text-sm font-medium text-gray-800">{emailSubject(row)}</div><div className="mt-1 text-xs text-gray-500">Generated from the vehicle make, model, variant, and colour.</div></div> : <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs text-gray-600">A separate dynamic subject will be generated for each selected vehicle.</div>}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="text-xs font-medium uppercase tracking-wide text-gray-600">Direct email recipient</div><div className="mt-2 flex gap-2"><Input value={directEmail} onChange={event => { setDirectEmail(event.target.value); setDirectEmailError('') }} placeholder="name@example.com" disabled={isSending} /><Btn size="sm" onClick={addDirectEmail} disabled={isSending || !directEmail.trim()}>Add email</Btn></div>{directEmailError ? <div className="mt-1 text-xs text-red-600">{directEmailError}</div> : <div className="mt-1 text-xs text-gray-500">Add each email address, then send all recipients together.</div>}</div>
          <div className="flex gap-1.5">{(['customer', 'dealer'] as const).map(type => <button key={type} type="button" onClick={() => onRecipientTypeChange(type)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${recipientType === type ? 'text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`} style={recipientType === type ? { backgroundColor: '#1B2A6B' } : {}}>{type}</button>)}</div>
          {recipients.length > 0 ? <div className="space-y-2"><div className="text-xs font-medium uppercase tracking-wide text-gray-500">Recipients</div>{recipients.map(recipient => <div key={recipient.key} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-medium text-gray-800">{recipient.name}</div><div className="text-xs text-gray-500">{recipient.meta}{recipient.email ? ` · ${recipient.email}` : ''}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => onEditRecipient(recipient)} className="text-xs font-medium text-[#1B2A6B] hover:underline">{recipient.email ? 'Update email' : 'Add email'}</button><button type="button" onClick={() => onRemoveRecipient(recipient.key)} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button></div></div>{editingRecipientEmailKey === recipient.key ? <div className="mt-3 flex flex-wrap items-start gap-2"><div className="min-w-52 flex-1"><input type="email" autoFocus value={recipientEmailDraft} onChange={event => onRecipientEmailDraftChange(event.target.value)} placeholder="Email address" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B]" />{recipientEmailError ? <div className="mt-1 text-xs text-red-600">{recipientEmailError}</div> : null}</div><Btn size="sm" onClick={() => onSaveRecipientEmail(recipient)} disabled={isPending}>Save email</Btn><Btn size="sm" variant="outline" onClick={onCancelRecipientEdit} disabled={isPending}>Cancel</Btn></div> : null}</div>)}</div> : null}
          {recipientType === 'customer' ? <div className="space-y-2">{row.customer ? <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5"><div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#1B2A6B]">Suggested linked customer</div><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800">{row.customer.custName}</div><div className="truncate text-xs text-gray-500">{row.customer.custMobile ?? '—'}{row.customer.custEmail ? ` · ${row.customer.custEmail}` : ''}</div></div><Btn size="sm" onClick={() => addCustomer({ custId: row.customer!.custId, custName: row.customer!.custName, custMobile: row.customer!.custMobile, custEmail: row.customer!.custEmail })} disabled={recipients.some(item => item.key === `customer-${row.customer!.custId}`)}>{recipients.some(item => item.key === `customer-${row.customer!.custId}`) ? 'Added' : 'Add'}</Btn></div></div> : null}<CustomerPicker value={selectedCustomer} onChange={customer => { if (customer) addCustomer(customer); else onSelectedCustomerChange(null) }} /><div className="text-xs text-gray-500">Selecting a customer adds them to the email recipients immediately.</div></div> : <div className="relative">{selectedDealer ? <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"><div><div className="text-sm font-medium text-gray-800">{selectedDealer.dealerName}</div><div className="text-xs text-gray-500">{selectedDealer.dealerEmail}</div></div><div className="flex items-center gap-2"><Btn size="sm" onClick={addDealer}>Add</Btn><button type="button" onClick={onSelectedDealerClear} className="text-gray-400 hover:text-red-600"><X className="h-4 w-4" /></button></div></div> : <><Input placeholder="Search and add another dealer..." value={dealerQuery} onChange={event => onDealerQueryChange(event.target.value)} onFocus={onDealerFocus} />{dealerOpen ? <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">{dealerMatches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No matches</div> : dealerMatches.map(dealer => <button key={dealer.dealerId} type="button" onClick={() => addPickedEmailDealer(dealer)} className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm hover:bg-gray-50 last:border-0"><div className="font-medium text-gray-800">{dealer.dealerName}</div><div className="text-xs text-gray-500">{dealer.dealerEmail}</div></button>)}</div> : null}</>}</div>}
          {emailError ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</div> : null}
          {!emailConfigured && !emailError ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Email is not configured yet. Add <span className="font-mono">SMTP_HOST</span>, <span className="font-mono">SMTP_USER</span>, <span className="font-mono">SMTP_PASSWORD</span> and <span className="font-mono">EMAIL_FROM_ADDRESS</span> to the environment before sending.</div> : null}
          <div className="flex justify-end gap-3 pt-2"><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={onSend} disabled={isPending || isSending || !emailConfigured || recipients.length === 0}>{isSending ? 'Sending...' : `Send Email${recipients.length > 0 ? ` (${recipients.length})` : ''}`}</Btn></div>
          </> : activeChannel === 'whatsapp' ? whatsAppPanel : interestedPanel}
        </div>
      ) : null}
    </Modal>
  )
}

function EmailProgress({ progress }: { progress: EmailProgressItem[] }) {
  const complete = progress.filter(item => item.status === 'sent' || item.status === 'failed').length
  return <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"><div className="flex items-center justify-between text-xs font-medium text-gray-600"><span>{progress.some(item => item.status === 'sending') ? `Sending ${progress.findIndex(item => item.status === 'sending') + 1} of ${progress.length} vehicles` : 'Email sending completed'}</span><span>{complete} of {progress.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#1B2A6B] transition-all" style={{ width: `${(complete / progress.length) * 100}%` }} /></div><div className="space-y-1 text-xs">{progress.map(item => <div key={item.inventoryId} className="flex items-center justify-between gap-3"><span className="truncate">{item.label}</span><span className={item.status === 'sent' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : item.status === 'sending' ? 'text-blue-600' : 'text-gray-400'}>{item.status === 'sent' ? 'Sent' : item.status === 'failed' ? `Failed${item.error ? `: ${item.error}` : ''}` : item.status === 'sending' ? 'Sending...' : 'Waiting'}</span></div>)}</div></div>
}
