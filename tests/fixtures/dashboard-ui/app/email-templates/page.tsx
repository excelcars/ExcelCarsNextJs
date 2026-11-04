'use client'

import { useState } from 'react'
import { EmailTemplatesList } from '../../../../../src/features/messagetemplates/EmailTemplatesList'
import { EmailTemplateFields } from '../../../../../src/features/messagetemplates/EmailTemplateFields'
import { EmailPreview } from '../../../../../src/features/messagetemplates/EmailPreview'
import { TemplateRecipients } from '../../../../../src/features/messagetemplates/TemplateRecipients'
import { TemplateAttachmentFiles, type TemplateAttachment } from '../../../../../src/features/messagetemplates/TemplateAttachmentFiles'
import { EmailDeliveryHistory } from '../../../../../src/features/messagetemplates/EmailDeliveryHistory'
import { MessagingTemplatesTabs } from '../../../../../src/features/messagetemplates/MessagingTemplatesTabs'
import type { TemplateRow } from '../../../../../src/features/messagetemplates/templatePresentation'
import type { TemplateFormInput } from '../../../../../src/features/messagetemplates/actions'
import type { RecipientGroup, RecipientOption } from '../../../../../src/features/messagetemplates/recipients'
import { Btn, ConfirmDialog, Input, Modal, SearchBar } from '../../../../../src/components/ui'

const initialRows: TemplateRow[] = [
  { typeId: 1, messageType: 'Email', messageSubject: 'Your requested vehicle details and test drive confirmation with a long subject', messageBody: '<p>Hello <strong>customer</strong>,</p><p>Thank you for your interest. Your vehicle information and service history are ready.</p><ul><li>View specifications</li><li>Schedule your test drive</li></ul>' },
  { typeId: 2, messageType: 'Email', messageSubject: 'Service history and available vehicle specifications', messageBody: '<table style="width:900px"><tr><td>Wide legacy email content</td><td>Service details and vehicle specifications</td></tr></table><p>Additional information for your next visit.</p>' },
]
const recipients: RecipientOption[] = [
  { group: 'Customers', id: 1, name: 'Sample customer with a long name', email: 'sample-long-customer-email-address@example.test', mobile: '0000000000' },
  { group: 'Dealers', id: 1, name: 'Sample dealer with a long name', email: 'sample-long-dealer-email-address@example.test', mobile: '0000000000' },
]
const initialFiles: TemplateAttachment[] = [{ uploadId: 'file-1', originalName: 'vehicle-service-history-and-complete-specifications-with-a-long-filename.pdf', byteSize: 250000, scope: 'template' }]
const emptyForm: TemplateFormInput = { messageType: 'Email', messageSubject: '', messageBody: '' }

