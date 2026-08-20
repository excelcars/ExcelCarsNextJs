'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Send } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { createTemplate, updateTemplate, deleteTemplate, sendTemplateEmail, type TemplateFormInput } from './actions'
import { MESSAGE_TYPES } from './queries'

interface CustomerOption { custId: number; custName: string; custMobile: string | null; custEmail: string | null }

interface TemplateRow {
  typeId: number
  messageType: string | null
  messageSubject: string | null
  messageBody: string | null
}

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

  const [sendRow, setSendRow] = useState<TemplateRow | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [toEmail, setToEmail] = useState('')
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

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
    setSelectedCustomer(null)
    setToEmail('')
    setSendError('')
    setSendSuccess(false)
  }

  const onCustomerChange = (c: CustomerOption | null) => {
    setSelectedCustomer(c)
    setToEmail(c?.custEmail ?? '')
  }

  const send = () => {
    if (!sendRow) return
    setSendError('')
    startTransition(async () => {
      const result = await sendTemplateEmail(sendRow.typeId, toEmail)
      if (!result.success) {
        setSendError(result.error ?? 'Something went wrong sending this email.')
        return
      }
      setSendSuccess(true)
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
        title="SMS / Email Templates"
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
          <Textarea label="Body *" value={form.messageBody} onChange={e => f('messageBody', e.target.value)} className="min-h-32" />

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
        {sendSuccess ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">Email sent successfully.</div>
            <div className="flex justify-end"><Btn onClick={() => setSendRow(null)}>Close</Btn></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Find a customer (optional)</label>
              <CustomerPicker value={selectedCustomer} onChange={onCustomerChange} />
            </div>
            <Input label="Recipient Email *" type="email" value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="name@example.com" />

            {sendError && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{sendError}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => setSendRow(null)}>Cancel</Btn>
              <Btn onClick={send} disabled={isPending}>{isPending ? 'Sending...' : 'Send'}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
