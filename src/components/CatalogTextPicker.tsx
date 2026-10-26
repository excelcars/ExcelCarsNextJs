'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui'

export function CatalogTextPicker({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  errorMessage,
  onAdd,
}: {
  label: ReactNode
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: string[]
  error?: boolean
  errorMessage?: string
  onAdd?: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return options.slice(0, 15)
    return options.filter(option => option.toLowerCase().includes(q)).slice(0, 15)
  }, [options, value])

  return (
    <div ref={pickerRef} className="relative">
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        autoComplete="new-password"
        onChange={event => { onChange(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        error={error}
        errorMessage={errorMessage}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-64 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg max-h-56">
          {onAdd && value.trim() && (
            <button type="button" onMouseDown={event => { event.preventDefault(); onAdd(value.trim()); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 border-b border-gray-100">
              + Add “{value.trim()}”
            </button>
          )}
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          ) : matches.map(option => (
            <button
              key={option}
              type="button"
              onMouseDown={event => {
                event.preventDefault()
                onChange(option)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
