'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ActionAlert, Btn, Modal, ConfirmDialog } from '@/components/ui'
import { isValidEmail, isValidPhone } from '@/lib/validation'
import { createAgent, updateAgent, deleteAgent, type AgentFormInput } from './adminActions'
import { AGENT_TYPES } from './constants'
import { AgentsHeader, AgentsFilters, AgentsList, AgentsPagination, AgentFormFields, type AgentRow } from './AgentsUI'

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

  return <div className="min-w-0 [&_button]:min-h-11">
    <AgentsHeader total={total} onAdd={openAdd} />
    <AgentsFilters search={searchInput} type={type} onSearch={setSearchInput} onType={value => pushQuery({ type: value })} />
    <AgentsList rows={initialData} onEdit={openEdit} onDelete={setDeleteId} />
    <AgentsPagination page={page} pageCount={pageCount} onPage={value => pushQuery({ page: String(value) })} />

    <Modal title={editId ? 'Edit Agent' : 'Add Agent'} open={!!modal} onClose={() => setModal(null)}><div className="min-w-0 space-y-4 [overflow-wrap:anywhere]">
      <AgentFormFields form={form} errors={fieldErrors} onChange={f} />
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center"><Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn><Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Agent'}</Btn></div>
    </div></Modal>
    <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del} message="Delete this agent? This cannot be undone." />
    <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Agent saved" errorTitle="Agent not saved" />
    <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Agent deleted" errorTitle="Agent not deleted" />
  </div>
}
