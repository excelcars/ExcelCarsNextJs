'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Send, X, Paperclip, History } from 'lucide-react'
import { Badge, Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createTemplate, updateTemplate, deleteTemplate, findMessageRecipients, getTemplateDeliveryHistory, sendTemplateEmail, type TemplateFormInput } from './actions'
import { MESSAGE_TYPES } from './queries'
import { RECIPIENT_GROUPS, type RecipientGroup, type RecipientOption } from './recipients'
import { RichTextEditor } from './RichTextEditor'

interface TemplateRow {
  typeId: number
  messageType: string | null
  messageSubject: string | null
  messageBody: string | null
}
interface AttachmentRow { uploadId: string; originalName: string; byteSize: number; scope: string }
interface DeliveryRow { deliveryLogId: number; recipientEmail: string; status: string; errorMessage: string | null; attachmentCount: number; attemptedAt: Date | string }

function emptyForm(): TemplateFormInput {
  return { messageType: 'Email', messageSubject: '', messageBody: '' }
}

export function TemplatesClient({ initialData }: { initialData: TemplateRow[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<TemplateFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isSearchingRecipients, startRecipientSearch] = useTransition()

  const [sendRow, setSendRow] = useState<TemplateRow | null>(null)
  const [toEmail, setToEmail] = useState('')
  const [recipientGroup, setRecipientGroup] = useState<RecipientGroup>('Customers')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientRows, setRecipientRows] = useState<RecipientOption[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientOption[]>([])
  const [recipientError, setRecipientError] = useState('')
  const [sendError, setSendError] = useState('')
  const [sendResult, setSendResult] = useState<{ sentCount: number; failedRecipients: string[] } | null>(null)
  const [attachmentTemplate, setAttachmentTemplate] = useState<TemplateRow | null>(null)
  const [templateAttachments, setTemplateAttachments] = useState<AttachmentRow[]>([])
  const [sendAttachments, setSendAttachments] = useState<AttachmentRow[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [historyTemplate, setHistoryTemplate] = useState<TemplateRow | null>(null)
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryRow[]>([])
  const [historyError, setHistoryError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(r => {
      const matches = !q || (r.messageSubject ?? '').toLowerCase().includes(q) || (r.messageBody ?? '').toLowerCase().includes(q)
      return matches && (filterType === 'All' || r.messageType === filterType)
    })
  }, [data, search, filterType])

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setError(''); setModal('add') }
  const openEdit = (r: TemplateRow) => {
    setForm({ messageType: r.messageType ?? 'Email', messageSubject: r.messageSubject ?? '', messageBody: r.messageBody ?? '' })
    setEditId(r.typeId)
    setError('')
    setModal('edit')
  }

  const f = <K extends keyof TemplateFormInput>(k: K, v: TemplateFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateTemplate(editId, form) : await createTemplate(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setModal(null)
      window.location.reload()
    })
  }

  const openSend = (r: TemplateRow) => {
    setSendRow(r)
    setToEmail('')
    setRecipientGroup('Customers')
    setRecipientSearch('')
    setRecipientRows([])
    setSelectedRecipients([])
    setRecipientError('')
    setSendError('')
    setSendResult(null)
    setSendAttachments([])
    setAttachmentError('')
    setPreviewOpen(false)
    void loadAttachments(r.typeId).then(rows => setTemplateAttachments(rows.filter(file => file.scope === 'template'))).catch(() => setAttachmentError('Could not load saved attachments.'))
  }

  const loadAttachments = async (templateId: number) => {
    const res = await fetch(`/api/message-attachments?templateId=${templateId}`)
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error ?? 'Could not load attachments.')
    return payload as AttachmentRow[]
  }
  const openAttachments = async (row: TemplateRow) => {
    setAttachmentTemplate(row); setTemplateAttachments([]); setAttachmentError('')
    try { setTemplateAttachments((await loadAttachments(row.typeId)).filter(file => file.scope === 'template')) } catch (error) { setAttachmentError(error instanceof Error ? error.message : 'Could not load attachments.') }
  }
  const openHistory = async (row: TemplateRow) => {
    setHistoryTemplate(row); setDeliveryHistory([]); setHistoryError('')
    try { setDeliveryHistory(await getTemplateDeliveryHistory(row.typeId)) } catch { setHistoryError('Could not load delivery history.') }
  }
  const uploadAttachments = async (files: FileList | null, scope: 'template' | 'send') => {
    const templateId = scope === 'template' ? attachmentTemplate?.typeId : sendRow?.typeId
    if (!files?.length || !templateId) return
    setAttachmentError('')
    const formData = new FormData(); formData.set('templateId', String(templateId)); formData.set('scope', scope)
    Array.from(files).forEach(file => formData.append('files', file))
    const res = await fetch('/api/message-attachments', { method: 'POST', body: formData })
    const payload = await res.json()
    if (!res.ok) { setAttachmentError(payload.error ?? 'Upload failed.'); return }
    if (scope === 'template') setTemplateAttachments(current => [...current, ...payload.uploads])
    else setSendAttachments(current => [...current, ...payload.uploads])
  }
  const removeAttachment = async (uploadId: string, scope: 'template' | 'send') => {
    const res = await fetch('/api/message-attachments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId }) })
    if (!res.ok) { setAttachmentError('Could not remove attachment.'); return }
    if (scope === 'template') setTemplateAttachments(current => current.filter(file => file.uploadId !== uploadId))
    else setSendAttachments(current => current.filter(file => file.uploadId !== uploadId))
  }

  const searchRecipients = (query = recipientSearch) => {
    setRecipientError('')
    if (query.trim().length < 2) {
      setRecipientRows([])
      setRecipientError('Enter at least 2 characters to search.')
      return
    }
    startRecipientSearch(async () => {
      const result = await findMessageRecipients(recipientGroup, query)
      if (!result.success) {
        setRecipientRows([])
        setRecipientError(result.error)
        return
      }
      setRecipientRows(result.rows)
      if (result.rows.length === 0) setRecipientError('No recipients with an email address found.')
    })
  }


  const toggleRecipient = (recipient: RecipientOption) => {
    const key = `${recipient.group}:${recipient.id}`
    setSelectedRecipients(current => current.some(item => `${item.group}:${item.id}` === key)
      ? current.filter(item => `${item.group}:${item.id}` !== key)
      : [...current, recipient])
  }

  const send = () => {
    if (!sendRow) return
    setSendError('')
    startTransition(async () => {
      const result = await sendTemplateEmail(sendRow.typeId, toEmail, selectedRecipients.map(({ group, id }) => ({ group, id })), sendAttachments.map(file => file.uploadId))
      if (!result.success) {
        setSendError(result.error ?? 'Something went wrong sending this email.')
        return
      }
      setSendResult({ sentCount: result.sentCount ?? 0, failedRecipients: result.failedRecipients ?? [] })
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteTemplate(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.typeId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle={`${filtered.length} templates`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Template</Btn>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Subject, body..." />
        <div className="flex gap-1.5">
          {['All', ...MESSAGE_TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterType === t ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={filterType === t ? { backgroundColor: '#1B2A6B' } : {}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <Table headers={['Type', 'Subject', 'Body', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.typeId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3">{r.messageType ? <Badge label={r.messageType} /> : '—'}</td>
            <td className="px-4 py-3 font-medium text-gray-900">{r.messageSubject ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">{r.messageBody ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                {r.messageType === 'Email' && (
                  <button onClick={() => openSend(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Send"><Send className="w-3.5 h-3.5" /></button>
                )}
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => openAttachments(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Attachments"><Paperclip className="w-3.5 h-3.5" /></button>
                <button onClick={() => openHistory(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Delivery history"><History className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.typeId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit Template' : 'Add Template'} open={!!modal} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.messageType} onChange={e => f('messageType', e.target.value)}>
              {MESSAGE_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
            <Input label="Subject *" value={form.messageSubject} onChange={e => f('messageSubject', e.target.value)} />
          </div>
          <RichTextEditor value={form.messageBody} onChange={value => f('messageBody', value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Template'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this template? This cannot be undone." />

      <Modal title={`Send — ${sendRow?.messageSubject ?? ''}`} open={!!sendRow} onClose={() => setSendRow(null)}>
        {sendResult ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              {sendResult.sentCount} email{sendResult.sentCount === 1 ? '' : 's'} sent successfully.
            </div>
            {sendResult.failedRecipients.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Could not send to: {sendResult.failedRecipients.join(', ')}
            </div>}
            <div className="flex justify-end"><Btn onClick={() => setSendRow(null)}>Close</Btn></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-800">Choose recipients</div>
                <p className="text-xs text-gray-500 mt-0.5">Search a group, then select one or more people with email addresses.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] gap-2 items-end">
                <Select label="Group" value={recipientGroup} onChange={e => { setRecipientGroup(e.target.value as RecipientGroup); setRecipientRows([]); setRecipientError('') }}>
                  {RECIPIENT_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}
                </Select>
                <Input label="Search" value={recipientSearch} onChange={e => { const value = e.target.value; setRecipientSearch(value); if (value.trim().length >= 2) searchRecipients(value); else { setRecipientRows([]); setRecipientError('') } }} placeholder={isSearchingRecipients ? 'Searching...' : 'Name, mobile, or email'} />
              </div>
              {recipientError && <div className="text-xs text-amber-700">{recipientError}</div>}
              {recipientRows.length > 0 && <div className="max-h-40 overflow-y-auto rounded border border-gray-100 divide-y divide-gray-100">
                {recipientRows.map(recipient => {
                  const checked = selectedRecipients.some(item => item.group === recipient.group && item.id === recipient.id)
                  return <label key={`${recipient.group}:${recipient.id}`} className="flex gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleRecipient(recipient)} className="mt-0.5" />
                    <span><span className="font-medium text-gray-800">{recipient.name}</span><span className="block text-xs text-gray-500">{recipient.email}{recipient.mobile ? ` · ${recipient.mobile}` : ''}</span></span>
                  </label>
                })}
              </div>}
              {selectedRecipients.length > 0 && <div className="flex flex-wrap gap-1.5">
                {selectedRecipients.map(recipient => <span key={`${recipient.group}:${recipient.id}`} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-[#1B2A6B]">
                  {recipient.name} <button type="button" aria-label={`Remove ${recipient.name}`} onClick={() => toggleRecipient(recipient)}><X className="h-3 w-3" /></button>
                </span>)}
              </div>}
            </div>
            <Input label="Other recipient email (optional)" type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="name@example.com" />
            <p className="text-xs text-gray-500">Choose at least one listed recipient or enter another email address. A maximum of 50 selected recipients can be sent to at once.</p>
            <div className="rounded-lg border border-gray-200 p-3 space-y-2"><label className="text-sm font-medium text-gray-800">Extra files for this send</label><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={e => { void uploadAttachments(e.target.files, 'send'); e.currentTarget.value = '' }} /><p className="text-xs text-gray-500">PDF, JPG, PNG, or DOCX — up to 10 MB per file.</p>{sendAttachments.map(file => <div key={file.uploadId} className="flex justify-between text-xs"><span>{file.originalName}</span><button type="button" onClick={() => { void removeAttachment(file.uploadId, 'send') }}><X className="w-3 h-3" /></button></div>)}</div>
            {attachmentError && <div className="text-xs text-red-600">{attachmentError}</div>}

            {sendError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{sendError}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setSendRow(null)}>Cancel</Btn>
              <Btn variant="outline" onClick={() => setPreviewOpen(true)}>Preview Email</Btn>
              <Btn onClick={send} disabled={isPending}>{isPending ? 'Sending...' : 'Send'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`Preview — ${sendRow?.messageSubject ?? ''}`} open={previewOpen} onClose={() => setPreviewOpen(false)} width="max-w-3xl">
        <div className="space-y-4"><div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"><div><b>Subject:</b> {sendRow?.messageSubject || '(no subject)'}</div><div className="mt-1"><b>Recipients:</b> {selectedRecipients.length + (toEmail.trim() ? 1 : 0)} selected {selectedRecipients.length + (toEmail.trim() ? 1 : 0) === 1 ? 'address' : 'addresses'}{selectedRecipients.length ? ' (duplicate email addresses will be sent only once)' : ''}</div><div className="mt-1"><b>Attachments:</b> {[...templateAttachments, ...sendAttachments].length ? [...templateAttachments, ...sendAttachments].map(file => file.originalName).join(', ') : 'None'}</div></div><iframe title="Email preview" sandbox="" srcDoc={sendRow?.messageBody ?? ''} className="min-h-80 w-full rounded-lg border border-gray-200 bg-white" /><div className="flex justify-end"><Btn onClick={() => setPreviewOpen(false)}>Close Preview</Btn></div></div>
      </Modal>

      <Modal title={`Attachments — ${attachmentTemplate?.messageSubject ?? ''}`} open={!!attachmentTemplate} onClose={() => setAttachmentTemplate(null)}>
        <div className="space-y-3"><p className="text-sm text-gray-600">These files will be included every time this template is sent.</p><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={e => { void uploadAttachments(e.target.files, 'template'); e.currentTarget.value = '' }} /><p className="text-xs text-gray-500">PDF, JPG, PNG, or DOCX — up to 10 MB per file.</p>{attachmentError && <div className="text-xs text-red-600">{attachmentError}</div>}{templateAttachments.length === 0 ? <div className="text-sm text-gray-400">No saved attachments.</div> : templateAttachments.map(file => <div key={file.uploadId} className="flex items-center justify-between rounded border px-3 py-2 text-sm"><span>{file.originalName} <span className="text-gray-400">({Math.ceil(file.byteSize / 1024)} KB)</span></span><button type="button" onClick={() => { void removeAttachment(file.uploadId, 'template') }} className="text-red-600">Remove</button></div>)}</div>
      </Modal>

      <Modal title={`Delivery history — ${historyTemplate?.messageSubject ?? ''}`} open={!!historyTemplate} onClose={() => setHistoryTemplate(null)}>
        {historyError ? <div className="text-sm text-red-600">{historyError}</div> : deliveryHistory.length === 0 ? <div className="text-sm text-gray-400">No email attempts for this template yet.</div> : <div className="space-y-2">{deliveryHistory.map(item => <div key={item.deliveryLogId} className="rounded border border-gray-200 px-3 py-2 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{item.recipientEmail}</span><span className={item.status === 'Sent' ? 'text-green-700' : 'text-red-700'}>{item.status}</span></div><div className="mt-1 text-xs text-gray-500">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(item.attemptedAt))} · {item.attachmentCount} attachment{item.attachmentCount === 1 ? '' : 's'}</div>{item.errorMessage && <div className="mt-1 text-xs text-red-600">{item.errorMessage}</div>}</div>)}</div>}
      </Modal>
    </div>
  )
}
