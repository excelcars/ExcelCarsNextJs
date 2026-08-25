'use client'

import { useEffect, useRef, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Input, Btn } from '@/components/ui'
import { quickCreateCustomer } from '@/features/customers/actions'

interface CustomerOption {
  custId: number
  custName: string
  custMobile: string | null
  custEmail: string | null
}

export function CustomerPicker({
  value,
  onChange,
  error: pickerError,
}: {
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  error?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerOption[]>([])
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`)
        const payload = await res.json()
        if (requestIdRef.current !== requestId) return
        if (!res.ok) {
          setResults([])
          setError(payload.error ?? 'Could not load customers.')
          return
        }
        setResults(payload)
      } catch {
        if (requestIdRef.current !== requestId) return
        setResults([])
        setError('Could not load customers.')
      } finally {
        if (requestIdRef.current === requestId) setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const selectCustomer = (c: CustomerOption) => {
    onChange(c)
    setOpen(false)
    setQuery('')
    setResults([])
    setLoading(false)
    setError('')
  }

  const createCustomer = async () => {
    setCreateError('')
    setCreating(true)
    const result = await quickCreateCustomer({ custName: newName, custMobile: newMobile, custEmail: newEmail })
    setCreating(false)
    if (result.success && result.custId) {
      selectCustomer({ custId: result.custId, custName: newName, custMobile: newMobile || null, custEmail: newEmail || null })
      setShowCreate(false)
      setNewName(''); setNewMobile(''); setNewEmail('')
      setCreateError('')
      return
    }
    setCreateError(result.error ?? 'Could not create customer.')
  }

  if (value) {
    return (
      <div className={`flex items-center justify-between border ${pickerError ? 'border-red-500' : 'border-gray-200'} rounded-md px-3 py-2 bg-gray-50`}>
        <div>
          <div className="text-sm font-medium text-gray-800">{value.custName}</div>
          <div className="text-xs text-gray-500">{value.custMobile ?? '—'} {value.custEmail ? `· ${value.custEmail}` : ''}</div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        placeholder="Search customer by name or mobile..."
        value={query}
        onChange={e => {
          requestIdRef.current += 1
          setQuery(e.target.value)
          setOpen(true)
          setError('')
        }}
        onFocus={() => setOpen(true)}
        error={pickerError}
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">Loading customers...</div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-500">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          ) : results.map(c => (
            <button
              key={c.custId}
              type="button"
              onClick={() => selectCustomer(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              <div className="font-medium text-gray-800">{c.custName}</div>
              <div className="text-xs text-gray-500">{c.custMobile ?? '—'}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setShowCreate(true); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-[#1B2A6B] font-medium hover:bg-gray-50 flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Create new customer
          </button>
        </div>
      )}

      {showCreate && (
        <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          <Input label="Name *" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input label="Mobile" value={newMobile} onChange={e => setNewMobile(e.target.value)} />
          <Input label="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <div className="text-xs text-gray-500">Enter at least one: mobile or email.</div>
          {createError && <div className="text-xs text-red-600">{createError}</div>}
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" size="sm" onClick={() => { setShowCreate(false); setCreateError('') }}>Cancel</Btn>
            <Btn size="sm" onClick={createCustomer} disabled={creating || !newName.trim() || (!newMobile.trim() && !newEmail.trim())}>{creating ? 'Creating...' : 'Create'}</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
