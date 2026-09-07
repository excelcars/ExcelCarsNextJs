import { Loader2 } from 'lucide-react'
import { Badge, Btn, Modal } from '@/components/ui'
import type { InventoryRow } from './inventoryTypes'

const clean = (value: string | null | undefined) => {
  const result = value?.trim()
  if (!result) return ''
  return ['null', 'na', 'n/a'].includes(result.toLowerCase()) ? '' : result
}

const fmt = (value: string | number | null) => value !== null && value !== '' ? `₹${Number(value).toLocaleString('en-IN')}` : '—'
const fmtDateTime = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleString('en-IN') : '—'
const value = (input: unknown) => input != null && input !== '' ? String(input) : '—'

function DetailList({ rows }: { rows: Array<[string, unknown]> }) {
  return <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
    {rows.map(([label, item]) => <div key={label}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-gray-900">{value(item)}</div>
    </div>)}
  </div>
}

interface InventoryViewModalProps {
  open: boolean
  loading: boolean
  error: string
  row: InventoryRow | null
  onClose: () => void
}

export function InventoryViewModal({ open, loading, error, row, onClose }: InventoryViewModalProps) {
  return (
    <Modal title={row ? `View Inventory — ${row.inventoryNumber ?? `#${row.inventoryId}`}` : 'View Inventory'} open={open} onClose={onClose} width="max-w-6xl">
      {loading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /><div>Loading vehicle details...</div></div>
      ) : error ? (
        <div className="space-y-4"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div><div className="flex justify-end"><Btn variant="outline" onClick={onClose}>Close</Btn></div></div>
      ) : row ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{row.inventoryNumber ?? `Inventory/${row.inventoryId}`}</span>
                {row.registrationNo ? <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-[#1B2A6B]">{row.registrationNo}</span> : null}
                {row.sku ? <span className="rounded-md bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600">SKU · {row.sku}</span> : null}
              </div>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">{[clean(row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy), clean(row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy)].filter(Boolean).join(' ') || 'Vehicle not set'}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{clean(row.carVariantMaster?.variant ?? row.variantLegacy) || 'Variant not set'}</span><span>·</span><span>{row.year ?? 'Year not set'}</span><span>·</span><span>{row.fuelType ?? 'Fuel not set'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">{row.status ? <Badge label={row.status} /> : null}</div>
          </div>

          <div className="grid gap-0 border-t border-gray-100 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Price', fmt(row.price), 'Listed vehicle value'],
              ['KM Driven', row.kmsDriven !== null ? Number(row.kmsDriven).toLocaleString('en-IN') : '—', 'Current odometer'],
              ['Ownership', row.noOfOwners ? `${row.noOfOwners} owner${row.noOfOwners === 1 ? '' : 's'}` : '—', row.ownedType ?? 'Ownership type not set'],
              ['Linked Customer', row.customer?.custName ?? row.customerName ?? 'Not linked', row.customer?.custMobile ?? row.mobileNoOwnedBy ?? 'No mobile recorded'],
            ].map(([label, metric, detail], index) => <div key={label} className={`px-6 py-5 ${index < 3 ? 'border-r border-gray-100' : ''}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</div><div className="mt-2 text-2xl font-semibold text-gray-900">{metric}</div><div className="mt-1 text-sm text-gray-500">{detail}</div>
            </div>)}
          </div>

          <div className="grid gap-5 border-t border-gray-100 px-6 py-5 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-4"><div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Vehicle specification</div><DetailList rows={[
              ['Variant', clean(row.carVariantMaster?.variant ?? row.variantLegacy)], ['Year / Month', [row.year, row.month].filter(Boolean).join(' / ')], ['Colour', row.colour], ['Fuel type', row.fuelType], ['Registration', row.isCarRegistered === null ? '—' : row.isCarRegistered ? 'Registered' : 'Not registered'], ['Tax', row.tax], ['Insurance', row.insuranceType], ['Legacy vehicle', [row.makeLegacy, row.modelLegacy, row.variantLegacy].filter(Boolean).join(' ')],
            ]} /></section>
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-4"><div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Ownership & contact</div><DetailList rows={[
              ['Owner type', row.ownedType], ['Owned by', row.ownedBy], ['Owner mobile', row.mobileNoOwnedBy], ['Owner email', row.emailIdOwnedBy], ['Customer', row.customer?.custName ?? row.customerName], ['Customer mobile', row.customer?.custMobile], ['Customer email', row.customer?.custEmail], ['Source / reference', row.customerName],
            ]} /></section>
          </div>

          {(row.internalComments || row.otherRemarks) ? <div className="grid gap-5 border-t border-gray-100 px-6 py-5 lg:grid-cols-2"><section className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Internal comments</div><div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{row.internalComments || '—'}</div></section><section className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Remarks</div><div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{row.otherRemarks || '—'}</div></section></div> : null}

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Customer engagement</div>
            {!row.vehicleEmailLinks || row.vehicleEmailLinks.length === 0 ? <div className="text-sm text-gray-500">No tracked vehicle emails have been sent for this inventory record yet.</div> : <div className="space-y-3">
              {row.vehicleEmailLinks.map(link => <div key={link.vehicleEmailLinkId} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium text-gray-900">{link.recipientName || 'Recipient'}</div><div className="text-xs text-gray-500">{link.recipientEmail}</div></div><div className="text-xs font-medium text-gray-500">Viewed: <span className={link.firstHumanViewAt ? 'text-green-700' : 'text-gray-700'}>{link.firstHumanViewAt ? 'Yes' : 'No'}</span></div></div>
                <div className="mt-3 grid gap-3 text-xs text-gray-600 md:grid-cols-2 xl:grid-cols-5"><div><span className="font-medium text-gray-800">Sent:</span> {fmtDateTime(link.emailSentAt)}</div><div><span className="font-medium text-gray-800">First Request:</span> {fmtDateTime(link.firstRequestedAt)}</div><div><span className="font-medium text-gray-800">First Human View:</span> {fmtDateTime(link.firstHumanViewAt)}</div><div><span className="font-medium text-gray-800">Last Request:</span> {fmtDateTime(link.lastRequestedAt)}</div><div><span className="font-medium text-gray-800">Requests / Human Views:</span> {link.requestCount} / {link.humanViewCount}</div></div>
                <div className="mt-3 grid gap-3 text-xs text-gray-600 md:grid-cols-2 xl:grid-cols-5"><div><span className="font-medium text-gray-800">Call Clicks:</span> {link.interactionSummary?.callClickCount ?? 0}</div><div><span className="font-medium text-gray-800">WhatsApp Clicks:</span> {link.interactionSummary?.whatsappClickCount ?? 0}</div><div><span className="font-medium text-gray-800">Enquire Clicks:</span> {link.interactionSummary?.emailClickCount ?? 0}</div><div><span className="font-medium text-gray-800">First Interaction:</span> {fmtDateTime(link.interactionSummary?.firstInteractionAt)}</div><div><span className="font-medium text-gray-800">Last Interaction:</span> {fmtDateTime(link.interactionSummary?.lastInteractionAt)}</div></div>
              </div>)}
            </div>}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
