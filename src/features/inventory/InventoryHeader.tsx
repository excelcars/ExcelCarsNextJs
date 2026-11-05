import { CheckSquare, Download, Mail, Plus } from 'lucide-react'
import { Btn } from '@/components/ui'

export function InventoryHeader({
  total,
  status,
  selectedCount,
  selectionMode,
  exportSelected,
  hasActiveFilters,
  isExporting,
  onBulkEmail,
  onToggleSelectionMode,
  onExport,
  onAdd,
}: {
  total: number
  status: string
  selectedCount: number
  selectionMode: boolean
  exportSelected: boolean
  hasActiveFilters: boolean
  isExporting: boolean
  onBulkEmail: () => void
  onToggleSelectionMode: () => void
  onExport: () => void
  onAdd: () => void
}) {
  return (
    <header className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0"><h1 className="text-xl font-bold text-gray-900">Inventory Management</h1><p className="mt-0.5 text-sm text-gray-500">{`${total.toLocaleString('en-IN')} vehicles${status !== 'All' ? ` · ${status}` : ''}`}</p></div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap [&_button]:min-h-11 [&_button]:justify-center [&_button]:text-[14px] [&_svg]:shrink-0">
          <Btn variant={selectionMode ? 'primary' : 'outline'} size="sm" onClick={onToggleSelectionMode} aria-pressed={selectionMode}>
            <CheckSquare className="w-3.5 h-3.5" />{selectionMode ? 'Done Selecting' : 'Select Vehicles'}
          </Btn>
          <Btn variant="outline" size="sm" onClick={onBulkEmail} disabled={selectedCount === 0}>
            <Mail className="w-3.5 h-3.5" />Send Email{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Btn>
          <Btn variant="outline" size="sm" onClick={onExport} disabled={isExporting || (!exportSelected && total === 0)}>
            <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : exportSelected ? `Export Selected (${selectedCount})` : `${hasActiveFilters ? 'Export Filtered' : 'Export All'} (${total})`}
          </Btn>
          <Btn size="sm" onClick={onAdd}><Plus className="w-3.5 h-3.5" />Add Vehicle</Btn>
        </div>
    </header>
  )
}

export function InventorySelectionBar({
  selectedCount,
  visibleCount,
  onSelectVisible,
  onClear,
}: {
  selectedCount: number
  visibleCount: number
  onSelectVisible: () => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-gray-500">{selectedCount > 0 ? `${selectedCount} vehicle${selectedCount === 1 ? '' : 's'} selected` : 'Select vehicles for bulk email'}</span><div className="flex flex-wrap gap-2 [&_button]:min-h-11"><Btn variant="ghost" size="sm" onClick={onSelectVisible} disabled={visibleCount === 0}>Select visible</Btn>{selectedCount > 0 ? <Btn variant="ghost" size="sm" onClick={onClear}>Clear selection</Btn> : null}</div></div>
  )
}
