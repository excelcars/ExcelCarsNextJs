import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Btn, Select, SearchBar } from '@/components/ui'
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
    <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <SearchBar inputRef={searchInputRef} value={searchInput} onChange={onSearchChange} placeholder="Search make, model, variant, colour, owner, mobile or registration..." disabled={isLoading} />
        <Select disabled={isLoading} value={filters.status} onChange={event => onFilterChange('status', event.target.value)}>
          <option value="All">All Statuses</option>
          {INVENTORY_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
        </Select>
        <Select disabled={isLoading} value={filters.fuelType} onChange={event => onFilterChange('fuelType', event.target.value)}>
          <option value="">All Fuels</option>
          {fuelTypes.map(fuelType => <option key={fuelType} value={fuelType}>{fuelType}</option>)}
        </Select>
        <Select disabled={isLoading} value={filters.ownedType} onChange={event => onFilterChange('ownedType', event.target.value)}>
          <option value="">All Owner Types</option>
          <option value="Excel Cars">Excel Cars</option>
          <option value="Dealer">Dealer</option>
          <option value="Individual">Individual</option>
        </Select>
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
