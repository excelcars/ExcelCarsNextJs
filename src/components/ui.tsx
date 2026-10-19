'use client'

import { useEffect, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X, ChevronDown, Loader2, Search } from 'lucide-react'

export const R = '#C8102E'
export const N = '#1B2A6B'

export function Badge({ label }: { label: string }) {
  const map: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    Available: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    'In Stock': 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    Sold: 'bg-red-50 text-red-700 ring-red-100 before:bg-red-500',
    Booked: 'bg-blue-50 text-blue-700 ring-blue-100 before:bg-blue-500',
    Reserved: 'bg-blue-50 text-blue-700 ring-blue-100 before:bg-blue-500',
    'In Service': 'bg-amber-50 text-amber-700 ring-amber-100 before:bg-amber-500',
    'Not Available': 'bg-gray-100 text-gray-500 ring-gray-200 before:bg-gray-400',
    'Loan Process': 'bg-purple-50 text-purple-700 ring-purple-100 before:bg-purple-500',
    Inactive: 'bg-gray-100 text-gray-500 ring-gray-200 before:bg-gray-400',
    Hot: 'bg-red-50 text-red-700 ring-red-100 before:bg-red-500',
    Warm: 'bg-orange-50 text-orange-700 ring-orange-100 before:bg-orange-500',
    Cold: 'bg-blue-50 text-blue-700 ring-blue-100 before:bg-blue-500',
    Converted: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-100 before:bg-amber-500',
    Partial: 'bg-orange-50 text-orange-700 ring-orange-100 before:bg-orange-500',
    Done: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    Closed: 'bg-gray-100 text-gray-600 ring-gray-200 before:bg-gray-400',
    FollowUp: 'bg-amber-50 text-amber-700 ring-amber-100 before:bg-amber-500',
    Overdue: 'bg-red-50 text-red-700 ring-red-100 before:bg-red-500',
    'In Progress': 'bg-blue-50 text-blue-700 ring-blue-100 before:bg-blue-500',
    Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    'Fully Paid': 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    'Partially Paid': 'bg-blue-50 text-blue-700 ring-blue-100 before:bg-blue-500',
    Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    Received: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    Renewed: 'bg-emerald-50 text-emerald-700 ring-emerald-100 before:bg-emerald-500',
    'Expiring Soon': 'bg-orange-50 text-orange-700 ring-orange-100 before:bg-orange-500',
    Draft: 'bg-gray-100 text-gray-500 ring-gray-200 before:bg-gray-400',
  }
  const status = label.replace(/^(Payment|RC|Transfer):\s*/, '')
  const cls = map[status] || 'bg-gray-100 text-gray-600 ring-gray-200 before:bg-gray-400'
  return <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold leading-none ring-1 ring-inset ${cls} before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full`}><span>{label}</span></span>
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', type = 'button', disabled = false, className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md'; type?: 'button' | 'submit'; disabled?: boolean; className?: string
}) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded transition-all disabled:opacity-50 cursor-pointer'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
  const variants = {
    primary: `text-white shadow-sm`,
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const style = variant === 'primary' ? { backgroundColor: N } : {}
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} style={style}>
      {children}
    </button>
  )
}

export function Input({ label, error, errorMessage, autoComplete, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; error?: boolean; errorMessage?: string }) {
  const isLookup = typeof props.placeholder === 'string' && /\b(search|find|type)\b/i.test(props.placeholder)
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-600">{label}</label>}
      <input
        {...props}
        autoComplete={autoComplete ?? (isLookup ? 'new-password' : undefined)}
        className={`min-h-10 border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'} rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 placeholder:text-gray-400 ${props.className || ''}`}
        style={{ '--tw-ring-color': error ? '#C8102E' : N } as Record<string, string>}
      />
      {error && errorMessage && <span className="text-sm text-red-600">{errorMessage}</span>}
    </div>
  )
}

export function Select({ label, children, error, errorMessage, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; error?: boolean; errorMessage?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-600">{label}</label>}
      <div className="relative">
        <select
          {...props}
          className={`min-h-10 w-full border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'} rounded-md px-3 py-2 text-sm text-gray-800 bg-white appearance-none focus:outline-none pr-8 ${props.className || ''}`}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {error && errorMessage && <span className="text-sm text-red-600">{errorMessage}</span>}
    </div>
  )
}

