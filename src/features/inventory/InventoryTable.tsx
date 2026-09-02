import { Eye, Images, Link2, Mail, Pencil, Trash2 } from 'lucide-react'
import { Table } from '@/components/ui'
import { InventoryDetailCell } from './InventoryDetailCell'
import type { InventoryRow } from './inventoryTypes'

const clean = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  return ['null', 'na', 'n/a'].includes(trimmed.toLowerCase()) ? '' : trimmed
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
  onEmail,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  return (
    <div className="[&_table]:min-w-0 [&_th]:px-2 [&_td]:px-2 [&_th:first-child]:w-16 [&_th:first-child]:min-w-16 [&_th:first-child]:max-w-16 [&_td:first-child]:w-16 [&_td:first-child]:min-w-16 [&_td:first-child]:max-w-16">
      <Table headers={['Select', 'Sr. No.', 'Make / Model / Variant', 'Year / Month / Colour', 'No. of Owners / Tax / Fuel Type', 'Regi. No. / Kms Driven / Insurance Type', 'Price / Status', 'Owner Details', 'Customer Details', 'Actions']} empty={rows.length === 0}>
        {rows.map((r, index) => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-2 py-3 text-center"><input type="checkbox" checked={selectedInventoryIds.includes(r.inventoryId)} onChange={event => onSelectionChange(r.inventoryId, event.target.checked)} aria-label={`Select ${r.registrationNo ?? r.inventoryNumber ?? 'vehicle'}`} /></td>
            <td className="px-4 py-3 text-center font-semibold text-gray-700">{((page - 1) * pageSize) + index + 1}</td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Make', clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy)], ['Model', clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)], ['Variant', clean(r.carVariantMaster?.variant ?? r.variantLegacy)]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Year', r.year], ['Month', r.month], ['Colour', r.colour]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['No. of Owners', r.noOfOwners], ['Tax', r.tax], ['Fuel Type', r.fuelType]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Regi. No', r.registrationNo], ['Kms Driven', r.kmsDriven !== null ? Number(r.kmsDriven).toFixed(2) : null], ['Insurance Type', r.insuranceType]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Price', r.price !== null ? Number(r.price).toFixed(2) : null], ['Status', r.status]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Owned Type', r.ownedType], ['Owned By', r.ownedBy], ['Mobile', r.mobileNoOwnedBy], ['Email', r.emailIdOwnedBy]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Customer', r.customerName ?? r.customer?.custName], ['Mobile', r.customer?.custMobile], ['Email', r.customer?.custEmail]]} /></td>
            <td className="px-4 py-3">
              <div className="flex items-center flex-wrap gap-1">
                <button onClick={() => onView(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
                <button onClick={() => onInquirySync(r)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition" title="Update Inquiry"><Link2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => onPhotos(r)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="Manage Photos"><span className="relative inline-flex"><Images className="w-3.5 h-3.5" />{r._count.inventoryPhotos > 0 ? <span className="absolute -right-2 -top-2 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] leading-4 text-white text-center">{r._count.inventoryPhotos}</span> : null}</span></button>
                <button onClick={() => onEmail(r)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Send Email"><Mail className="w-3.5 h-3.5" /></button>
                <button onClick={() => onEdit(r)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(r.inventoryId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
