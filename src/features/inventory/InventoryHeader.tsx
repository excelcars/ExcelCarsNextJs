import { Download, Mail, Plus } from 'lucide-react'
import { Btn, PageHeader } from '@/components/ui'

export function InventoryHeader({
  total,
  status,
  selectedCount,
  hasActiveFilters,
  isExporting,
  onBulkEmail,
  onExport,
  onAdd,
}: {
  total: number
  status: string
  selectedCount: number
  hasActiveFilters: boolean
  isExporting: boolean
  onBulkEmail: () => void
  onExport: () => void
  onAdd: () => void
}) {
  return (
    <PageHeader
      title="Inventory Management"
      subtitle={`${total.toLocaleString('en-IN')} vehicles${status !== 'All' ? ` · ${status}` : ''}`}
      action={<div className="flex items-center gap-2"><Btn variant="outline" size="sm" onClick={onBulkEmail} disabled={selectedCount === 0}><Mail className="w-3.5 h-3.5" />Send Email{selectedCount > 0 ? ` (${selectedCount})` : ''}</Btn><Btn variant="outline" size="sm" onClick={onExport} disabled={isExporting || total === 0}><Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting...' : `${hasActiveFilters ? 'Export Filtered' : 'Export All'} (${total})`}</Btn><Btn size="sm" onClick={onAdd}><Plus className="w-3.5 h-3.5" />Add Vehicle</Btn></div>}
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
