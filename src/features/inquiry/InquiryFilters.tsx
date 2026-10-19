'use client'

import { useEffect, useState } from 'react'
import { Btn, FilterChip, FilterPanel, Input, SearchBar } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import { DateFilterInput } from '@/components/DateFilterInput'
import { VehicleFilterSelects } from '@/components/VehicleFilterSelects'
import type { InquirySourceOption } from './sourceMaster'
import type { InquiryLocationOption } from './locationMaster'
import { formatIndianNumberInput, normalizeIntegerInput } from '@/lib/listFormatters'
import { inquiryStatusLabel } from './queries'

type QuickFilter = 'active' | 'overdue' | 'today' | 'upcoming' | 'activity' | 'all'

type CarMakeMaster = { pkMakeId: number; make: string | null }
type CarModelMaster = { pkModelId: number; model: string | null }
type CarVariantMaster = { pkVariantId: number; variant: string | null }

type InquiryFiltersProps = {
  search: string
  source: string
  locationId: string
  location: string
  subStatus: string
  makeId: string
  modelId: string
  variantId: string
  followUpDate: string
  visitedDate: string
  budgetMin: string
  budgetMax: string
  classification: string
  status: string
  quickFilter: QuickFilter
  isRoutePending: boolean
  hasActiveFilters: boolean
  sourceOptions: InquirySourceOption[]
  locationOptions: InquiryLocationOption[]
  subStatusSuggestions: string[]
  makes: CarMakeMaster[]
  models: CarModelMaster[]
  variants: CarVariantMaster[]
  classifications: readonly string[]
  statuses: readonly string[]
  onSearchChange: (value: string) => void
  onSourceChange: (value: string) => void
  onLocationIdChange: (value: string) => void
  onLocationChange: (value: string) => void
  onSubStatusChange: (value: string) => void
  onMakeChange: (value: string) => void
  onModelChange: (value: string) => void
  onVariantChange: (value: string) => void
  onFollowUpDateChange: (value: string) => void
  onVisitedDateChange: (value: string) => void
  onBudgetApply: (budgetMin: string, budgetMax: string) => void
  onClassificationChange: (value: string) => void
  onStatusChange: (value: string) => void
  onQuickFilterChange: (value: QuickFilter) => void
  onReset: () => void
}

export function InquiryFilters({
  search,
  source,
  locationId,
  location,
  subStatus,
  makeId,
  modelId,
  variantId,
  followUpDate,
  visitedDate,
  budgetMin,
  budgetMax,
  classification,
  status,
  quickFilter,
  isRoutePending,
  hasActiveFilters,
  sourceOptions,
  locationOptions,
  subStatusSuggestions,
  makes,
  models,
  variants,
  classifications,
  statuses,
  onSearchChange,
  onSourceChange,
  onLocationIdChange,
  onLocationChange,
  onSubStatusChange,
  onMakeChange,
  onModelChange,
  onVariantChange,
  onFollowUpDateChange,
  onVisitedDateChange,
  onBudgetApply,
  onClassificationChange,
  onStatusChange,
  onQuickFilterChange,
  onReset,
}: InquiryFiltersProps) {
  const [draftBudgetMin, setDraftBudgetMin] = useState(budgetMin)
  const [draftBudgetMax, setDraftBudgetMax] = useState(budgetMax)

  useEffect(() => { setDraftBudgetMin(budgetMin) }, [budgetMin])
  useEffect(() => { setDraftBudgetMax(budgetMax) }, [budgetMax])

  return (
    <FilterPanel>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Filters</div>
          <div className="text-xs text-gray-500">Use any combination below. Export will follow the same filters.</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Quick inquiry filters">
        {([
          ['active', 'Active'], ['overdue', 'Overdue'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['activity', 'Newest Activity'], ['all', 'All Inquiries'],
        ] as const).map(([value, label]) => (
          <FilterChip key={value} onClick={() => onQuickFilterChange(value)} disabled={isRoutePending} active={quickFilter === value}>
            {label}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Search</label>
          <SearchBar value={search} onChange={onSearchChange} placeholder="Name, mobile, email, source, vehicle..." disabled={isRoutePending} />
        </div>
        <FormDropdown label="Source" value={source === 'All' ? '' : source} options={sourceOptions.map(item => ({ value: item.code, label: item.displayName }))} placeholder="All Sources" allowClear disabled={isRoutePending} onChange={value => onSourceChange(value || 'All')} />
        <FormDropdown label="City / Reporting Location" value={locationId} options={locationOptions.map(item => ({ value: String(item.locationId), label: item.displayName }))} placeholder="All locations" allowClear disabled={isRoutePending} onChange={onLocationIdChange} />
        <Input label="Area / Locality" value={location} onChange={event => onLocationChange(event.target.value)} placeholder="Andheri, Kothrud, JLT..." disabled={isRoutePending} />
        <FormDropdown label="Sub-status" value={subStatus === 'All' ? '' : subStatus} options={subStatusSuggestions.map(value => ({ value, label: value }))} placeholder="All Sub-statuses" allowClear disabled={isRoutePending} onChange={value => onSubStatusChange(value || 'All')} />
        <VehicleFilterSelects makeId={makeId} modelId={modelId} variantId={variantId} makes={makes} models={models} variants={variants} disabled={isRoutePending} labeled onMakeChange={onMakeChange} onModelChange={onModelChange} onVariantChange={onVariantChange} />
        <DateFilterInput label="Follow-up Date" value={followUpDate} onChange={onFollowUpDateChange} disabled={isRoutePending} />
        <DateFilterInput label="Visited Date" value={visitedDate} onChange={onVisitedDateChange} disabled={isRoutePending} />
        <Input label="Budget From" inputMode="numeric" value={formatIndianNumberInput(draftBudgetMin)} onChange={event => setDraftBudgetMin(normalizeIntegerInput(event.target.value))} placeholder="Minimum budget" disabled={isRoutePending} />
        <div className="flex items-end gap-2"><Input label="Budget To" inputMode="numeric" value={formatIndianNumberInput(draftBudgetMax)} onChange={event => setDraftBudgetMax(normalizeIntegerInput(event.target.value))} placeholder="Maximum budget" disabled={isRoutePending} /><Btn variant="outline" size="sm" onClick={() => onBudgetApply(draftBudgetMin, draftBudgetMax)} disabled={isRoutePending || (draftBudgetMin === budgetMin && draftBudgetMax === budgetMax)}>Apply Budget</Btn></div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-600">Classification</label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...classifications].map(value => (
              <button key={value} onClick={() => onClassificationChange(value)} disabled={isRoutePending}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${classification === value ? 'text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                style={classification === value ? { backgroundColor: '#C8102E' } : {}}>
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...statuses].map(value => (
              <button key={value} onClick={() => onStatusChange(value)} disabled={isRoutePending}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${status === value ? 'text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                style={status === value ? { backgroundColor: '#1B2A6B' } : {}}>
                {inquiryStatusLabel(value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Btn variant="outline" size="sm" onClick={onReset} disabled={isRoutePending || !hasActiveFilters}>
          Reset Filters
        </Btn>
      </div>
    </FilterPanel>
  )
}
