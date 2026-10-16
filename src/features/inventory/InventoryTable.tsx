import { Building2, Eye, FileText, Images, Link2, Mail, Pencil, Phone, Trash2, UserRound, Video } from 'lucide-react'
import { Badge, IconButton, Table } from '@/components/ui'
import { InventoryDetailCell } from './InventoryDetailCell'
import type { InventoryRow } from './inventoryTypes'

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return ['null', 'na', 'n/a'].includes(trimmed.toLowerCase()) ? '' : trimmed
}

function formatVehiclePrice(value: number | null) {
  if (value === null || !Number.isFinite(Number(value))) return '—'
  return `₹ ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`
}

const vehicleColourSwatches: Array<[string, string]> = [
  ['a.royale', '#102f77'], ['royale', '#102f77'], ['midnight blue', '#172554'], ['navy blue', '#1e3a8a'], ['sky blue', '#38bdf8'], ['light blue', '#60a5fa'], ['dark blue', '#1e40af'], ['blue', '#2563eb'],
  ['pearl white', '#f8fafc'], ['off white', '#f8fafc'], ['white', '#e5e7eb'], ['black', '#111827'], ['piano black', '#0f172a'],
  ['metallic grey', '#64748b'], ['dark grey', '#475569'], ['light grey', '#cbd5e1'], ['grey', '#94a3b8'], ['gray', '#94a3b8'], ['silver', '#cbd5e1'],
  ['burgundy', '#800020'], ['maroon', '#7f1d1d'], ['red', '#dc2626'], ['pink', '#ec4899'], ['purple', '#7e22ce'], ['violet', '#7c3aed'],
  ['champagne', '#d6b98c'], ['beige', '#d6c29a'], ['ivory', '#fff8e7'], ['gold', '#ca8a04'], ['bronze', '#a16207'], ['brown', '#92400e'],
  ['yellow', '#eab308'], ['orange', '#ea580c'], ['green', '#16a34a'], ['teal', '#0f766e'], ['cyan', '#0891b2'],
]

function vehicleColourSwatch(colour: string | null | undefined) {
  const normalized = clean(colour).toLowerCase()
  return vehicleColourSwatches.find(([name]) => normalized.includes(name))?.[1] ?? '#94a3b8'
}

interface InventoryTableProps {
  rows: InventoryRow[]
  selectedInventoryIds: number[]
  page: number
  pageSize: number
  onSelectionChange: (inventoryId: number, checked: boolean) => void
  onView: (row: InventoryRow) => void
  onInquirySync: (row: InventoryRow) => void
  onPhotos: (row: InventoryRow) => void
  onVideos: (row: InventoryRow) => void
  onDocuments: (row: InventoryRow) => void
  onEmail: (row: InventoryRow) => void
  onEdit: (row: InventoryRow) => void
  onDelete: (inventoryId: number) => void
}

