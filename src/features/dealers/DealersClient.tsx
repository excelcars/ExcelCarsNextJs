'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Btn, Input, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createDealer, updateDealer, deleteDealer, type DealerFormInput } from './actions'

interface DealerRow {
  dealerId: number
  dealerName: string | null
  dealerMobileNo: string | null
  dealerMobileNo_2: string | null
  dealerEmail: string | null
  dealerAddress: string | null
  dealerCompanyName: string | null
  dealerWebsite: string | null
}

function emptyForm(): DealerFormInput {
  return { dealerName: '', dealerMobileNo: '', dealerMobileNo_2: '', dealerEmail: '', dealerAddress: '', dealerCompanyName: '', dealerWebsite: '' }
}

export function DealersClient({ initialData }: { initialData: DealerRow[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<DealerFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(r => !q || (r.dealerName ?? '').toLowerCase().includes(q) || (r.dealerMobileNo ?? '').includes(q) || (r.dealerCompanyName ?? '').toLowerCase().includes(q))
  }, [data, search])

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setError(''); setModal('add') }
  const openEdit = (r: DealerRow) => {
    setForm({
      dealerName: r.dealerName ?? '', dealerMobileNo: r.dealerMobileNo ?? '', dealerMobileNo_2: r.dealerMobileNo_2 ?? '',
      dealerEmail: r.dealerEmail ?? '', dealerAddress: r.dealerAddress ?? '', dealerCompanyName: r.dealerCompanyName ?? '', dealerWebsite: r.dealerWebsite ?? '',
    })
    setEditId(r.dealerId)
    setError('')
    setModal('edit')
  }

  const f = <K extends keyof DealerFormInput>(k: K, v: DealerFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateDealer(editId, form) : await createDealer(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setModal(null)
      window.location.reload()
    })
  }

  const del = () => {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteDealer(deleteId)
      if (result.success) {
        setData(prev => prev.filter(r => r.dealerId !== deleteId))
      } else {
        setError(result.error ?? 'Could not delete this record.')
      }
      setDeleteId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="Dealers"
        subtitle={`${filtered.length} dealers`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Dealer</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Name, mobile, company..." /></div>

      <Table headers={['Name', 'Mobile', 'Email', 'Company', 'Website', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.dealerId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-medium text-gray-900">{r.dealerName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700 font-mono">{r.dealerMobileNo ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.dealerEmail ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.dealerCompanyName ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.dealerWebsite ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.dealerId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit Dealer' : 'Add Dealer'} open={!!modal} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" value={form.dealerName} onChange={e => f('dealerName', e.target.value)} />
            <Input label="Mobile *" value={form.dealerMobileNo} onChange={e => f('dealerMobileNo', e.target.value)} />
            <Input label="Mobile 2" value={form.dealerMobileNo_2} onChange={e => f('dealerMobileNo_2', e.target.value)} />
            <Input label="Email" type="email" value={form.dealerEmail} onChange={e => f('dealerEmail', e.target.value)} />
            <Input label="Company Name" value={form.dealerCompanyName} onChange={e => f('dealerCompanyName', e.target.value)} />
            <Input label="Website" value={form.dealerWebsite} onChange={e => f('dealerWebsite', e.target.value)} />
          </div>
          <Input label="Address" value={form.dealerAddress} onChange={e => f('dealerAddress', e.target.value)} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Dealer'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del}
        message="Delete this dealer? This cannot be undone." />
    </div>
  )
}
