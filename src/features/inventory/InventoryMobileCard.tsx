'use client'

import { Eye, Pencil, Images, Video, FileText, Link2, Mail, Trash2 } from 'lucide-react'
import type { InventoryTableProps } from './InventoryTable'
import type { InventoryRow } from './inventoryTypes'

type Props = Omit<InventoryTableProps, 'rows' | 'page' | 'pageSize'> & { row: InventoryRow; position: number }

const clean = (value: string | null | undefined) => {
  const text = value?.trim()
  return text && !['null', 'na', 'n/a'].includes(text.toLowerCase()) ? text : ''
}

function Fields({ items }: { items: Array<[string, string | number | null | undefined]> }) {
  return <dl className="grid min-w-0 grid-cols-2 gap-3">
    {items.map(([label, value]) => <div key={label} className={`min-w-0 ${/email|remarks|owner|customer|sku/i.test(label) ? 'col-span-2' : ''}`}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm font-medium text-gray-900">{value ?? '—'}</dd>
    </div>)}
  </dl>
}

export function InventoryMobileCard({ row: r, position, selectionMode, selectedInventoryIds, onSelectionChange, onView, onEdit, onInquirySync, onPhotos, onVideos, onDocuments, onEmail, onDelete }: Props) {
  const title = [clean(r.carVariantMaster?.carMakeMaster?.make ?? r.makeLegacy), clean(r.carVariantMaster?.carModelMaster?.model ?? r.modelLegacy)].filter(Boolean).join(' ') || 'Vehicle not set'
  const variant = clean(r.carVariantMaster?.variant ?? r.variantLegacy)
  const price = r.price !== null && Number.isFinite(Number(r.price)) ? `₹ ${Number(r.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'
  const actions = [
    { label: 'Update linked inquiry', icon: Link2, click: () => onInquirySync(r) },
    { label: `Photos (${r._count.inventoryPhotos})`, icon: Images, click: () => onPhotos(r) },
    { label: `Videos (${r._count.inventoryVideos})`, icon: Video, click: () => onVideos(r) },
    { label: `Internal documents (${r._count.inventoryDocuments})`, icon: FileText, click: () => onDocuments(r) },
    { label: 'Send email', icon: Mail, click: () => onEmail(r) },
    { label: 'Delete vehicle', icon: Trash2, click: () => onDelete(r.inventoryId), danger: true },
  ]
  return <article aria-labelledby={`inventory-card-${r.inventoryId}`} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <span className="min-w-0 break-words text-xs text-gray-500">#{position} · {r.inventoryNumber || `Vehicle ${r.inventoryId}`}</span>
      {r.status && <span className="max-w-full break-words rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#1B2A6B]">{r.status}</span>}
    </div>
    {selectionMode && <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 text-sm">
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#1B2A6B]" checked={selectedInventoryIds.includes(r.inventoryId)} onChange={event => onSelectionChange(r.inventoryId, event.target.checked)} />
      <span className="min-w-0 break-words">Select {r.registrationNo || r.inventoryNumber || 'vehicle'}</span>
    </label>}
    <h2 id={`inventory-card-${r.inventoryId}`} className="break-words text-lg font-bold text-gray-900">{title}</h2>
    {variant && <p className="mt-1 break-words text-sm text-gray-600">{variant}</p>}
    <div className="my-3 flex flex-wrap items-center justify-between gap-2">
      <span className="break-words font-mono text-sm font-semibold text-gray-700">{clean(r.registrationNo) || (r.isCarRegistered === false ? 'Not registered' : '—')}</span>
      <strong className="break-words text-lg tabular-nums text-[#1B2A6B]">{price}</strong>
    </div>
    <Fields items={[
      ['Year / Month', [r.year, clean(r.month)].filter(Boolean).join(' / ') || '—'],
      ['Fuel', clean(r.fuelType) || '—'],
      ['KM driven', r.kmsDriven !== null ? Number(r.kmsDriven).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'],
      ['Colour', clean(r.colour) || '—'],
    ]} />
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button type="button" onClick={() => onView(r)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1B2A6B] px-3 py-2 text-sm font-medium text-white hover:bg-[#12204f]"><Eye className="h-4 w-4 shrink-0" />View</button>
      <button type="button" onClick={() => onEdit(r)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Pencil className="h-4 w-4 shrink-0" />Edit</button>
    </div>
    <details className="mt-3 border-t border-gray-100 pt-2">
      <summary className="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-semibold text-[#1B2A6B]">Details and more actions</summary>
      <div className="space-y-4 pt-3">
        <Fields items={[
          ['No. of owners', r.noOfOwners], ['Tax', clean(r.tax) || '—'],
          ['Insurance', clean(r.insuranceType) || '—'], ['SKU', clean(r.sku) || '—'],
          ['Owner type', clean(r.ownedType) || '—'], ['Owner', clean(r.ownedBy) || '—'],
          ['Owner mobile', clean(r.mobileNoOwnedBy) || '—'], ['Owner email', clean(r.emailIdOwnedBy) || '—'],
          ['Customer', clean(r.customerName ?? r.customer?.custName) || '—'],
          ['Customer mobile', clean(r.customer?.custMobile) || '—'], ['Customer email', clean(r.customer?.custEmail) || '—'],
          ['Remarks', clean(r.otherRemarks) || '—'], ['Internal remarks', clean(r.internalComments) || '—'],
        ]} />
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ label, icon: Icon, click, danger }) => <button key={label} type="button" onClick={click} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{label}</span></button>)}
        </div>
      </div>
    </details>
  </article>
}
