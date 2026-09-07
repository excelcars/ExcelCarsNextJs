'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export function FormDropdown({
  label, value, options, placeholder, onChange, disabled = false, allowClear = false, error = false, className = '',
}: {
  label?: ReactNode
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
  allowClear?: boolean
  error?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const available = value && !options.some(option => option.value === value) ? [{ value, label: value }, ...options] : options
  const matches = query.trim() ? available.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase())) : available

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const select = (next: string) => { onChange(next); setQuery(''); setOpen(false) }
  const selected = available.find(option => option.value === value)?.label

  return <div ref={rootRef} className={`relative flex flex-col gap-1 ${className}`}>
    {label ? <label className="text-xs font-medium text-gray-600">{label}</label> : null}
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => { if (!disabled) { setOpen(current => !current); setQuery('') } }} className={`flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm text-gray-800 outline-none focus:ring-1 focus:ring-[#1B2A6B] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${error ? 'border-red-500' : 'border-gray-200'}`}>
      <span className={value ? '' : 'text-gray-400'}>{selected || placeholder}</span><ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open ? <div className="absolute z-30 mt-1 w-full min-w-64 max-w-[calc(100vw-3rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 p-2"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><input autoFocus autoComplete="new-password" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} placeholder="Search options..." className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B]" /></div></div>
      <div role="listbox" className="max-h-52 overflow-y-auto p-1">
        {allowClear ? <button type="button" role="option" aria-selected={!value} onClick={() => select('')} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-[#1B2A6B]' : 'text-gray-700'}`}>{placeholder}</button> : null}
        {matches.map(option => <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => select(option.value)} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${value === option.value ? 'bg-blue-50 font-medium text-[#1B2A6B]' : 'text-gray-700'}`}>{option.label}</button>)}
        {matches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No matching options.</div> : null}
      </div>
    </div> : null}
  </div>
}
