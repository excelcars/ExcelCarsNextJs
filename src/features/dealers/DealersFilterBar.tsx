import { Btn, FilterPanel, SearchBar } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'

const searchFieldLabels: Record<string, string> = {
  all: 'all dealer details', name: 'dealer name', primaryMobile: 'primary mobile', secondaryMobile: 'second mobile',
  email: 'email address', company: 'company name', address: 'address', website: 'website',
}

const searchFields = [['all', 'All fields'], ['name', 'Name'], ['primaryMobile', 'Primary mobile'], ['secondaryMobile', 'Mobile 2'], ['email', 'Email'], ['company', 'Company'], ['address', 'Address'], ['website', 'Website']]
const sortOptions = [['nameAsc', 'Name: A–Z'], ['nameDesc', 'Name: Z–A'], ['newest', 'Newest added'], ['oldest', 'Oldest added']]

export function DealersFilterBar({ search, searchInput, field, sort, onSearchChange, onQueryChange, onReset }: {
  search: string; searchInput: string; field: string; sort: string
  onSearchChange: (value: string) => void; onQueryChange: (params: Record<string, string>) => void; onReset: () => void
}) {
  const searchFieldLabel = searchFieldLabels[field] ?? searchFieldLabels.all
  const hasFilters = Boolean(search || searchInput || field !== 'all' || sort !== 'nameAsc')
  return <FilterPanel className="p-3">
    <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] [&>*]:min-w-0">
      <div className="flex flex-col gap-1 sm:col-span-2 xl:col-span-1">
        <label className="text-xs font-medium text-gray-600">Search value</label>
        <SearchBar value={searchInput} onChange={onSearchChange} placeholder={`Type ${searchFieldLabel}...`} />
      </div>
      <FormDropdown label="Search in" value={field} options={searchFields.map(([value, label]) => ({ value, label }))} placeholder="All fields" onChange={value => onQueryChange({ field: value })} className="w-full" />
      <FormDropdown label="Sort by" value={sort} options={sortOptions.map(([value, label]) => ({ value, label }))} placeholder="Sort by" onChange={value => onQueryChange({ sort: value })} className="w-full" />
      {hasFilters && <Btn variant="outline" size="sm" className="min-h-11" onClick={onReset}>Reset Filters</Btn>}
      <p className="text-xs text-gray-500 sm:col-span-2 xl:col-span-4">Choose where to search, then type the value above. Sorting applies immediately; filtering starts after you type.</p>
    </div>
  </FilterPanel>
}