export function Textarea({ label, error, errorMessage, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; error?: boolean; errorMessage?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-600">{label}</label>}
      <textarea rows={3} {...props}
        className={`border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'} rounded-md px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 placeholder:text-gray-400 resize-none ${props.className || ''}`}
        style={{ '--tw-ring-color': error ? '#C8102E' : N } as Record<string, string>}
      />
      {error && errorMessage && <span className="text-sm text-red-600">{errorMessage}</span>}
    </div>
  )
}

export function Modal({ title, open, onClose, children, width = 'max-w-2xl' }: {
  title: string; open: boolean; onClose: () => void; children: ReactNode; width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Table({ headers, children, empty = false, emptyMessage = 'No records found', stickyLastColumn = false, minWidthClass = 'min-w-full', compact = false, columnWidths }: { headers: string[]; children: ReactNode; empty?: boolean; emptyMessage?: string; stickyLastColumn?: boolean; minWidthClass?: string; compact?: boolean; columnWidths?: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className={`w-full ${minWidthClass} table-fixed border-separate border-spacing-0 text-sm [&_td]:align-top [&_td]:border-b [&_td]:border-r [&_td]:border-gray-100 [&_td]:[overflow-wrap:anywhere] [&_td]:whitespace-normal [&_th]:align-top [&_th]:border-b [&_th]:border-r [&_th]:border-gray-200 [&_th]:[overflow-wrap:anywhere] [&_th]:whitespace-normal ${compact ? '[&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2' : ''} ${stickyLastColumn ? '[&_td:last-child]:sticky [&_td:last-child]:right-0 [&_td:last-child]:z-10 [&_td:last-child]:bg-white [&_td:last-child]:shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.3)]' : ''}`}>
        {columnWidths ? <colgroup>{headers.map((header, index) => <col key={header} style={{ width: columnWidths[index] }} />)}</colgroup> : null}
        <thead>
          <tr className="bg-slate-50">
            {headers.map((h, index) => (
              <th key={h} className={`text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide ${stickyLastColumn && index === headers.length - 1 ? 'sticky right-0 z-20 bg-slate-50 shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.3)]' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty
            ? <tr><td colSpan={headers.length} className="text-center py-12 text-gray-400 text-sm">{emptyMessage}</td></tr>
            : children}
        </tbody>
      </table>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search...', disabled = false, inputRef }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
      <input
        ref={inputRef} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="new-password"
        className="min-h-10 w-full max-w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-[#1B2A6B] focus:ring-1 focus:ring-[#1B2A6B] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  )
}

export function FilterPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>
}

export function FilterChip({ active, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button type="button" {...props} aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/20 disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-[#1B2A6B] bg-[#1B2A6B] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-[#1B2A6B] hover:bg-blue-50 hover:text-[#1B2A6B]'} ${props.className ?? ''}`}>{children}</button>
}

export function IconButton({ label, children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} title={label} {...props} className={`inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 transition hover:bg-blue-50 hover:text-[#1B2A6B] focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/20 ${className}`}>{children}</button>
}

export function StatCard({ label, value, sub, color = N, icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      {icon && (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: color }}>
          {icon}
        </div>
      )}
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs font-medium mt-1" style={{ color }}>{sub}</div>}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  cancelDisabled?: boolean
  closeOnConfirm?: boolean
  isLoading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  message,
  title = 'Confirm Delete',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  cancelDisabled = false,
  closeOnConfirm = true,
  isLoading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cancelDisabled) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cancelDisabled, onClose, open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !cancelDisabled) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="outline" onClick={onClose} disabled={cancelDisabled}>{cancelLabel}</Btn>
          <Btn
            variant="danger"
            onClick={() => {
              onConfirm()
              if (closeOnConfirm) onClose()
            }}
            disabled={confirmDisabled}
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />{confirmLabel}</> : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-gray-200 mb-6 gap-0">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active === t ? 'border-[#C8102E] text-[#C8102E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          {t}
        </button>
      ))}
    </div>
  )
}

export function LoadingOverlay({
  show,
  label = 'Loading...',
  subtle = false,
}: {
  show: boolean
  label?: string
  subtle?: boolean
}) {
  if (!show) return null
  return (
    <div className={`absolute inset-0 z-20 flex items-center justify-center rounded-xl ${subtle ? 'bg-white/65 backdrop-blur-[1px]' : 'bg-white/80 backdrop-blur-[2px]'}`}>
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[#1B2A6B]" />
        {label}
      </div>
    </div>
  )
}