export function InventoryTable({
  rows,
  selectedInventoryIds,
  page,
  pageSize,
  onSelectionChange,
  onView,
  onInquirySync,
  onPhotos,
  onVideos,
  onDocuments,
  onEmail,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  return (
    <div className="[&_th]:px-2 [&_td]:px-2">
      <Table
        headers={['Select', 'Sr. No.', 'Make / Model / Variant', 'Year / Month / Colour', 'No. of Owners / Tax / Fuel Type', 'Regi. No. / Kms Driven / Insurance Type', 'Price / Status', 'Owner Details', 'Customer Details', 'Remarks', 'Internal Remarks', 'Actions']}
        empty={rows.length === 0}
        minWidthClass="min-w-full"
        columnWidths={['5%', '4%', '10%', '8%', '11%', '11%', '10%', '10%', '10%', '6%', '7%', '8%']}
      >
        {rows.map((r, index) => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-2 py-3 text-center"><input type="checkbox" checked={selectedInventoryIds.includes(r.inventoryId)} onChange={event => onSelectionChange(r.inventoryId, event.target.checked)} aria-label={`Select ${r.registrationNo ?? r.inventoryNumber ?? 'vehicle'}`} /></td>
            <td className="px-4 py-3 text-center font-semibold text-gray-700">{((page - 1) * pageSize) + index + 1}</td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Make', clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy)], ['Model', clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)], ['Variant', clean(r.carVariantMaster?.variant ?? r.variantLegacy)]]} /></td>
            <td className="px-4 py-3">
              <div className="space-y-1.5 text-sm leading-none">
                <div className="font-semibold text-gray-800">{r.year ?? '—'}</div>
                <div className="font-medium text-gray-500">{r.month ?? '—'}</div>
                <div className="flex min-w-0 items-center gap-2 text-gray-600"><span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/5" style={{ backgroundColor: vehicleColourSwatch(r.colour) }} /><span className="break-words">{clean(r.colour) || '—'}</span></div>
              </div>
            </td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['No. of Owners', r.noOfOwners], ['Tax', r.tax], ['Fuel Type', r.fuelType]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Regi. No', r.registrationNo], ['Kms Driven', r.kmsDriven !== null ? Number(r.kmsDriven).toFixed(2) : null], ['Insurance Type', r.insuranceType]]} /></td>
            <td className="px-4 py-3">
              <div className="space-y-2">
                <div className="break-words font-semibold tabular-nums text-gray-800 [overflow-wrap:anywhere]">{formatVehiclePrice(r.price !== null ? Number(r.price) : null)}</div>
                {r.status ? <Badge label={r.status} /> : <span className="text-xs text-gray-400">—</span>}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="space-y-1.5 text-sm leading-6 text-gray-600">
                <div className="flex min-w-0 items-center gap-2"><Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-words">{clean(r.ownedType) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-words">{clean(r.ownedBy) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{clean(r.mobileNoOwnedBy) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{clean(r.emailIdOwnedBy) || '—'}</span></div>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="space-y-1.5 text-sm leading-6 text-gray-600">
                <div className="flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-words">{clean(r.customerName ?? r.customer?.custName) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{clean(r.customer?.custMobile) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{clean(r.customer?.custEmail) || '—'}</span></div>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{clean(r.otherRemarks) || '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{clean(r.internalComments) || '—'}</td>
            <td className="px-4 py-3">
              <div className="flex items-center flex-wrap gap-1">
                <IconButton label="View vehicle" onClick={() => onView(r)}><Eye className="h-4 w-4" /></IconButton>
                <IconButton label="Update linked inquiry" onClick={() => onInquirySync(r)} className="hover:bg-violet-50 hover:text-violet-600"><Link2 className="h-4 w-4" /></IconButton>
                <IconButton label={`Manage Photos${r._count.inventoryPhotos ? ` (${r._count.inventoryPhotos})` : ''}`} onClick={() => onPhotos(r)}><span className="relative inline-flex"><Images className="h-4 w-4" />{r._count.inventoryPhotos > 0 ? <span className="absolute -right-2.5 -top-2.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#1B2A6B] px-1 text-[9px] font-bold leading-none text-white shadow-sm">{r._count.inventoryPhotos}</span> : null}</span></IconButton>
                <IconButton label={`Manage Videos${r._count.inventoryVideos ? ` (${r._count.inventoryVideos})` : ''}`} onClick={() => onVideos(r)}><span className="relative inline-flex"><Video className="h-4 w-4" />{r._count.inventoryVideos > 0 ? <span className="absolute -right-2.5 -top-2.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#1B2A6B] px-1 text-[9px] font-bold leading-none text-white shadow-sm">{r._count.inventoryVideos}</span> : null}</span></IconButton>
                <IconButton label={`Manage Internal Documents${r._count.inventoryDocuments ? ` (${r._count.inventoryDocuments})` : ''}`} onClick={() => onDocuments(r)}><span className="relative inline-flex"><FileText className="h-4 w-4" />{r._count.inventoryDocuments > 0 ? <span className="absolute -right-2.5 -top-2.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-[#1B2A6B] px-1 text-[9px] font-bold leading-none text-white shadow-sm">{r._count.inventoryDocuments}</span> : null}</span></IconButton>
                <IconButton label="Send email" onClick={() => onEmail(r)} className="hover:bg-emerald-50 hover:text-emerald-600"><Mail className="h-4 w-4" /></IconButton>
                <IconButton label="Edit vehicle" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label="Delete vehicle" onClick={() => onDelete(r.inventoryId)} className="hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
