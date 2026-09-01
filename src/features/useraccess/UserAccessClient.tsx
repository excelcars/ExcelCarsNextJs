'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { Badge, Btn, Input, LoadingOverlay, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createUserAccount, updateUserAccount, deactivateUserAccount, type UserAccessFormInput } from './actions'
import { GENDERS, STATUSES, USER_ACCESS_PAGE_SIZE } from './queries'
import { PASSWORD_POLICY_MESSAGE, passwordPolicyError, PROFILE_FIELD_LIMITS } from '@/lib/profileValidation'

interface RoleOption { roleId: number; roleName: string | null }
interface StateOption { stateId: number; statename: string }
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
  fkStateId: number | null
  indianStatesMaster?: StateOption | null
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
  createdDate?: Date | string | null
  updatedDate?: Date | string | null
  lastLoginTime?: Date | string | null
  lastLogoutTime?: Date | string | null
  createdByUser?: { userId: number; userName: string | null; displayName: string | null } | null
  updatedByUser?: { userId: number; userName: string | null; displayName: string | null } | null
  employee: EmployeeInfo | null
}
interface ActorInfo {
  userId: number
  roleId: number
}

type FieldErrors = Partial<Record<keyof UserAccessFormInput, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[A-Za-z0-9._-]{4,50}$/
const GENDER_OPTIONS = GENDERS.map(value => ({ value, label: value }))
const STATUS_OPTIONS = STATUSES.map(value => ({ value, label: value }))

function CharacterCount({ value, maxLength }: { value: string; maxLength: number }) {
  return <div className="mt-1 text-right text-[11px] text-gray-400" aria-live="polite">{value.length}/{maxLength}</div>
}

function CountedInput({ value = '', maxLength, ...props }: Omit<ComponentProps<typeof Input>, 'value' | 'maxLength'> & { value?: string; maxLength: number }) {
  return <div><Input {...props} value={value} maxLength={maxLength} /><CharacterCount value={value} maxLength={maxLength} /></div>
}

function formatAddress(employee: EmployeeInfo | null) {
  if (!employee) return '—'

  const parts = [
    employee.empAddress?.trim(),
    employee.empCity?.trim(),
    employee.indianStatesMaster?.statename?.trim(),
    employee.empPincode?.trim(),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : '—'
}

function contactMobile(row: UserRow) {
  return row.employee?.empMobileNo?.trim() || '—'
}

function contactEmail(row: UserRow) {
  return row.employee?.empEmailId?.trim() || row.emailId?.trim() || '—'
}

function userDisplayName(row: UserRow) {
  const employeeName = `${row.employee?.empFirstName ?? ''} ${row.employee?.empLastName ?? ''}`.trim()
  return row.displayName?.trim() || employeeName || row.userName?.trim() || `#${row.userId}`
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function auditUserName(user?: { userName: string | null; displayName: string | null } | null) {
  return user?.displayName?.trim() || user?.userName?.trim() || '—'
}

interface DropdownOption {
  value: string
  label: string
}

function FieldMessage({ message }: { message?: string }) {
  return <div className={`min-h-[18px] text-xs ${message ? 'text-red-600' : 'text-transparent'}`}>{message ?? '.'}</div>
}

function DropdownField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  errorMessage,
  searchable = false,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder: string
  error?: boolean
  errorMessage?: string
  searchable?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selected = options.find(option => option.value === value)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const filteredOptions = useMemo(() => {
    if (!searchable) return options
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter(option => option.label.toLowerCase().includes(normalizedQuery))
  }, [options, query, searchable])

  return (
    <div className="flex flex-col" ref={rootRef}>
      <label className="text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            setOpen(prev => !prev)
            setQuery('')
          }}
          className={`w-full rounded-md border px-3 py-2.5 text-left text-sm transition-all ${
            error
              ? 'border-red-500 bg-red-50/40 text-gray-800'
              : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
          } ${disabled ? 'cursor-not-allowed bg-gray-50 text-gray-400' : 'cursor-pointer'} ${open ? 'ring-2 ring-[#1B2A6B]/15 border-[#1B2A6B]' : ''}`}
        >
          <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{selected?.label ?? placeholder}</span>
          <ChevronDown className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && !disabled && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
            {searchable && (
              <div className="border-b border-gray-100 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-[#1B2A6B] focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                  setQuery('')
                }}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50"
              >
                <span>{placeholder}</span>
                {!selected && <Check className="h-4 w-4 text-[#1B2A6B]" />}
              </button>

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-400">No options found.</div>
              ) : (
                filteredOptions.map(option => {
                  const isSelected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                        isSelected ? 'bg-blue-50 text-[#1B2A6B]' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
      <FieldMessage message={errorMessage} />
    </div>
  )
}

function emptyForm(): UserAccessFormInput {
  return {
    empFirstName: '', empLastName: '', empGender: 'M', empMobileNo: '', empPhoneNo: '', empEmailId: '',
    empAddress: '', empCity: '', fkStateId: null, empPincode: '', userName: '', password: '', roleId: null, status: 'Active',
  }
}

function ViewField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm text-gray-800">{value?.trim() ? value : '—'}</div>
    </div>
  )
}

