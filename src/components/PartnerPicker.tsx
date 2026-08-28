'use client'

import { useEffect, useRef, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Input, Btn } from '@/components/ui'
import { quickCreatePartner } from '@/features/partners/actions'

interface PartnerOption {
  partnerId: number
  name: string
  mobile: string | null
  email: string | null
}

export function PartnerPicker({
  partnerType,
  label,
  value,
  onChange,
  error,
}: {
  partnerType: string
  label: string
  value: PartnerOption | null
  onChange: (partner: PartnerOption | null) => void
  error?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PartnerOption[]>([])
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const useRefRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open && !showCreate) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open, showCreate])

  useEffect(() => {
    if (!open) return
    if (useRefRef.current) clearTimeout(useRefRef.current)
    useRefRef.current = setTimeout(async () => {
      const res = await fetch(`/api/partners/search?partnerType=${encodeURIComponent(partnerType)}&q=${encodeURIComponent(query)}`)
      setResults(await res.json())
    }, 300)
    return () => { if (useRefRef.current) clearTimeout(useRefRef.current) }
  }, [query, open, partnerType])

  const selectPartner = (p: PartnerOption) => {
    onChange(p)
    setOpen(false)
    setQuery('')
  }

  const createPartner = async () => {
    setCreateError('')
    setCreating(true)
    const result = await quickCreatePartner({ partnerType, name: newName, mobile: newMobile, email: newEmail })
    setCreating(false)
    if (result.success && result.partnerId) {
      selectPartner({ partnerId: result.partnerId, name: newName, mobile: newMobile || null, email: newEmail || null })
      setShowCreate(false)
      setNewName(''); setNewMobile(''); setNewEmail('')
      setCreateError('')
      return
    }
    setCreateError(result.error ?? 'Could not create partner.')
  }

  if (value) {
    return (
      <div className={`flex items-center justify-between border ${error ? 'border-red-500' : 'border-gray-200'} rounded-md px-3 py-2 bg-gray-50`}>
        <div>
          <div className="text-sm font-medium text-gray-800">{value.name}</div>
          <div className="text-xs text-gray-500">{value.mobile ?? '—'} {value.email ? `· ${value.email}` : ''}</div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={pickerRef} className="relative">
      <Input
        placeholder={`Search ${label.toLowerCase()} by name or mobile...`}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => {
          if (!pickerRef.current?.contains(document.activeElement)) setOpen(false)
        }, 120)}
        error={error}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          ) : results.map(p => (
            <button
              key={p.partnerId}
              type="button"
              onClick={() => selectPartner(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              <div className="font-medium text-gray-800">{p.name}</div>
              <div className="text-xs text-gray-500">{p.mobile ?? '—'}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setShowCreate(true); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-[#1B2A6B] font-medium hover:bg-gray-50 flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add new {label.toLowerCase()}
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
            <Btn size="sm" onClick={createPartner} disabled={creating || !newName.trim() || (!newMobile.trim() && !newEmail.trim())}>{creating ? 'Creating...' : 'Add'}</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
