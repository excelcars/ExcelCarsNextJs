'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, Eye, FileText, Images, Link2, Mail, Pencil, Phone, Trash2, UserRound, Video } from 'lucide-react'
import { IconButton, Modal, Table } from '@/components/ui'
import { InventoryDetailCell } from './InventoryDetailCell'
import { InventoryMobileCard } from './InventoryMobileCard'
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

function InventoryStatusBadge({ label }: { label: string }) {
  const status = label.trim().toLowerCase()
  const tone = status === 'loan process'
    ? 'border-violet-100 bg-violet-50 text-violet-700 before:bg-violet-500'
    : status === 'not available'
      ? 'border-slate-200 bg-slate-100 text-slate-600 before:bg-slate-400'
      : status === 'available' || status === 'in stock'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700 before:bg-emerald-500'
        : status === 'sold'
          ? 'border-red-100 bg-red-50 text-red-700 before:bg-red-500'
          : 'border-blue-100 bg-blue-50 text-blue-700 before:bg-blue-500'

  return <span title={label} className={`inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold leading-none ${tone} before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full`}>{label}</span>
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

function RemarkPreview({ value, title, onView }: { value: string | null | undefined; title: string; onView: (value: string, title: string) => void }) {
  const remark = clean(value)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const updateTruncation = () => setIsTruncated(element.scrollHeight > element.clientHeight + 1)
    updateTruncation()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateTruncation)
    observer?.observe(element)
    return () => observer?.disconnect()
  }, [remark])

  if (!remark) return <span className="text-gray-400">—</span>
  return <div className="w-full"><p ref={textRef} className="line-clamp-4 break-words [overflow-wrap:anywhere] text-sm leading-5 text-gray-700">{remark}</p>{isTruncated ? <button type="button" onClick={() => onView(remark, title)} className="mt-1 cursor-pointer text-xs font-semibold text-[#1B2A6B] hover:underline">View more</button> : null}</div>
}

export interface InventoryTableProps {
  rows: InventoryRow[]
  selectionMode: boolean
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
  selectionMode,
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
  const [remarkModal, setRemarkModal] = useState<{ title: string; value: string } | null>(null)
  const headers = selectionMode
    ? ['Select', 'Sr. No.', 'Make / Model / Variant', 'Year / Month / Colour', 'No. of Owners / Tax / Fuel Type', 'Regi. No. / Kms Driven / Insurance Type', 'Price / Status', 'Owner Details', 'Customer Details', 'Remarks', 'Internal Remarks', 'Actions']
    : ['Sr. No.', 'Make / Model / Variant', 'Year / Month / Colour', 'No. of Owners / Tax / Fuel Type', 'Regi. No. / Kms Driven / Insurance Type', 'Price / Status', 'Owner Details', 'Customer Details', 'Remarks', 'Internal Remarks', 'Actions']
  const columnWidths = selectionMode
    ? ['5%', '4%', '10%', '8%', '10%', '10%', '10%', '10%', '10%', '6%', '7%', '10%']
    : ['4%', '10%', '8%', '10%', '10%', '10%', '10%', '10%', '8.5%', '9.5%', '10%']
  return (
    <>
    <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:hidden" aria-label="Vehicles">
      {rows.length === 0 ? <p className="col-span-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No records found</p> : rows.map((row, index) => <InventoryMobileCard key={row.inventoryId} row={row} position={(page - 1) * pageSize + index + 1} selectionMode={selectionMode} selectedInventoryIds={selectedInventoryIds} onSelectionChange={onSelectionChange} onView={onView} onInquirySync={onInquirySync} onPhotos={onPhotos} onVideos={onVideos} onDocuments={onDocuments} onEmail={onEmail} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
    <div className="hidden xl:block [&_th]:px-2 [&_td]:px-2 [&_th:last-child]:whitespace-nowrap [&_th:last-child]:[overflow-wrap:normal]">
      <Table
        headers={headers}
        empty={rows.length === 0}
        minWidthClass="min-w-[1400px]"
        columnWidths={columnWidths}
      >
        {rows.map((r, index) => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            {selectionMode ? <td className="px-2 py-3 text-center"><input type="checkbox" checked={selectedInventoryIds.includes(r.inventoryId)} onChange={event => onSelectionChange(r.inventoryId, event.target.checked)} aria-label={`Select ${r.registrationNo ?? r.inventoryNumber ?? 'vehicle'}`} /></td> : null}
            <td className="px-4 py-3 text-center font-semibold text-gray-700">{((page - 1) * pageSize) + index + 1}</td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Make', clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy)], ['Model', clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)], ['Variant', clean(r.carVariantMaster?.variant ?? r.variantLegacy)]]} /></td>
            <td className="px-4 py-3">
              <div className="space-y-1.5 text-sm leading-none">
                <div className="font-semibold text-gray-800">{r.year ?? '—'}</div>
                <div className="font-medium text-gray-500">{r.month ?? '—'}</div>
                <div className="flex min-w-0 items-center gap-2 text-gray-600"><span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/5" style={{ backgroundColor: vehicleColourSwatch(r.colour) }} /><span className="truncate">{clean(r.colour) || '—'}</span></div>
              </div>
            </td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['No. of Owners', r.noOfOwners], ['Tax', r.tax], ['Fuel Type', r.fuelType]]} /></td>
            <td className="px-4 py-3"><InventoryDetailCell items={[['Regi. No', r.registrationNo], ['Kms Driven', r.kmsDriven !== null ? Number(r.kmsDriven).toLocaleString('en-IN') : null], ['Insurance Type', r.insuranceType]]} /></td>
            <td className="px-4 py-3">
              <div className="space-y-2">
                <div className="truncate font-semibold tabular-nums text-gray-800">{formatVehiclePrice(r.price !== null ? Number(r.price) : null)}</div>
                {r.status ? <InventoryStatusBadge label={r.status} /> : <span className="text-xs text-gray-400">—</span>}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="space-y-1.5 text-sm leading-6 text-gray-600">
                <div className="flex min-w-0 items-center gap-2"><Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.ownedType) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.ownedBy) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.mobileNoOwnedBy) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.emailIdOwnedBy) || '—'}</span></div>
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="space-y-1.5 text-sm leading-6 text-gray-600">
                <div className="flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.customerName ?? r.customer?.custName) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.customer?.custMobile) || '—'}</span></div>
                <div className="flex min-w-0 items-center gap-2"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="truncate">{clean(r.customer?.custEmail) || '—'}</span></div>
              </div>
            </td>
            <td className="px-4 py-3"><RemarkPreview value={r.otherRemarks} title={`Remarks — ${r.registrationNo ?? r.inventoryNumber ?? `Vehicle #${r.inventoryId}`}`} onView={(value, title) => setRemarkModal({ value, title })} /></td>
            <td className="px-4 py-3"><RemarkPreview value={r.internalComments} title={`Internal remarks — ${r.registrationNo ?? r.inventoryNumber ?? `Vehicle #${r.inventoryId}`}`} onView={(value, title) => setRemarkModal({ value, title })} /></td>
            <td className="px-4 py-3">
              <div className="grid min-w-[96px] grid-cols-3 place-items-center gap-x-2 gap-y-1.5">
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
    <Modal title={remarkModal?.title ?? 'Remark'} open={Boolean(remarkModal)} onClose={() => setRemarkModal(null)} width="max-w-lg">
      <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-6 text-gray-700">{remarkModal?.value}</div>
      <div className="mt-4 flex justify-end"><button type="button" onClick={() => setRemarkModal(null)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Close</button></div>
    </Modal>
    </>
  )
}
