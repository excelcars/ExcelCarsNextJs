'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui'

export function DealerNameAutocomplete({
  value,
  onChange,
  error = false,
}: {
  value: string
  onChange: (value: string) => void
  error?: boolean
}) {
  const [results, setResults] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noMatchDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (noMatchDismissRef.current) clearTimeout(noMatchDismissRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setLoading(false)
      setLookupError('')
      return
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setLookupError('')
      try {
        const response = await fetch(`/api/dealers/names?q=${encodeURIComponent(value)}`)
        const payload: unknown = await response.json()
        if (requestIdRef.current !== requestId) return
        if (!response.ok || !Array.isArray(payload)) {
          setResults([])
          setLookupError(typeof payload === 'object' && payload && 'error' in payload ? String(payload.error) : 'Could not load dealer names.')
          return
        }
        const names = payload.filter((name): name is string => typeof name === 'string')
        setResults(names)
        if (names.length === 0) {
          noMatchDismissRef.current = setTimeout(() => {
            if (requestIdRef.current === requestId) setOpen(false)
          }, 1800)
        }
      } catch {
        if (requestIdRef.current !== requestId) return
        setResults([])
        setLookupError('Could not load dealer names.')
      } finally {
        if (requestIdRef.current === requestId) setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (noMatchDismissRef.current) clearTimeout(noMatchDismissRef.current)
    }
  }, [value])

  const selectName = (name: string) => {
    onChange(name)
    setOpen(false)
    setResults([])
    setLookupError('')
    if (noMatchDismissRef.current) clearTimeout(noMatchDismissRef.current)
  }

  return (
    <div className="relative">
      <Input
        label="Name *"
        value={value}
        onChange={event => {
          requestIdRef.current += 1
          if (noMatchDismissRef.current) clearTimeout(noMatchDismissRef.current)
          onChange(event.target.value)
          setOpen(true)
          setLookupError('')
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        error={error}
      />
      {open && value.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg max-h-56" role="listbox">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-400">Loading dealer names...</div>
          ) : lookupError ? (
            <div className="px-3 py-2 text-sm text-red-500">{lookupError}</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matching dealer names</div>
          ) : results.map(name => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={value === name}
              onClick={() => selectName(name)}
              className="w-full border-b border-gray-50 px-3 py-2 text-left text-sm text-gray-800 last:border-0 hover:bg-gray-50"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
