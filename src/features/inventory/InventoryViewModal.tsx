import { Loader2 } from 'lucide-react'
import { Btn, Modal } from '@/components/ui'
import type { InventoryRow } from './inventoryTypes'

const clean = (value: string | null | undefined) => {
  const result = value?.trim()
  if (!result) return ''
  return ['null', 'na', 'n/a'].includes(result.toLowerCase()) ? '' : result
}

const fmt = (value: string | number | null) => value !== null && value !== '' ? `₹${Number(value).toLocaleString('en-IN')}` : '—'
const fmtDateTime = (value: string | Date | null | undefined) => value ? new Date(value).toLocaleString('en-IN') : '—'

interface InventoryViewModalProps {
  open: boolean
  loading: boolean
  error: string
  row: InventoryRow | null
  onClose: () => void
}

export function InventoryViewModal({ open, loading, error, row, onClose }: InventoryViewModalProps) {
  return (
    <Modal title="Vehicle Details" open={open} onClose={onClose} width="max-w-5xl">
      {loading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /><div>Loading vehicle details...</div></div>
      ) : error ? (
        <div className="space-y-4"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div><div className="flex justify-end"><Btn variant="outline" onClick={onClose}>Close</Btn></div></div>
      ) : row ? (
        <div className="space-y-6 text-sm">
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Inventory No', row.inventoryNumber], ['SKU', row.sku], ['Reg No', row.registrationNo],
              ['Make', clean(row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy)],
              ['Model', clean(row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy)],
              ['Variant', clean(row.carVariantMaster?.variant ?? row.variantLegacy)],
              ['Legacy Make', row.makeLegacy], ['Legacy Model', row.modelLegacy], ['Legacy Variant', row.variantLegacy],
              ['Year', row.year], ['Month', row.month], ['Colour', row.colour], ['Fuel', row.fuelType],
              ['Owners', row.noOfOwners], ['Tax', row.tax], ['Registered', row.isCarRegistered === null ? null : row.isCarRegistered ? 'Yes' : 'No'],
              ['KM Driven', row.kmsDriven !== null ? Number(row.kmsDriven).toLocaleString('en-IN') : null],
              ['Insurance', row.insuranceType], ['Price', fmt(row.price)], ['Status', row.status],
              ['Owner Type', row.ownedType], ['Owned By', row.ownedBy], ['Owner Mobile', row.mobileNoOwnedBy], ['Owner Email', row.emailIdOwnedBy],
              ['Linked Customer', row.customer?.custName], ['Linked Customer Mobile', row.customer?.custMobile], ['Linked Customer Email', row.customer?.custEmail],
              ['Customer / Source', row.customerName], ['Internal Comments', row.internalComments], ['Remarks', row.otherRemarks],
            ].map(([key, value]) => <div key={String(key)}><div className="mb-0.5 text-xs text-gray-400">{key}</div><div className="font-medium text-gray-800">{value != null && value !== '' ? String(value) : '—'}</div></div>)}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-semibold text-gray-900">Email Link Tracking</div>
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