export function UserAccessClient({
  initialData,
  total,
  page,
  pageCount,
  search,
  status,
  roleId,
  stateId,
  roles,
  filterRoles,
  states,
  actor,
}: {
  initialData: UserRow[]
  total: number
  page: number
  pageCount: number
  search: string
  status: string
  roleId: string
  stateId: string
  roles: RoleOption[]
  filterRoles: RoleOption[]
  states: StateOption[]
  actor: ActorInfo
}) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [viewRow, setViewRow] = useState<UserRow | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(JSON.stringify(emptyForm()))
  const [form, setForm] = useState<UserAccessFormInput>(emptyForm())
  const [editId, setEditId] = useState<number | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()
  const [isRoutePending, startRouteTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const roleOptions = useMemo<DropdownOption[]>(() => roles.map(role => ({ value: String(role.roleId), label: role.roleName ?? `Role #${role.roleId}` })), [roles])
  const filterRoleOptions = useMemo<DropdownOption[]>(() => filterRoles.map(role => ({ value: String(role.roleId), label: role.roleName ?? `Role #${role.roleId}` })), [filterRoles])
  const stateOptions = useMemo<DropdownOption[]>(() => states.map(state => ({ value: String(state.stateId), label: state.statename })), [states])

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const activeFilterCount = useMemo(
    () => [
      search.trim() ? 1 : 0,
      status !== 'All' ? 1 : 0,
      roleId ? 1 : 0,
      stateId ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0),
    [roleId, search, stateId, status],
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!modal) return false
    return JSON.stringify(form) !== savedFormSnapshot
  }, [form, modal, savedFormSnapshot])

  const canManageRow = (row: UserRow) => row.status === 'Active' && row.userId !== actor.userId && row.roleId != null && row.roleId > actor.roleId

  const pushQuery = (params: Record<string, string>) => {
    const q = new URLSearchParams({ search, status, roleId, stateId, page: '1', ...params })
    for (const [key, value] of [...q.entries()]) {
      if (!value || value === 'All') q.delete(key)
    }
    startRouteTransition(() => {
      router.push(`/config/user-access${q.toString() ? `?${q.toString()}` : ''}`)
    })
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery({ search: searchInput }), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const closeForm = () => {
    setModal(null)
    setDiscardOpen(false)
    setError('')
    setFieldErrors({})
  }

  const requestCloseForm = () => {
    if (isPending) return
    if (hasUnsavedChanges) {
      setDiscardOpen(true)
      return
    }
    closeForm()
  }

  const openAdd = () => {
    const nextForm = emptyForm()
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setEditId(null)
    setError('')
    setFieldErrors({})
    setModal('add')
  }
  const openEdit = (r: UserRow) => {
    const nextForm = {
      empFirstName: r.employee?.empFirstName ?? '', empLastName: r.employee?.empLastName ?? '', empGender: r.employee?.empGender ?? 'M',
      empMobileNo: r.employee?.empMobileNo ?? '', empPhoneNo: r.employee?.empPhoneNo ?? '', empEmailId: r.employee?.empEmailId ?? r.emailId ?? '',
      empAddress: r.employee?.empAddress ?? '', empCity: r.employee?.empCity ?? '', fkStateId: r.employee?.fkStateId ?? null, empPincode: r.employee?.empPincode ?? '',
      userName: r.userName ?? '', password: '', roleId: r.roleId, status: r.status ?? 'Active',
    }
    setForm(nextForm)
    setSavedFormSnapshot(JSON.stringify(nextForm))
    setEditId(r.userId)
    setError('')
    setFieldErrors({})
    setModal('edit')
  }

  const f = <K extends keyof UserAccessFormInput>(k: K, v: UserAccessFormInput[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
    setFieldErrors(prev => {
      if (!prev[k]) return prev
      const next = { ...prev }
      delete next[k]
      return next
    })
  }

  function validateForm(input: UserAccessFormInput, mode: 'create' | 'update'): { fields: FieldErrors } {
    const fields: FieldErrors = {}
    const trimmedFirstName = input.empFirstName.trim()
    const trimmedLastName = input.empLastName.trim()
    const trimmedGender = input.empGender.trim().toUpperCase()
    const trimmedMobile = input.empMobileNo.trim()
    const trimmedPhone = input.empPhoneNo.trim()
    const trimmedEmail = input.empEmailId.trim()
    const trimmedPincode = input.empPincode.trim()
    const trimmedUserName = input.userName.trim()
    const trimmedPassword = input.password.trim()

    if (!trimmedFirstName) fields.empFirstName = 'First name is required.'
    if (!trimmedLastName) fields.empLastName = 'Last name is required.'
    if (!trimmedMobile) fields.empMobileNo = 'Mobile number is required.'
    if (!trimmedEmail) fields.empEmailId = 'Email is required.'
    if (!input.roleId) fields.roleId = 'Please select a role.'
    if (!['M', 'F'].includes(trimmedGender)) fields.empGender = 'Please select a valid gender.'
    if (trimmedMobile && !/^\d{10}$/.test(trimmedMobile)) fields.empMobileNo = 'Mobile number must be exactly 10 digits.'
    if (trimmedPhone && !/^\d{6,10}$/.test(trimmedPhone)) fields.empPhoneNo = 'Phone number must be 6 to 10 digits.'
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) fields.empEmailId = 'Enter a valid email address.'
    if (trimmedPincode && !/^\d{6}$/.test(trimmedPincode)) fields.empPincode = 'Pincode must be exactly 6 digits.'
    if (mode === 'create' && !trimmedUserName) {
      fields.userName = 'Username is required.'
    } else if (trimmedUserName && !USERNAME_RE.test(trimmedUserName)) {
      fields.userName = 'Use 4 to 50 characters with letters, numbers, dots, underscores, or hyphens.'
    }
    if (mode === 'create' && !trimmedPassword) {
      fields.password = 'Password is required.'
    } else if (trimmedPassword && passwordPolicyError(trimmedPassword)) {
      fields.password = PASSWORD_POLICY_MESSAGE
    }

    return { fields }
  }

  const save = () => {
    const validation = validateForm(form, editId ? 'update' : 'create')
    if (Object.keys(validation.fields).length > 0) {
      setFieldErrors(validation.fields)
      setError('')
      return
    }
    setError('')
    setFieldErrors({})
    startTransition(async () => {
      const result = editId ? await updateUserAccount(editId, form) : await createUserAccount(form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      closeForm()
      router.refresh()
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
        subtitle={`${total.toLocaleString('en-IN')} accounts${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
        action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add User</Btn>}
      />

      <div className="relative mb-4 space-y-3">
        <LoadingOverlay show={isRoutePending} label="Loading users..." subtle />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Name, username, email, mobile..." disabled={isRoutePending} />
          <DropdownField label="Status" value={status === 'All' ? '' : status} onChange={value => pushQuery({ status: value || 'All' })} options={STATUS_OPTIONS} placeholder="All Statuses" disabled={isRoutePending} />
          <DropdownField label="Role" value={roleId} onChange={value => pushQuery({ roleId: value })} options={filterRoleOptions} placeholder="All Roles" searchable disabled={isRoutePending} />
          <DropdownField label="State" value={stateId} onChange={value => pushQuery({ stateId: value })} options={stateOptions} placeholder="All States" searchable disabled={isRoutePending} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-600">
            {activeFilterCount > 0
              ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`
              : `No filters applied${pageCount > 1 ? ` · Page ${page} of ${pageCount}` : ''}`}
          </div>
          <Btn
            variant="outline"
            size="sm"
            onClick={() => pushQuery({ search: '', status: 'All', roleId: '', stateId: '', page: '1' })}
            disabled={isRoutePending || (!search.trim() && status === 'All' && !roleId && !stateId)}
          >
            Clear filters
          </Btn>
        </div>
      </div>

      <div className="relative">
        <LoadingOverlay show={isRoutePending} label="Loading users..." />
        <Table headers={['User ID', 'Employee ID', 'Name', 'Username', 'Contact', 'Address', 'Role', 'Status', 'Actions']} empty={data.length === 0}>
          {data.map(r => (
            <tr key={r.userId} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 text-sm text-gray-600 font-mono">{r.userId}</td>
              <td className="px-4 py-3 text-sm text-gray-600 font-mono">{r.employee?.empId ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{userDisplayName(r)}</td>
              <td className="px-4 py-3 text-sm text-gray-700 font-mono">{r.userName ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-700">{contactMobile(r)}</div>
                <div className="text-xs text-gray-500">{contactEmail(r)}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">{formatAddress(r.employee)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{r.roleName ?? '—'}</td>
              <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewRow(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canManageRow(r) && (
                    <>
                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeactivateId(r.userId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Deactivate"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Showing {((page - 1) * USER_ACCESS_PAGE_SIZE) + (data.length ? 1 : 0)}-{((page - 1) * USER_ACCESS_PAGE_SIZE) + data.length} of {total.toLocaleString('en-IN')} · Page {page} of {pageCount}
          </div>
          <div className="flex gap-1.5">
            <Btn variant="outline" size="sm" disabled={isRoutePending || page <= 1} onClick={() => pushQuery({ page: String(page - 1) })}>
              <ChevronLeft className="w-3.5 h-3.5" />Prev
            </Btn>
            <Btn variant="outline" size="sm" disabled={isRoutePending || page >= pageCount} onClick={() => pushQuery({ page: String(page + 1) })}>
              Next<ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      )}

      <Modal
        title={`View User${viewRow ? ` — ${userDisplayName(viewRow)}` : ''}`}
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        width="max-w-4xl"
      >
        {viewRow ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account Summary</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ViewField label="Name" value={userDisplayName(viewRow)} />
                <ViewField label="Username" value={viewRow.userName} />
                <ViewField label="Role" value={viewRow.roleName} />
                <ViewField label="Status" value={viewRow.status} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Personal Details</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ViewField label="First Name" value={viewRow.employee?.empFirstName} />
                <ViewField label="Last Name" value={viewRow.employee?.empLastName} />
                <ViewField label="Gender" value={viewRow.employee?.empGender} />
                <ViewField label="Mobile" value={viewRow.employee?.empMobileNo} />
                <ViewField label="Phone" value={viewRow.employee?.empPhoneNo} />
                <ViewField label="Email" value={viewRow.employee?.empEmailId ?? viewRow.emailId} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ViewField label="Address" value={viewRow.employee?.empAddress} />
                <ViewField label="City" value={viewRow.employee?.empCity} />
                <ViewField label="State" value={viewRow.employee?.indianStatesMaster?.statename} />
                <ViewField label="Pincode" value={viewRow.employee?.empPincode} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audit</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ViewField label="Created At" value={formatDateTime(viewRow.createdDate)} />
                <ViewField label="Created By" value={auditUserName(viewRow.createdByUser)} />
                <ViewField label="Updated At" value={formatDateTime(viewRow.updatedDate)} />
                <ViewField label="Updated By" value={auditUserName(viewRow.updatedByUser)} />
                <ViewField label="Last Login" value={formatDateTime(viewRow.lastLoginTime)} />
                <ViewField label="Last Logout" value={formatDateTime(viewRow.lastLogoutTime)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Btn variant="outline" onClick={() => setViewRow(null)}>Close</Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal title={editId ? 'Edit User' : 'Add User'} open={!!modal} onClose={requestCloseForm} width="max-w-3xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <CountedInput label="First Name *" value={form.empFirstName} onChange={e => f('empFirstName', e.target.value)} error={!!fieldErrors.empFirstName} maxLength={50} />
              <FieldMessage message={fieldErrors.empFirstName} />
            </div>
            <div>
              <CountedInput label="Last Name *" value={form.empLastName} onChange={e => f('empLastName', e.target.value)} error={!!fieldErrors.empLastName} maxLength={50} />
              <FieldMessage message={fieldErrors.empLastName} />
            </div>
            <DropdownField label="Gender" value={form.empGender} onChange={value => f('empGender', value)} options={GENDER_OPTIONS} placeholder="Select Gender" error={!!fieldErrors.empGender} errorMessage={fieldErrors.empGender} />
            <div>
              <CountedInput label="Mobile *" value={form.empMobileNo} onChange={e => f('empMobileNo', e.target.value.replace(/\D/g, '').slice(0, 10))} error={!!fieldErrors.empMobileNo} inputMode="numeric" maxLength={10} />
              <FieldMessage message={fieldErrors.empMobileNo} />
            </div>
            <div>
              <CountedInput label="Phone" value={form.empPhoneNo} onChange={e => f('empPhoneNo', e.target.value.replace(/\D/g, '').slice(0, 10))} error={!!fieldErrors.empPhoneNo} inputMode="numeric" maxLength={10} />
              <FieldMessage message={fieldErrors.empPhoneNo} />
            </div>
            <div>
              <CountedInput label="Email *" type="email" value={form.empEmailId} onChange={e => f('empEmailId', e.target.value)} error={!!fieldErrors.empEmailId} maxLength={100} />
              <FieldMessage message={fieldErrors.empEmailId} />
            </div>
            <div>
              <CountedInput label="City" value={form.empCity} onChange={e => f('empCity', e.target.value)} maxLength={50} />
              <FieldMessage />
            </div>
            <DropdownField label="State" value={form.fkStateId ? String(form.fkStateId) : ''} onChange={value => f('fkStateId', Number(value) || null)} options={stateOptions} placeholder="Select State" searchable />
            <div>
              <CountedInput label="Pincode" value={form.empPincode} onChange={e => f('empPincode', e.target.value.replace(/\D/g, '').slice(0, 6))} error={!!fieldErrors.empPincode} inputMode="numeric" maxLength={6} />
              <FieldMessage message={fieldErrors.empPincode} />
            </div>
          </div>
          <div>
            <CountedInput label="Address" value={form.empAddress} onChange={e => f('empAddress', e.target.value)} maxLength={200} />
            <FieldMessage />
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-4">
            <div>
              <CountedInput label="Username *" value={form.userName} onChange={e => f('userName', e.target.value)} error={!!fieldErrors.userName} disabled={!!editId} className={editId ? 'bg-gray-50' : ''} maxLength={50} />
              <FieldMessage message={fieldErrors.userName} />
            </div>
            <div>
              <CountedInput label={editId ? 'New Password (leave blank to keep)' : 'Password *'} type="password" value={form.password} onChange={e => f('password', e.target.value)} error={!!fieldErrors.password} maxLength={PROFILE_FIELD_LIMITS.password} />
              <FieldMessage message={fieldErrors.password} />
            </div>
            <DropdownField label="Role *" value={form.roleId ? String(form.roleId) : ''} onChange={value => f('roleId', Number(value) || null)} options={roleOptions} placeholder="Select Role" error={!!fieldErrors.roleId} errorMessage={fieldErrors.roleId} searchable />
            {editId && (
              <DropdownField label="Status" value={form.status} onChange={value => f('status', value)} options={STATUS_OPTIONS} placeholder="Select Status" />
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={requestCloseForm}>Cancel</Btn>
            <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save User'}</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deactivateId !== null} onClose={() => setDeactivateId(null)} onConfirm={deactivate}
        message="Deactivate this user account? They will no longer be able to sign in." />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={closeForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved changes in this user access form. Discard them and close?"
      />
    </div>
  )
}
