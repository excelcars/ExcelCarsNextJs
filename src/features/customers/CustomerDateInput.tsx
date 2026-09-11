'use client'

import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCustomerDisplayDate, parseCustomerDisplayDate } from './types'

export function CustomerDateInput({
  label, value, onChange, error, minDate, maxDate,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  minDate?: Date
  maxDate?: Date
}) {
  const selectedDate = parseCustomerDisplayDate(value)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date(selectedDate ?? new Date()))
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOutsideRange = (date: Date) => {
    const candidate = new Date(date)
    candidate.setHours(0, 0, 0, 0)
    return (minDate && candidate < minDate) || (maxDate && candidate > maxDate)
  }
  const openCalendar = () => {
    setMonth(new Date(selectedDate ?? maxDate ?? today))
    setOpen(current => !current)
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        <input value={value} placeholder="DD/MM/YYYY" inputMode="numeric" maxLength={10} onChange={event => onChange(event.target.value)}
          className={`w-full border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'} rounded-md px-3 py-2 pr-10 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 placeholder:text-gray-400`}
          style={{ '--tw-ring-color': error ? '#C8102E' : '#1B2A6B' } as Record<string, string>}
        />
        <button type="button" aria-label={`Choose ${label.toLowerCase()}`} onClick={openCalendar} className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-[#1B2A6B]"><CalendarDays className="h-4 w-4" /></button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {open && (
        <div className="absolute z-30 top-[calc(100%+4px)] w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="rounded p-1 text-gray-500 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-sm font-semibold text-gray-800">{month.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</div>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="rounded p-1 text-gray-500 hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day} className="py-1">{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {Array.from({ length: firstDay }, (_, index) => <div key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const date = new Date(year, monthIndex, day)
              const disabled = isOutsideRange(date)
              const selected = selectedDate?.getTime() === date.getTime()
              return <button key={day} type="button" disabled={disabled} onClick={() => { onChange(formatCustomerDisplayDate(date)); setOpen(false) }}
                className={`mx-auto h-8 w-8 rounded-full text-xs transition ${selected ? 'bg-[#1B2A6B] text-white' : 'hover:bg-blue-50 text-gray-700'} ${disabled ? 'cursor-not-allowed text-gray-300 hover:bg-transparent' : ''}`}>{day}</button>
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-gray-100 pt-2 text-xs">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-gray-500 hover:text-gray-700">Clear</button>
            <button type="button" onClick={() => { onChange(formatCustomerDisplayDate(maxDate ?? today)); setOpen(false) }} className="text-[#1B2A6B] hover:underline">Use latest allowed</button>
          </div>
        </div>
      )}
    </div>
  )
}
