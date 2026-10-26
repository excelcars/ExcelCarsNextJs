'use client'

import { useState } from 'react'
import { CalendarDays, CarFront, FileText, Fuel, Gauge, Palette, ReceiptText, ShieldCheck, Wrench, type LucideIcon, UsersRound } from 'lucide-react'

type Specification = [label: string, value: string]

const tabs = [
  { key: 'highlights', label: 'Key Highlights', compactLabel: 'Highlights' },
  { key: 'ownership', label: 'Ownership & History', compactLabel: 'Ownership' },
  { key: 'performance', label: 'Engine & Performance', compactLabel: 'Engine' },
] as const

type TabKey = (typeof tabs)[number]['key']

const iconByLabel: Record<string, LucideIcon> = {
  Registration: FileText,
  'No. of Owners': UsersRound,
  Colour: Palette,
  Status: ShieldCheck,
  'Insurance Type': ShieldCheck,
  'Road Tax': ReceiptText,
  'Month of Manufacture': CalendarDays,
  'Service History': Wrench,
  'Fuel Type': Fuel,
  'KM Driven': Gauge,
  'Year of Manufacture': CalendarDays,
  'Model / Variant': CarFront,
}

export function VehicleSpecifications({ highlights, ownership, performance }: Record<TabKey, Specification[]>) {
  const [selectedTab, setSelectedTab] = useState<TabKey>('highlights')
  const specifications = { highlights, ownership, performance }

  return (
    <section className="rounded-3xl border border-[#e4e9f2] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold tracking-tight text-[#101b38]">Vehicle Specifications</h2>
      <div className="mt-4 grid grid-cols-3 border-b border-[#e4e9f2]" role="tablist" aria-label="Vehicle specifications">
        {tabs.map(tab => {
          const selected = selectedTab === tab.key
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={selected} onClick={() => setSelectedTab(tab.key)} className={`flex min-h-12 items-center justify-center border-b-2 px-1 py-2 text-center text-xs font-medium leading-tight transition sm:px-3 sm:py-3 sm:text-sm ${selected ? 'border-[#d7194a] text-[#142b62]' : 'border-transparent text-gray-500 hover:text-[#142b62]'}`}>
              <span className="sm:hidden">{tab.compactLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {specifications[selectedTab].map(([label, value]) => {
          const Icon = iconByLabel[label] ?? CarFront
          return (
            <div key={label} className="min-h-28 rounded-xl border border-[#edf0f5] bg-[#f7f8fc] px-3 py-4 text-center">
              <Icon className="mx-auto h-6 w-6 text-[#d7194a]" aria-hidden="true" />
              <dt className="mt-2 text-xs font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">{value || '—'}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
