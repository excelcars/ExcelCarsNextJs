import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Btn, SearchBar } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import { INVENTORY_STATUSES } from './queries'
import type { InventoryFilters as InventoryFilterValues } from './inventoryTypes'

export interface InventoryFilterChip {
  key: keyof InventoryFilterValues
  label: string
}

export function InventoryFilters({
  searchInput,
  filters,
  activeFilterChips,
  isLoading,
  fuelTypes,
  onSearchChange,
  onFilterChange,
  onClear,
}: {
  searchInput: string
  filters: Pick<InventoryFilterValues, 'status' | 'fuelType' | 'ownedType'>
  activeFilterChips: InventoryFilterChip[]
  isLoading: boolean
  fuelTypes: string[]
  onSearchChange: (value: string) => void
  onFilterChange: (key: keyof InventoryFilterValues, value: string) => void
  onClear: () => void
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLoading || !searchInput) return
    searchInputRef.current?.focus()
    const cursorPosition = searchInput.length
    searchInputRef.current?.setSelectionRange(cursorPosition, cursorPosition)
  }, [isLoading, searchInput])

  const clearChip = (key: keyof InventoryFilterValues) => {
    if (key === 'search') onSearchChange('')
    onFilterChange(key, key === 'status' ? 'All' : '')
    if (key === 'make') onFilterChange('model', '')
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-900">Filters</div>
        <div className="text-xs text-gray-500">Use any combination below. Export will follow the same filters.</div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Quick inventory filters">
        {([
          ['All', 'All Vehicles'], ['In Stock', 'In Stock'], ['Booked', 'Booked'], ['Loan Process', 'Loan Process'], ['Sold', 'Sold'], ['Not Available', 'Not Available'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => onFilterChange('status', value)} disabled={isLoading} aria-pressed={filters.status === value}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${filters.status === value ? 'border-[#1B2A6B] bg-[#1B2A6B] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-[#1B2A6B] hover:bg-blue-50 hover:text-[#1B2A6B]'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <SearchBar inputRef={searchInputRef} value={searchInput} onChange={onSearchChange} placeholder="Search make, model, variant, colour, owner, mobile or registration..." disabled={isLoading} />
        <FormDropdown disabled={isLoading} value={filters.status === 'All' ? '' : filters.status} options={INVENTORY_STATUSES.map(value => ({ value, label: value }))} placeholder="All Statuses" allowClear onChange={value => onFilterChange('status', value || 'All')} />
        <FormDropdown disabled={isLoading} value={filters.fuelType} options={fuelTypes.map(value => ({ value, label: value }))} placeholder="All Fuels" allowClear onChange={value => onFilterChange('fuelType', value)} />
        <FormDropdown disabled={isLoading} value={filters.ownedType} options={['Excel Cars', 'Dealer', 'Individual'].map(value => ({ value, label: value }))} placeholder="All Owner Types" allowClear onChange={value => onFilterChange('ownedType', value)} />
        {activeFilterChips.length > 0 ? <Btn variant="ghost" onClick={onClear} disabled={isLoading}>Clear All</Btn> : null}
      </div>
      <div className="text-sm text-gray-500">
        Searchable fields: Registration No, Make, Model, Variant, Colour, Owner Name, and Owner Mobile.
      </div>
      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map(chip => <button key={`${chip.key}-${chip.label}`} type="button" title={chip.label} aria-label={`Clear ${chip.label}`} onClick={() => clearChip(chip.key)} className="inline-flex max-w-[min(100%,24rem)] items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"><span className="truncate">{chip.label}</span><X className="h-3 w-3 shrink-0" /></button>)}
        </div>
      ) : null}
    </div>
  )
}