export default function EmailTemplatesPreview() {
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'edit' | 'send' | 'attachments' | 'history' | null>(null)
  const [active, setActive] = useState<TemplateRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [group, setGroup] = useState<RecipientGroup>('Customers')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<RecipientOption[]>([])
  const [files, setFiles] = useState(initialFiles)
  const [preview, setPreview] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const open = (mode: 'send' | 'attachments' | 'history', row: TemplateRow) => { setActive(row); setMode(mode); setSelected([]); setQuery(''); setFiles(initialFiles); setNotice('') }
  const edit = (row: TemplateRow | null) => { setActive(row); setForm(row ? { messageType: row.messageType || 'Email', messageSubject: row.messageSubject || '', messageBody: row.messageBody || '' } : emptyForm); setErrors({}); setMode('edit'); setNotice('') }
  const toggle = (recipient: RecipientOption) => setSelected(current => current.some(item => item.id === recipient.id && item.group === recipient.group) ? current.filter(item => item.id !== recipient.id || item.group !== recipient.group) : [...current, recipient])
  const save = () => {
    const next: Record<string, string> = {}
    if (!form.messageSubject.trim()) next.messageSubject = 'Subject is required.'
    if (!form.messageBody.trim()) next.messageBody = 'Email body is required.'
    setErrors(next)
    if (Object.keys(next).length) return
    setRows(current => active ? current.map(row => row.typeId === active.typeId ? { ...row, ...form } : row) : [...current, { typeId: Date.now(), ...form }])
    setMode(null); setNotice('Template saved in preview only')
  }
  const email = <div className="min-w-0">
    <header className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:justify-between"><div><h1 className="text-xl font-bold">Email Templates</h1><p className="text-sm text-gray-500">{rows.length} templates</p></div><Btn className="min-h-11 justify-center" onClick={() => edit(null)}>Add Template</Btn></header>
    {notice && <p role="status" className="mb-4 break-words text-sm text-green-700">{notice}</p>}
    <div className="mb-4 [&_input]:min-h-11"><SearchBar value={search} onChange={setSearch} placeholder="Subject, body..." /></div>
    <EmailTemplatesList rows={rows.filter(row => `${row.messageSubject} ${row.messageBody}`.toLowerCase().includes(search.toLowerCase()))} onEdit={edit} onSend={row => open('send', row)} onAttachments={row => open('attachments', row)} onHistory={row => open('history', row)} onDelete={setDeleteId} />
  </div>
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6">
    <MessagingTemplatesTabs whatsapp={<p className="text-sm text-gray-500">Select Email Templates to check the email module.</p>} email={email} />
    <Modal title={active ? 'Edit Template' : 'Add Template'} open={mode === 'edit'} onClose={() => setMode(null)}>
      <EmailTemplateFields form={form} messageTypes={['Email']} errors={errors} onChange={(key, value) => setForm(current => ({ ...current, [key]: value }))} />
      <div className="mt-4 grid gap-3 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center"><Btn variant="outline" onClick={() => setMode(null)}>Cancel</Btn><Btn onClick={save}>Save Template</Btn></div>
    </Modal>
    <Modal title={`Send — ${active?.messageSubject || ''}`} open={mode === 'send'} onClose={() => setMode(null)}>
      <div className="min-w-0 space-y-4">
        <TemplateRecipients groups={['Customers', 'Dealers']} group={group} query={query} rows={query.length >= 2 ? recipients.filter(row => row.group === group && `${row.name} ${row.email}`.toLowerCase().includes(query.toLowerCase())) : []} selected={selected} searching={false} error="" onGroupChange={setGroup} onQueryChange={setQuery} onToggle={toggle} />
        <Input label="Other recipient email (optional)" placeholder="name@example.com" />
        <TemplateAttachmentFiles files={files} onRemove={id => setFiles(current => current.filter(file => file.uploadId !== id))} />
        <div className="grid gap-3 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center"><Btn variant="outline" onClick={() => setMode(null)}>Cancel</Btn><Btn variant="outline" onClick={() => setPreview(true)}>Preview Email</Btn><Btn onClick={() => setNotice('Preview only — no email was sent')}>Send</Btn></div>
      </div>
    </Modal>
    <Modal title={`Preview — ${active?.messageSubject || ''}`} open={preview} onClose={() => setPreview(false)} width="max-w-3xl"><EmailPreview subject={active?.messageSubject} body={active?.messageBody} recipientCount={selected.length} hasSelectedRecipients={selected.length > 0} attachmentNames={files.map(file => file.originalName)} /></Modal>
    <Modal title={`Attachments — ${active?.messageSubject || ''}`} open={mode === 'attachments'} onClose={() => setMode(null)}><TemplateAttachmentFiles files={files} onRemove={id => setFiles(current => current.filter(file => file.uploadId !== id))} /></Modal>
    <Modal title={`Delivery history — ${active?.messageSubject || ''}`} open={mode === 'history'} onClose={() => setMode(null)}><EmailDeliveryHistory error="" rows={[{ deliveryLogId: 1, recipientEmail: 'sample-long-customer-email-address@example.test', status: 'Sent', errorMessage: null, attachmentCount: 1, attemptedAt: '2026-11-04T08:00:00Z' }, { deliveryLogId: 2, recipientEmail: 'another-long-customer-email-address@example.test', status: 'Failed', errorMessage: 'Sample error message with details that need to wrap on a small screen.', attachmentCount: 0, attemptedAt: '2026-11-04T09:00:00Z' }]} /></Modal>
    <ConfirmDialog open={deleteId !== null} title="Delete template?" message="Delete this preview template?" onClose={() => setDeleteId(null)} onConfirm={() => { setRows(current => current.filter(row => row.typeId !== deleteId)); setDeleteId(null) }} />
  </main>
}
