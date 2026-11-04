'use client'

import { useState } from 'react'
import { AgentFormFields, AgentsFilters, AgentsHeader, AgentsList, AgentsPagination, type AgentRow } from '../../../../../src/features/agents/AgentsUI'
import type { AgentFormInput } from '../../../../../src/features/agents/adminActions'
import { Btn, ConfirmDialog, Modal } from '../../../../../src/components/ui'

const initialRows: AgentRow[] = [
  { partnerId: 1, partnerType: 'Insurance Agent', name: 'Sample insurance agent with a long name', mobile: '0000000000', email: 'verylonginsuranceagentemailaddress@example.test' },
  { partnerId: 2, partnerType: 'RTO Agent', name: 'Sample RTO agent', mobile: null, email: 'rto-agent@example.test' },
  { partnerId: 3, partnerType: 'Insurance Agent', name: 'Another insurance agent', mobile: '0000000000', email: null },
]
const blank = (): AgentFormInput => ({ partnerType: 'Insurance Agent', name: '', mobile: '', email: '' })

export default function AgentsPreview() {
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('All')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<AgentFormInput>(blank)
  const [editId, setEditId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const filtered = rows.filter(row => (type === 'All' || row.partnerType === type) && `${row.name} ${row.mobile ?? ''} ${row.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(filtered.length / 2))
  const save = () => {
    if (!form.name.trim()) return
    const row = { ...form, partnerId: editId ?? Math.max(0, ...rows.map(row => row.partnerId)) + 1 }
    setRows(current => editId ? current.map(agent => agent.partnerId === editId ? row : agent) : [...current, row])
    setOpen(false)
  }
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6 [&_button]:min-h-11">
    <AgentsHeader total={filtered.length} onAdd={() => { setForm(blank()); setEditId(null); setOpen(true) }} />
    <AgentsFilters search={search} type={type} onSearch={value => { setSearch(value); setPage(1) }} onType={value => { setType(value); setPage(1) }} />
    <AgentsList rows={filtered.slice((page - 1) * 2, page * 2)} onEdit={row => { setEditId(row.partnerId); setForm({ partnerType: row.partnerType, name: row.name, mobile: row.mobile ?? '', email: row.email ?? '' }); setOpen(true) }} onDelete={setDeleteId} />
    <AgentsPagination page={page} pageCount={pageCount} onPage={setPage} />
    <Modal title={editId ? 'Edit Agent' : 'Add Agent'} open={open} onClose={() => setOpen(false)}>
      <div className="min-w-0 space-y-4">
        <AgentFormFields form={form} errors={{}} onChange={(key, value) => setForm(current => ({ ...current, [key]: value }))} />
        <p className="text-xs text-gray-500">Preview only. Changes stay in this page.</p>
        <div className="grid gap-3 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center"><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn onClick={save}>Save Agent</Btn></div>
      </div>
    </Modal>
    <ConfirmDialog title="Delete sample agent?" open={deleteId !== null} onClose={() => setDeleteId(null)} message="Remove this sample agent from the preview?" onConfirm={() => { setRows(current => current.filter(row => row.partnerId !== deleteId)); setPage(1); setDeleteId(null) }} />
  </main>
}
