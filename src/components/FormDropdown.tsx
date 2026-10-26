'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

export function FormDropdown({
  label, value, options, placeholder, onChange, disabled = false, allowClear = false, error = false, errorMessage, className = '',
}: {
  label?: ReactNode
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
  allowClear?: boolean
  error?: boolean
  errorMessage?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>()
  const available = value && !options.some(option => option.value === value) ? [{ value, label: value }, ...options] : options
  const matches = query.trim() ? available.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase())) : available

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (!open) return

    const positionMenu = () => {
      const trigger = rootRef.current?.getBoundingClientRect()
      if (!trigger) return

      const viewportPadding = 24
      const preferredHeight = 264
      const spaceBelow = window.innerHeight - trigger.bottom - 8
      const spaceAbove = trigger.top - 8
      const openBelow = spaceBelow >= spaceAbove || spaceBelow >= preferredHeight
      const availableHeight = Math.max(0, Math.min(preferredHeight, openBelow ? spaceBelow : spaceAbove))
      const width = Math.min(Math.max(trigger.width, 256), window.innerWidth - viewportPadding * 2)

      setMenuStyle({
        position: 'fixed',
        left: Math.max(viewportPadding, Math.min(trigger.left, window.innerWidth - viewportPadding - width)),
        ...(openBelow ? { top: trigger.bottom + 8 } : { bottom: window.innerHeight - trigger.top + 8 }),
        width,
        maxHeight: availableHeight,
      })
    }

    positionMenu()
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [open])

  const select = (next: string) => { onChange(next); setQuery(''); setOpen(false) }
  const selected = available.find(option => option.value === value)?.label

  return <div ref={rootRef} className={`relative flex flex-col gap-1 ${className}`}>
    {label ? <label className="text-sm font-medium text-gray-600">{label}</label> : null}
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => { if (!disabled) { setOpen(current => !current); setQuery('') } }} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm text-gray-800 outline-none focus:ring-1 focus:ring-[#1B2A6B] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${error ? 'border-red-500' : 'border-gray-200'}`}>
      <span className={`min-w-0 break-words ${value ? '' : 'text-gray-400'}`}>{selected || placeholder}</span><ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {error && errorMessage ? <span className="text-sm text-red-600">{errorMessage}</span> : null}
    {open && menuStyle && typeof document !== 'undefined' ? createPortal(
      <div ref={menuRef} className="z-[100] flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg" style={menuStyle}>
        <div className="shrink-0 border-b border-gray-100 p-2"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><input autoFocus autoComplete="new-password" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }} placeholder="Search options..." className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B]" /></div></div>
        <div role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
          {allowClear ? <button type="button" role="option" aria-selected={!value} onClick={() => select('')} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${!value ? 'bg-blue-50 text-[#1B2A6B]' : 'text-gray-700'}`}>{placeholder}</button> : null}
          {matches.map(option => <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => select(option.value)} className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 ${value === option.value ? 'bg-blue-50 font-medium text-[#1B2A6B]' : 'text-gray-700'}`}>{option.label}</button>)}
          {matches.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No matching options.</div> : null}
        </div>
      </div>,
      document.body,
    ) : null}
  </div>
}
