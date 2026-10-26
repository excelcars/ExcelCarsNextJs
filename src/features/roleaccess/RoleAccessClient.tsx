'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, RefreshCcw, Save, Plus, Pencil, Trash2, History } from 'lucide-react'
import { ActionAlert, Btn, ConfirmDialog, Input, LoadingOverlay, Modal, PageHeader, SearchBar } from '@/components/ui'
import { APP_ACCESS_CATALOG, ROLE_ACCESS_FUNCTION, USER_ACCESS_FUNCTION } from '@/lib/access/accessCatalog'
import { createRole, deleteRole, saveRoleAccess, updateRole } from './actions'
import type { RoleAccessActor, RoleAccessFunctionRow, RoleAccessMappingRow, RoleAccessRoleRow } from './queries'

interface PermissionItem {
  group: string
  label: string
  functionName: string
  route: string
  description?: string
  existsInDb: boolean
}

function groupPermissions(items: PermissionItem[]) {
  const grouped = new Map<string, PermissionItem[]>()
  for (const item of items) {
    const current = grouped.get(item.group) ?? []
    current.push(item)
    grouped.set(item.group, current)
  }
  return [...grouped.entries()]
}

export function RoleAccessClient({
  roles,
  accessFunctions,
  mappings,
  actor,
}: {
  roles: RoleAccessRoleRow[]
  accessFunctions: RoleAccessFunctionRow[]
  mappings: RoleAccessMappingRow[]
  actor: RoleAccessActor
}) {
  const router = useRouter()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(roles[0]?.roleId ?? null)
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null)
  const [roleSearch, setRoleSearch] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [draftFunctionNames, setDraftFunctionNames] = useState<string[]>([])
  const [savedFunctionNames, setSavedFunctionNames] = useState<string[]>([])
  const [discardOpen, setDiscardOpen] = useState(false)
  const [roleModal, setRoleModal] = useState<null | 'add' | 'edit'>(null)
  const [roleNameInput, setRoleNameInput] = useState('')
  const [roleFormError, setRoleFormError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isRoutePending, startRouteTransition] = useTransition()

  const accessFunctionNameSet = useMemo(
    () => new Set(accessFunctions.map(item => item.accessFunctionName).filter(Boolean) as string[]),
    [accessFunctions],
  )

  const permissionItems = useMemo<PermissionItem[]>(() => {
    const known = APP_ACCESS_CATALOG.map(item => ({
      ...item,
      existsInDb: accessFunctionNameSet.has(item.functionName),
    }))

    const knownNames = new Set(known.map(item => item.functionName))
    const extras = accessFunctions
      .filter(item => item.accessFunctionName && !knownNames.has(item.accessFunctionName))
      .map(item => ({
        group: 'Configuration',
        label: item.accessFunctionName as string,
        functionName: item.accessFunctionName as string,
        route: '—',
        description: 'Existing function found in the database but not mapped in the app catalog yet.',
        existsInDb: true,
      }))

    return [...known, ...extras]
  }, [accessFunctionNameSet, accessFunctions])

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase()
    return roles.filter(role => !q || `${role.roleName ?? ''} ${role.roleId}`.toLowerCase().includes(q))
  }, [roleSearch, roles])

  const selectedRole = roles.find(role => role.roleId === selectedRoleId) ?? null

  const selectedRoleMappings = useMemo(() => {
    if (!selectedRoleId) return []
    return mappings
      .filter(mapping => mapping.roleId === selectedRoleId && mapping.accessFunctionName)
      .map(mapping => mapping.accessFunctionName as string)
      .sort()
  }, [mappings, selectedRoleId])

  useEffect(() => {
    setSavedFunctionNames(selectedRoleMappings)
    setDraftFunctionNames(selectedRoleMappings)
  }, [selectedRoleMappings, selectedRoleId])

  useEffect(() => {
    if (!success) return
    const dismissTimer = setTimeout(() => setSuccess(''), 5000)
    return () => clearTimeout(dismissTimer)
  }, [success])

  useEffect(() => {
    if (selectedRoleId || roles.length === 0) return
    setSelectedRoleId(roles[0].roleId)
  }, [roles, selectedRoleId])

  const isDirty = useMemo(() => {
    if (draftFunctionNames.length !== savedFunctionNames.length) return true
    const current = [...draftFunctionNames].sort().join('|')
    const saved = [...savedFunctionNames].sort().join('|')
    return current !== saved
  }, [draftFunctionNames, savedFunctionNames])

  const filteredPermissionItems = useMemo(() => {
    const q = permissionSearch.trim().toLowerCase()
    return permissionItems.filter(item => {
      if (!q) return true
      return (
        item.label.toLowerCase().includes(q) ||
        item.functionName.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q)
      )
    })
  }, [permissionItems, permissionSearch])

  const groupedPermissions = useMemo(() => groupPermissions(filteredPermissionItems), [filteredPermissionItems])

  const toggleFunction = (functionName: string) => {
    setDraftFunctionNames(prev => (
      prev.includes(functionName)
        ? prev.filter(item => item !== functionName)
        : [...prev, functionName]
    ))
  }

  const toggleGroup = (groupName: string, checked: boolean) => {
    const groupFunctionNames = filteredPermissionItems
      .filter(item => item.group === groupName)
      .map(item => item.functionName)

    setDraftFunctionNames(prev => {
      const next = new Set(prev)
      for (const functionName of groupFunctionNames) {
        if (checked) next.add(functionName)
        else next.delete(functionName)
      }
      return [...next]
    })
  }

  const requestRoleChange = (nextRoleId: number) => {
    if (nextRoleId === selectedRoleId) return
    if (isPending) return
    if (isDirty) {
      setPendingRoleId(nextRoleId)
      setDiscardOpen(true)
      return
    }
    setError('')
    setSuccess('')
    setSelectedRoleId(nextRoleId)
  }

  const confirmDiscardAndSwitchRole = () => {
    setDiscardOpen(false)
    if (pendingRoleId) {
      setError('')
      setSuccess('')
      setSelectedRoleId(pendingRoleId)
    }
    setPendingRoleId(null)
  }

  const resetCurrentRole = () => {
    setDraftFunctionNames(savedFunctionNames)
    setError('')
    setSuccess('')
  }

  const openAddRole = () => {
    setRoleNameInput('')
    setRoleFormError('')
    setRoleModal('add')
  }

  const openEditRole = (role: RoleAccessRoleRow) => {
    setRoleNameInput(role.roleName ?? '')
    setRoleFormError('')
    setRoleModal('edit')
  }

  const saveRoleName = () => {
    if (roleModal === 'edit' && !selectedRoleId) {
      setRoleFormError('Select a role first.')
      return
    }

    setRoleFormError('')
    startTransition(async () => {
      const result = roleModal === 'add'
        ? await createRole(roleNameInput)
        : await updateRole(selectedRoleId as number, roleNameInput)

      if (!result.success) {
        const message = result.error ?? `Could not ${roleModal === 'add' ? 'create' : 'update'} role.`
        setRoleFormError(message)
        setSaveFeedback({ type: 'error', message })
        return
      }

      setSaveFeedback({ type: 'success', message: `Role ${roleModal === 'add' ? 'created' : 'updated'} successfully.` })

      setRoleModal(null)
      setRoleNameInput('')
      if (result.roleId) setSelectedRoleId(result.roleId)
      router.refresh()
    })
  }

  const save = () => {
    if (!selectedRoleId) {
      setError('Select a role first.')
      return
    }

    setError('')
    setSuccess('')
    startTransition(async () => {
      try {
        const result = await saveRoleAccess(selectedRoleId, draftFunctionNames)
        if (!result.success) {
          const message = result.error ?? 'Could not save role access.'
          setError(message)
          setSaveFeedback({ type: 'error', message })
          return
        }
        const next = [...draftFunctionNames].sort()
        setSavedFunctionNames(next)
        setDraftFunctionNames(next)
        setSuccess('Role access saved successfully.')
        setSaveFeedback({ type: 'success', message: 'Role access saved successfully.' })
      } catch {
        const message = 'A server error occurred while saving role access.'
        setError(message)
        setSaveFeedback({ type: 'error', message })
      }
    })
  }

  const handleDeleteRole = () => {
    if (!selectedRoleId) return

    setError('')
    setSuccess('')
    startTransition(async () => {
      const result = await deleteRole(selectedRoleId)
      if (!result.success) {
        const message = result.error ?? 'Could not delete role.'
        setError(message)
        setDeleteFeedback({ type: 'error', message })
        setDeleteConfirmOpen(false)
        return
      }
      setSelectedRoleId(null)
      setSuccess('Role deleted successfully.')
      setDeleteFeedback({ type: 'success', message: 'Role deleted successfully.' })
      setDeleteConfirmOpen(false)
      router.refresh()
    })
  }

  const currentRoleHasCriticalAccess = (functionName: string) => savedFunctionNames.includes(functionName)

  return (
    <div>
      <PageHeader
        title="Role Access"
        subtitle={`Manage page and module access by role${actor.grantedFunctionName === USER_ACCESS_FUNCTION ? ' · bootstrap access granted via User Access permission' : ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="outline" onClick={openAddRole} disabled={isPending}>
              <Plus className="h-3.5 w-3.5" />Add Role
            </Btn>
            <Btn
              variant="outline"
              onClick={() => startRouteTransition(() => router.push('/config/role-access/history'))}
              disabled={isPending || isRoutePending}
            >
              <History className="h-3.5 w-3.5" />{isRoutePending ? 'Opening...' : 'History'}
            </Btn>
            <Btn onClick={save} disabled={isPending || !selectedRoleId || !isDirty}>
              <Save className="h-3.5 w-3.5" />{isPending ? 'Saving...' : 'Save Access'}
            </Btn>
          </div>
        }
      />

      <div className="relative grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <LoadingOverlay show={isPending || isRoutePending} label={isRoutePending ? 'Opening history...' : 'Saving changes...'} />

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-4">
            <div className="text-sm font-semibold text-gray-900">Roles</div>
            <div className="mt-3">
              <SearchBar value={roleSearch} onChange={setRoleSearch} placeholder="Search role..." />
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-2">
            {filteredRoles.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-400">No roles match this search.</div>
            ) : filteredRoles.map(role => {
              const rolePermissionCount = mappings.filter(mapping => mapping.roleId === role.roleId && mapping.accessFunctionName).length
              const active = role.roleId === selectedRoleId
              return (
                <button
                  key={role.roleId}
                  type="button"
                  onClick={() => requestRoleChange(role.roleId)}
                  className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition ${active ? 'border-[#1B2A6B] bg-blue-50' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{role.roleName ?? `Role #${role.roleId}`}</div>
                      <div className="mt-0.5 text-xs text-gray-500">Role ID: {role.roleId}</div>
                    </div>
                    <div className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {rolePermissionCount}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <ShieldCheck className="h-4 w-4 text-[#1B2A6B]" />
                  {selectedRole ? `Access for ${selectedRole.roleName ?? `Role #${selectedRole.roleId}`}` : 'Select a role'}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Choose which app modules and pages this role can access.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="outline" onClick={() => selectedRole && openEditRole(selectedRole)} disabled={isPending || !selectedRole}>
                  <Pencil className="h-3.5 w-3.5" />Edit Role
                </Btn>
                <Btn
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isPending || !selectedRole}
                >
                  <Trash2 className="h-3.5 w-3.5" />Delete Role
                </Btn>
                <Btn variant="outline" onClick={resetCurrentRole} disabled={isPending || !isDirty}>
                  <RefreshCcw className="h-3.5 w-3.5" />Reset
                </Btn>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <SearchBar value={permissionSearch} onChange={setPermissionSearch} placeholder="Search permission, function, route..." />
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                {draftFunctionNames.length} selected
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                {isDirty ? 'Unsaved changes' : 'Saved state'}
              </div>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div role="status" aria-live="polite" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

            {selectedRole ? (
              groupedPermissions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
                  No permissions match this search.
                </div>
              ) : groupedPermissions.map(([groupName, items]) => {
                const checkedCount = items.filter(item => draftFunctionNames.includes(item.functionName)).length
                const allChecked = items.length > 0 && checkedCount === items.length
                return (
                  <div key={groupName} className="rounded-xl border border-gray-200 bg-gray-50/60">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{groupName}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{checkedCount} of {items.length} permissions selected</div>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={e => toggleGroup(groupName, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-[#1B2A6B] focus:ring-[#1B2A6B]"
                        />
                        Select all in section
                      </label>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {items.map(item => {
                        const checked = draftFunctionNames.includes(item.functionName)
                        const isCritical = item.functionName === ROLE_ACCESS_FUNCTION || item.functionName === USER_ACCESS_FUNCTION
                        return (
                          <label key={item.functionName} className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition ${checked ? 'bg-blue-50/70' : 'bg-white hover:bg-gray-50'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFunction(item.functionName)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B2A6B] focus:ring-[#1B2A6B]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-medium text-gray-900">{item.label}</div>
                                {isCritical && currentRoleHasCriticalAccess(item.functionName) && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Critical</span>
                                )}
                                {!item.existsInDb && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Will be created on save</span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">{item.functionName}</div>
                              <div className="mt-0.5 text-xs text-gray-500">Route: {item.route}</div>
                              {item.description ? <div className="mt-1 text-xs text-gray-600">{item.description}</div> : null}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
                Select a role to manage access.
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={discardOpen}
        onClose={() => { setDiscardOpen(false); setPendingRoleId(null) }}
        onConfirm={confirmDiscardAndSwitchRole}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved role access changes. Discard them and switch roles?"
      />
      <ActionAlert result={deleteFeedback} onClose={() => setDeleteFeedback(null)} successTitle="Role deleted" errorTitle="Role not deleted" />
      <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Role saved" errorTitle="Role not saved" />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteRole}
        title="Delete Role"
        confirmLabel="Delete"
        confirmDisabled={isPending}
        cancelDisabled={isPending}
        closeOnConfirm={false}
        message={`Are you sure you want to delete the role "${selectedRole?.roleName ?? ''}"? This action cannot be undone.`}
      />

      <Modal
        title={roleModal === 'edit' ? 'Edit Role' : 'Add Role'}
        open={roleModal !== null}
        onClose={() => { if (!isPending) { setRoleModal(null); setRoleFormError('') } }}
        width="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Role Name *"
            value={roleNameInput}
            onChange={e => setRoleNameInput(e.target.value)}
            maxLength={100}
            error={!!roleFormError}
            errorMessage={roleFormError}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="outline" onClick={() => { setRoleModal(null); setRoleFormError('') }} disabled={isPending}>Cancel</Btn>
            <Btn onClick={saveRoleName} disabled={isPending}>{isPending ? 'Saving...' : roleModal === 'edit' ? 'Save Role' : 'Create Role'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
