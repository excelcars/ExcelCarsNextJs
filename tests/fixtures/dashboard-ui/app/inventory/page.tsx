'use client'

import { useMemo, useState } from 'react'
import { InventoryHeader, InventorySelectionBar } from '../../../../../src/features/inventory/InventoryHeader'
import { InventoryFilters } from '../../../../../src/features/inventory/InventoryFilters'
import { InventoryTable } from '../../../../../src/features/inventory/InventoryTable'
import { InventoryPagination } from '../../../../../src/features/inventory/InventoryPagination'
import { InventoryViewModal } from '../../../../../src/features/inventory/InventoryViewModal'
import { emptyFilters } from '../../../../../src/features/inventory/inventoryUtils'
import type { InventoryRow } from '../../../../../src/features/inventory/inventoryTypes'
import { Btn, Modal } from '../../../../../src/components/ui'

const vehicles: InventoryRow[] = Array.from({ length: 5 }, (_, index) => ({
  inventoryId: index + 1, inventoryNumber: `INV/2026/${index + 1}`, sku: 'HYUNDAI-CRETA-SX-OPTIONAL-WHITE',
  registrationNo: index === 4 ? null : `MH00AB123${index}`, makeLegacy: 'Hyundai', modelLegacy: index === 1 ? 'Creta Long Wheelbase Limited Edition' : 'Creta', variantLegacy: 'SX Optional Automatic',
  year: 2024, month: 'November', colour: 'Pearl White', fuelType: index === 2 ? 'Petrol' : 'Diesel', noOfOwners: 1, tax: 'Individual', isCarRegistered: index !== 4, kmsDriven: '24500', insuranceType: 'Comprehensive', price: '1250000', status: ['In Stock', 'Booked', 'Sold', 'Loan Process', 'Not Available'][index],
  ownedType: 'Individual', ownedBy: 'Sample owner with a long name', mobileNoOwnedBy: '0000000000', emailIdOwnedBy: 'sample-long-owner-email-address@example.test',
  customerId: null, customerName: 'Sample customer', customer: null,
  internalComments: 'Internal sample notes. '.repeat(12), otherRemarks: 'Vehicle serviced regularly. '.repeat(12), fkVariantId: null, carVariantMaster: null,
  _count: { inventoryPhotos: 12, inventoryVideos: 2, inventoryDocuments: 3 },
}))

export default function InventoryPreview() {
  const [filters, setFilters] = useState(emptyFilters)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(2)
  const [view, setView] = useState<InventoryRow | null>(null)
  const [action, setAction] = useState('')
  const filtered = useMemo(() => vehicles.filter(row =>
    (filters.status === 'All' || row.status === filters.status) && (!filters.fuelType || row.fuelType === filters.fuelType) && (!filters.ownedType || row.ownedType === filters.ownedType) &&
    (!filters.priceMin || Number(row.price) >= Number(filters.priceMin)) && (!filters.priceMax || Number(row.price) <= Number(filters.priceMax)) &&
    JSON.stringify(row).toLowerCase().includes(filters.search.toLowerCase())
  ), [filters])
  const count = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const chips = (['status', 'fuelType', 'ownedType', 'priceMin', 'priceMax', 'search'] as const).filter(key => filters[key] && filters[key] !== 'All').map(key => ({ key, label: `${key}: ${filters[key]}` }))
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6">
    <InventoryHeader total={filtered.length} status={filters.status} selectedCount={selected.length} selectionMode={selectionMode} exportSelected={selected.length > 0} hasActiveFilters={chips.length > 0} isExporting={false} onBulkEmail={() => setAction(`Email ${selected.length} selected vehicles`)} onToggleSelectionMode={() => { setSelectionMode(value => !value); setSelected([]) }} onExport={() => setAction('Mock export')} onAdd={() => setAction('Add vehicle — preview action')} />
    <InventoryFilters searchInput={filters.search} filters={filters} activeFilterChips={chips} isLoading={false} fuelTypes={['Petrol', 'Diesel', 'Electric']} onSearchChange={search => { setFilters(value => ({ ...value, search })); setPage(1) }} onFilterChange={(key, value) => { setFilters(current => ({ ...current, [key]: value })); setPage(1) }} onBudgetApply={(priceMin, priceMax) => { setFilters(value => ({ ...value, priceMin, priceMax })); setPage(1) }} onClear={() => { setFilters(emptyFilters()); setPage(1) }} />
    {selectionMode && <InventorySelectionBar selectedCount={selected.length} visibleCount={rows.length} onSelectVisible={() => setSelected(rows.map(row => row.inventoryId))} onClear={() => setSelected([])} />}
    <InventoryTable rows={rows} selectionMode={selectionMode} selectedInventoryIds={selected} page={page} pageSize={pageSize} onSelectionChange={(id, checked) => setSelected(values => checked ? [...values, id] : values.filter(value => value !== id))} onView={setView} onEdit={row => setAction(`Edit ${row.registrationNo || row.inventoryNumber}`)} onInquirySync={() => setAction('Update linked inquiry')} onPhotos={() => setAction('Manage photos')} onVideos={() => setAction('Manage videos')} onDocuments={() => setAction('Manage internal documents')} onEmail={() => setAction('Send email')} onDelete={() => setAction('Delete confirmation — preview only')} />
    <InventoryPagination page={page} pageCount={count} pageSize={pageSize} total={filtered.length} pageSizeOptions={[2, 5]} isPending={false} isLoading={false} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1) }} />
    <InventoryViewModal row={view} open={!!view} loading={false} error="" onClose={() => setView(null)} />
    <Modal title="Preview action" open={!!action} onClose={() => setAction('')}><p>{action}</p><Btn onClick={() => setAction('')}>Close preview</Btn></Modal>
  </main>
}
