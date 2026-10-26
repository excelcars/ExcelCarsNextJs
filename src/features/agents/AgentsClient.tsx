'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Mail, Phone } from 'lucide-react'
import { ActionAlert, Btn, Input, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import { isValidEmail, isValidPhone } from '@/lib/validation'
import { createAgent, updateAgent, deleteAgent, type AgentFormInput } from './adminActions'
import { AGENT_TYPES } from './adminQueries'

interface AgentRow {
  partnerId: number
  partnerType: string
  name: string
  mobile: string | null
  email: string | null
}

function emptyForm(): AgentFormInput {
  return { partnerType: AGENT_TYPES[0], name: '', mobile: '', email: '' }
}

export function AgentsClient({ initialData, total, page, pageCount, search, type }: {
  initialData: AgentRow[]
  total: number
  page: number
  pageCount: number
  search: string
  type: string
}) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<AgentFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AgentFormInput, string>>>({})
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ search, type, page: '1', ...params })
    for (const [key, value] of [...q.entries()]) if (!value || value === 'All') q.delete(key)
    router.push(`/config/agents${q.toString() ? `?${q.toString()}` : ''}`)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery({ search: searchInput }), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setError(''); setFieldErrors({}); setModal('add') }
  const openEdit = (row: AgentRow) => {
    setForm({ partnerType: row.partnerType, name: row.name, mobile: row.mobile ?? '', email: row.email ?? '' })
    setEditId(row.partnerId); setError(''); setFieldErrors({}); setModal('edit')
  }
  const f = <K extends keyof AgentFormInput>(key: K, value: AgentFormInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setFieldErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const save = () => {
    setError('')
    const errors: Partial<Record<keyof AgentFormInput, string>> = {}
    if (!form.name.trim()) errors.name = 'Name is required.'
    if (!form.mobile.trim() && !form.email.trim()) {
      errors.mobile = 'Enter a mobile number or email address.'
      errors.email = 'Enter a mobile number or email address.'
    } else {
      if (form.mobile.trim() && !isValidPhone(form.mobile)) errors.mobile = 'Mobile number must contain 10 digits.'
      if (form.email.trim() && !isValidEmail(form.email)) errors.email = 'Enter a valid email address.'
    }
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    startTransition(async () => {
      const result = editId ? await updateAgent(editId, form) : await createAgent(form)
      if (!result.success) { const message = result.error ?? 'Could not save this agent.'; setError(message); setSaveFeedback({ type: 'error', message }); return }
      setSaveFeedback({ type: 'success', message: `Agent ${editId ? 'updated' : 'created'} successfully.` })
      setModal(null); router.refresh()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteAgent(deleteId)
      if (result.success) {
        setDeleteFeedback({ type: 'success', message: 'Agent deleted successfully.' })
        router.refresh()
      } else {
        const message = result.error ?? 'Could not delete this agent.'
        setError(message)
        setDeleteFeedback({ type: 'error', message })
      }
      setDeleteId(null)
    })
  }

  return <div>
    <PageHeader title="Agents" subtitle={`${total.toLocaleString('en-IN')} agents`} action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Agent</Btn>} />

    <div className="flex flex-wrap gap-3 mb-4">
      <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, mobile, email..." />
      <div className="flex flex-wrap gap-1.5">
        {['All', ...AGENT_TYPES].map(agentType => <button key={agentType} onClick={() => pushQuery({ type: agentType })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${type === agentType || (type === 'All' && agentType === 'All') ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          style={type === agentType || (type === 'All' && agentType === 'All') ? { backgroundColor: '#1B2A6B' } : {}}>{agentType}</button>)}
      </div>
    </div>

    <Table headers={['Agent', 'Agent Type', 'Mobile', 'Email', 'Actions']} minWidthClass="min-w-[760px]" empty={initialData.length === 0}>
      {initialData.map(row => <tr key={row.partnerId} className="hover:bg-gray-50 transition">
        <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{row.partnerType}</td>
        <td className="px-4 py-3"><div className="flex items-center gap-2 font-mono text-sm text-gray-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />{row.mobile ?? '—'}</div></td>
        <td className="px-4 py-3"><div className="flex min-w-0 items-center gap-2 text-sm text-gray-600"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{row.email ?? '—'}</span></div></td>
        <td className="px-4 py-3"><div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteId(row.partnerId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
        </div></td>
      </tr>)}
    </Table>

    {pageCount > 1 && <div className="flex items-center justify-between mt-4"><div className="text-xs text-gray-500">Page {page} of {pageCount}</div><div className="flex gap-1.5">
      <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => pushQuery({ page: String(page - 1) })}><ChevronLeft className="w-3.5 h-3.5" />Prev</Btn>
      <Btn variant="outline" size="sm" disabled={page >= pageCount} onClick={() => pushQuery({ page: String(page + 1) })}>Next<ChevronRight className="w-3.5 h-3.5" /></Btn>
    </div></div>}

    <Modal title={editId ? 'Edit Agent' : 'Add Agent'} open={!!modal} onClose={() => setModal(null)}><div className="space-y-4">
      <div className="grid grid-cols-2 gap-4"><FormDropdown label="Type" value={form.partnerType} options={AGENT_TYPES.map(value => ({ value, label: value }))} placeholder="Select type" onChange={value => f('partnerType', value)} />
        <Input label="Name *" value={form.name} onChange={e => f('name', e.target.value)} error={!!fieldErrors.name} errorMessage={fieldErrors.name} /><Input label="Mobile" value={form.mobile} inputMode="numeric" maxLength={10} onChange={e => f('mobile', e.target.value.replace(/\D/g, ''))} error={!!fieldErrors.mobile} errorMessage={fieldErrors.mobile} /><Input label="Email" type="email" value={form.email} onChange={e => f('email', e.target.value)} error={!!fieldErrors.email} errorMessage={fieldErrors.email} /></div>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex gap-3 justify-end pt-2"><Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn><Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Agent'}</Btn></div>
    </div></Modal>
    <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del} message="Delete this agent? This cannot be undone." />
    <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Agent saved" errorTitle="Agent not saved" />
    <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Agent deleted" errorTitle="Agent not deleted" />
  </div>
}
