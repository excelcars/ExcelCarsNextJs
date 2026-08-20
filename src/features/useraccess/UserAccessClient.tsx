'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, UserX } from 'lucide-react'
import { Badge, Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createUserAccount, updateUserAccount, deactivateUserAccount, type UserAccessFormInput } from './actions'
import { GENDERS, STATUSES } from './queries'

interface RoleOption { roleId: number; roleName: string | null }
interface EmployeeInfo {
  empId: number
  empFirstName: string | null
  empLastName: string | null
  empGender: string | null
  empMobileNo: string | null
  empPhoneNo: string | null
  empEmailId: string | null
  empAddress: string | null
  empCity: string | null
  empPincode: string | null
}
interface UserRow {
  userId: number
  userName: string | null
  roleId: number | null
  roleName: string | null
  status: string | null
  displayName: string | null
  emailId: string | null
  employee: EmployeeInfo | null
}

function emptyForm(): UserAccessFormInput {
  return {
    empFirstName: '', empLastName: '', empGender: 'M', empMobileNo: '', empPhoneNo: '', empEmailId: '',
    empAddress: '', empCity: '', empPincode: '', userName: '', password: '', roleId: null, status: 'Active',
  }
}

export function UserAccessClient({ initialData, roles }: { initialData: UserRow[]; roles: RoleOption[] }) {
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<UserAccessFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter(r => {
      const name = r.displayName ?? `${r.employee?.empFirstName ?? ''} ${r.employee?.empLastName ?? ''}`
      return !q || name.toLowerCase().includes(q) || (r.userName ?? '').toLowerCase().includes(q) || (r.emailId ?? '').toLowerCase().includes(q)
    })
  }, [data, search])

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setError(''); setModal('add') }
  const openEdit = (r: UserRow) => {
    setForm({
      empFirstName: r.employee?.empFirstName ?? '', empLastName: r.employee?.empLastName ?? '', empGender: r.employee?.empGender ?? 'M',
      empMobileNo: r.employee?.empMobileNo ?? '', empPhoneNo: r.employee?.empPhoneNo ?? '', empEmailId: r.employee?.empEmailId ?? r.emailId ?? '',
      empAddress: r.employee?.empAddress ?? '', empCity: r.employee?.empCity ?? '', empPincode: r.employee?.empPincode ?? '',
      userName: r.userName ?? '', password: '', roleId: r.roleId, status: r.status ?? 'Active',
    })
    setEditId(r.userId)
    setError('')
    setModal('edit')
  }

  const f = <K extends keyof UserAccessFormInput>(k: K, v: UserAccessFormInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    setError('')
    startTransition(async () => {
      const result = editId ? await updateUserAccount(editId, form) : await createUserAccount(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setModal(null)
      window.location.reload()
    })
  }

  const deactivate = () => {
    if (!deactivateId) return
    startTransition(async () => {
      const result = await deactivateUserAccount(deactivateId)
      if (result.success) {
        setData(prev => prev.map(r => r.userId === deactivateId ? { ...r, status: 'Inactive' } : r))
      } else {
        setError(result.error ?? 'Could not deactivate this account.')
      }
      setDeactivateId(null)
    })
  }

  return (
    <div>
      <PageHeader
        title="User Access"
        subtitle={`${filtered.length} accounts`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add User</Btn>}
      />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Name, username, email..." /></div>

      <Table headers={['Name', 'Username', 'Contact', 'Role', 'Status', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.userId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-medium text-gray-900">{r.displayName ?? `${r.employee?.empFirstName ?? ''} ${r.employee?.empLastName ?? ''}`}</td>
            <td className="px-4 py-3 text-sm text-gray-700 font-mono">{r.userName ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-700">{r.employee?.empMobileNo ?? '—'}</div>
              <div className="text-xs text-gray-500">{r.emailId ?? ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.roleName ?? '—'}</td>
            <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
            <td className="px-4 py-3">
              {r.status === 'Active' && (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeactivateId(r.userId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Deactivate"><UserX className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={editId ? 'Edit User' : 'Add User'} open={!!modal} onClose={() => setModal(null)} width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="First Name *" value={form.empFirstName} onChange={e => f('empFirstName', e.target.value)} />
            <Input label="Last Name *" value={form.empLastName} onChange={e => f('empLastName', e.target.value)} />
            <Select label="Gender" value={form.empGender} onChange={e => f('empGender', e.target.value)}>
              {GENDERS.map(g => <option key={g}>{g}</option>)}
            </Select>
            <Input label="Mobile *" value={form.empMobileNo} onChange={e => f('empMobileNo', e.target.value)} />
            <Input label="Phone" value={form.empPhoneNo} onChange={e => f('empPhoneNo', e.target.value)} />
            <Input label="Email *" type="email" value={form.empEmailId} onChange={e => f('empEmailId', e.target.value)} />
            <Input label="City" value={form.empCity} onChange={e => f('empCity', e.target.value)} />
            <Input label="Pincode" value={form.empPincode} onChange={e => f('empPincode', e.target.value)} />
          </div>
          <Input label="Address" value={form.empAddress} onChange={e => f('empAddress', e.target.value)} />

          <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-4">
            <Input label="Username *" value={form.userName} onChange={e => f('userName', e.target.value)} disabled={!!editId} className={editId ? 'bg-gray-50' : ''} />
            <Input label={editId ? 'New Password (leave blank to keep)' : 'Password *'} type="password" value={form.password} onChange={e => f('password', e.target.value)} />
            <Select label="Role *" value={form.roleId ?? ''} onChange={e => f('roleId', Number(e.target.value) || null)}>
              <option value="">Select Role</option>
              {roles.map(r => <option key={r.roleId} value={r.roleId}>{r.roleName}</option>)}
            </Select>
            {editId && (
              <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save User'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deactivateId !== null} onClose={() => setDeactivateId(null)} onConfirm={deactivate}
        message="Deactivate this user account? They will no longer be able to sign in." />
    </div>
  )
}
