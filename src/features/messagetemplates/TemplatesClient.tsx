'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { ActionAlert, Btn, Input, Modal, SearchBar, ConfirmDialog } from '@/components/ui'
import { createTemplate, updateTemplate, deleteTemplate, findMessageRecipients, getTemplateDeliveryHistory, sendTemplateEmail, type TemplateFormInput } from './actions'
import { MESSAGE_TYPES } from './queries'
import { RECIPIENT_GROUPS, type RecipientGroup, type RecipientOption } from './recipients'
import { EmailTemplatesList } from './EmailTemplatesList'
import { EmailTemplateFields } from './EmailTemplateFields'
import { EmailPreview } from './EmailPreview'
import { TemplateAttachmentFiles } from './TemplateAttachmentFiles'
import { TemplateRecipients } from './TemplateRecipients'
import { EmailDeliveryHistory, type DeliveryRow } from './EmailDeliveryHistory'
import type { TemplateRow } from './templatePresentation'

interface AttachmentRow { uploadId: string; originalName: string; byteSize: number; scope: string }

function emptyForm(): TemplateFormInput {
  return { messageType: 'Email', messageSubject: '', messageBody: '' }
}

export function TemplatesClient({ initialData }: { initialData: TemplateRow[] }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<TemplateFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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
      return matches
    })
  }, [data, search])

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setError(''); setFieldErrors({}); setModal('add') }
  const openEdit = (r: TemplateRow) => {
    setForm({ messageType: r.messageType ?? 'Email', messageSubject: r.messageSubject ?? '', messageBody: r.messageBody ?? '' })
    setEditId(r.typeId)
    setError('')
    setFieldErrors({})
    setModal('edit')
  }

  const f = <K extends keyof TemplateFormInput>(k: K, v: TemplateFormInput[K]) => { setForm(prev => ({ ...prev, [k]: v })); setFieldErrors(prev => { if (!prev[k]) return prev; const next = { ...prev }; delete next[k]; return next }) }

  const save = () => {
    setError('')
    const nextErrors: Record<string, string> = {}
    if (!form.messageSubject.trim()) nextErrors.messageSubject = 'Subject is required.'
    if (!form.messageBody.trim()) nextErrors.messageBody = 'Email body is required.'
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); return }
    setFieldErrors({})
    startTransition(async () => {
      const result = editId ? await updateTemplate(editId, form) : await createTemplate(form)
      if (!result.success) {
        const message = result.error ?? 'Could not save this message template.'
        setError(message)
        setSaveFeedback({ type: 'error', message })
        return
      }
      setSaveFeedback({ type: 'success', message: `Message template ${editId ? 'updated' : 'created'} successfully.` })
      setModal(null)
      router.refresh()
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
    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png'])
    const invalidFile = Array.from(files).find(file => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024)
    if (invalidFile) {
      setAttachmentError('Only PDF, JPG, and PNG files up to 10 MB each are allowed.')
      return
    }
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
        setDeleteFeedback({ type: 'success', message: 'Message template deleted successfully.' })
      } else {
        const message = result.error ?? 'Could not delete this message template.'
        setError(message)
        setDeleteFeedback({ type: 'error', message })
      }
      setDeleteId(null)
    })
  }

  return (
    <div className="min-w-0">
      <header className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><h1 className="text-xl font-bold text-gray-900">Email Templates</h1><p className="mt-0.5 text-sm text-gray-500">{filtered.length} templates</p></div>
        <Btn size="sm" className="min-h-11 shrink-0 justify-center" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Template</Btn>
      </header>

      <div className="mb-4 min-w-0 [&_input]:min-w-0 [&_input]:min-h-11 sm:max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Subject, body..." />
      </div>

      <EmailTemplatesList rows={filtered} onSend={openSend} onEdit={openEdit} onAttachments={openAttachments} onHistory={openHistory} onDelete={setDeleteId} />

      <Modal title={editId ? 'Edit Template' : 'Add Template'} open={!!modal} onClose={() => setModal(null)}>
        <div className="min-w-0 space-y-4 break-words [overflow-wrap:anywhere] [&_button]:min-h-11 [&_input]:min-w-0 [&_select]:min-h-11">
          <EmailTemplateFields form={form} messageTypes={MESSAGE_TYPES} errors={fieldErrors} onChange={f} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-3 pt-2 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Template'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this template? This cannot be undone." />
      <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Template deleted" errorTitle="Template not deleted" />
      <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Template saved" errorTitle="Template not saved" />

      <Modal title={`Send — ${sendRow?.messageSubject ?? ''}`} open={!!sendRow} onClose={() => setSendRow(null)}>
        {sendResult ? (
          <div className="min-w-0 space-y-4 break-words [overflow-wrap:anywhere] [&_button]:min-h-11 [&_input]:min-w-0 [&_select]:min-h-11">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              {sendResult.sentCount} email{sendResult.sentCount === 1 ? '' : 's'} sent successfully.
            </div>
            {sendResult.failedRecipients.length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Could not send to: {sendResult.failedRecipients.join(', ')}
            </div>}
            <div className="flex justify-end"><Btn onClick={() => setSendRow(null)}>Close</Btn></div>
          </div>
        ) : (
          <div className="min-w-0 space-y-4 break-words [overflow-wrap:anywhere] [&_button]:min-h-11 [&_input]:min-w-0 [&_select]:min-h-11">
            <TemplateRecipients groups={RECIPIENT_GROUPS} group={recipientGroup} query={recipientSearch} rows={recipientRows} selected={selectedRecipients} searching={isSearchingRecipients} error={recipientError} onGroupChange={group => { setRecipientGroup(group); setRecipientRows([]); setRecipientError('') }} onQueryChange={value => { setRecipientSearch(value); if (value.trim().length >= 2) searchRecipients(value); else { setRecipientRows([]); setRecipientError('') } }} onToggle={toggleRecipient} />
            <Input label="Other recipient email (optional)" type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="name@example.com" />
            <p className="text-xs text-gray-500">Choose at least one listed recipient or enter another email address. A maximum of 50 selected recipients can be sent to at once.</p>
            <div className="rounded-lg border border-gray-200 p-3 space-y-2"><label className="text-sm font-medium text-gray-800">Extra files for this send</label><input type="file" className="block min-h-11 w-full min-w-0 text-sm" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => { void uploadAttachments(e.target.files, 'send'); e.currentTarget.value = '' }} /><p className="text-xs text-gray-500">PDF, JPG, or PNG — up to 10 MB per file.</p><TemplateAttachmentFiles files={sendAttachments} onRemove={id => { void removeAttachment(id, 'send') }} /></div>
            {attachmentError && <div className="text-xs text-red-600">{attachmentError}</div>}

            {sendError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{sendError}</div>}

            <div className="grid gap-3 pt-2 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center">
              <Btn variant="outline" onClick={() => setSendRow(null)}>Cancel</Btn>
              <Btn variant="outline" onClick={() => setPreviewOpen(true)}>Preview Email</Btn>
              <Btn onClick={send} disabled={isPending}>{isPending ? 'Sending...' : 'Send'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`Preview — ${sendRow?.messageSubject ?? ''}`} open={previewOpen} onClose={() => setPreviewOpen(false)} width="max-w-3xl">
        <EmailPreview subject={sendRow?.messageSubject} body={sendRow?.messageBody} recipientCount={selectedRecipients.length + (toEmail.trim() ? 1 : 0)} hasSelectedRecipients={selectedRecipients.length > 0} attachmentNames={[...templateAttachments, ...sendAttachments].map(file => file.originalName)} />
        <div className="mt-4 flex justify-end"><Btn className="min-h-11" onClick={() => setPreviewOpen(false)}>Close Preview</Btn></div>
      </Modal>

      <Modal title={`Attachments — ${attachmentTemplate?.messageSubject ?? ''}`} open={!!attachmentTemplate} onClose={() => setAttachmentTemplate(null)}>
        <div className="min-w-0 space-y-3 break-words [overflow-wrap:anywhere]"><p className="text-sm text-gray-600">These files will be included every time this template is sent.</p><input type="file" className="block min-h-11 w-full min-w-0 text-sm" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => { void uploadAttachments(e.target.files, 'template'); e.currentTarget.value = '' }} /><p className="text-xs text-gray-500">PDF, JPG, or PNG — up to 10 MB per file.</p>{attachmentError && <div className="text-xs text-red-600">{attachmentError}</div>}{templateAttachments.length === 0 ? <div className="text-sm text-gray-400">No saved attachments.</div> : <TemplateAttachmentFiles files={templateAttachments} onRemove={id => { void removeAttachment(id, 'template') }} />}</div>
      </Modal>

      <Modal title={`Delivery history — ${historyTemplate?.messageSubject ?? ''}`} open={!!historyTemplate} onClose={() => setHistoryTemplate(null)}>
        <EmailDeliveryHistory rows={deliveryHistory} error={historyError} />
      </Modal>
    </div>
  )
}
