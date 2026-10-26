import { CheckSquare, Download, Mail, Plus } from 'lucide-react'
import { Btn, PageHeader } from '@/components/ui'

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
    <PageHeader
      title="Inventory Management"
      subtitle={`${total.toLocaleString('en-IN')} vehicles${status !== 'All' ? ` · ${status}` : ''}`}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
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
      }
    />
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
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-gray-500">{selectedCount > 0 ? `${selectedCount} vehicle${selectedCount === 1 ? '' : 's'} selected` : 'Select vehicles for bulk email'}</span><div className="flex gap-2"><Btn variant="ghost" size="sm" onClick={onSelectVisible} disabled={visibleCount === 0}>Select visible</Btn>{selectedCount > 0 ? <Btn variant="ghost" size="sm" onClick={onClear}>Clear selection</Btn> : null}</div></div>
  )
}
