'use client'

import { useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import { Badge, Btn, Table, PageHeader, SearchBar, Modal } from '@/components/ui'

interface StockRow {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  year: number | null
  status: string | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface ChecklistDetail { documentId: number; checklistDocDetails: { documentName: string | null; applicable: string | null; received: string | null; originalCopy: string | null }[] }
interface InsuranceDetail { insuranceMainId: number; payoutAmount: string | null; totalAmountReceived: string | null; payoutPaymentStatus: string | null; policyStatus: string | null; partnerMaster: { name: string } | null }
interface RtoDetail { rtoAgentMainId: number; transferCharges: string | null; amtPaid: string | null; paymentStatus: string | null; rcStatus: string | null; transferStatus: string | null; partnerMaster: { name: string } | null }
interface LoanDetail { loanManagementId: number; payoutAmount: string | null; totalAmountReceived: string | null; paymentStatus: string | null; bankName: string | null; partnerMaster: { name: string } | null }
interface VehicleDetails { checklist: ChecklistDetail | null; insurance: InsuranceDetail | null; rto: RtoDetail | null; loan: LoanDetail | null }

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

export function TrackingClient({ initialData }: { initialData: StockRow[] }) {
  const [search, setSearch] = useState('')
  const [detailRow, setDetailRow] = useState<StockRow | null>(null)
  const [details, setDetails] = useState<VehicleDetails | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initialData.filter(r => {
      const make = r.carVariantMaster?.carMakeMaster?.make ?? ''
      const model = r.carVariantMaster?.carModelMaster?.model ?? ''
      return !q || (r.registrationNo ?? '').toLowerCase().includes(q) || make.toLowerCase().includes(q) || model.toLowerCase().includes(q)
    })
  }, [initialData, search])

  const openDetails = async (r: StockRow) => {
    if (!r.registrationNo) return
    setDetailRow(r)
    setDetails(null)
    setLoading(true)
    const res = await fetch(`/api/reports/tracking-details?registrationNo=${encodeURIComponent(r.registrationNo)}`)
    setDetails(await res.json())
    setLoading(false)
  }

  return (
    <div>
      <PageHeader title="Stock Tracking" subtitle={`${filtered.length} vehicles — click a row to see linked checklist, insurance, RTO & loan records`} />

      <div className="mb-4"><SearchBar value={search} onChange={setSearch} placeholder="Reg no, make, model..." /></div>

      <Table headers={['Reg No', 'Vehicle', 'Year', 'Status', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{r.registrationNo ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{clean(r.carVariantMaster?.carMakeMaster?.make)} {clean(r.carVariantMaster?.carModelMaster?.model)} {clean(r.carVariantMaster?.variant)}</td>
            <td className="px-4 py-3 text-gray-700">{r.year ?? '—'}</td>
            <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
            <td className="px-4 py-3">
              <Btn variant="outline" size="sm" onClick={() => openDetails(r)}><Eye className="w-3.5 h-3.5" />View</Btn>
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={`Tracking — ${detailRow?.registrationNo ?? ''}`} open={!!detailRow} onClose={() => setDetailRow(null)} width="max-w-3xl">
        {loading ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : details ? (
          <div className="space-y-5">
            <section>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Checklist / Documents</h4>
              {details.checklist ? (
                <div className="space-y-1">
                  {details.checklist.checklistDocDetails.map((d, i) => (
                    <div key={i} className="flex gap-3 text-xs text-gray-600">
                      <span className="w-40 truncate">{d.documentName}</span>
                      <span>Applicable: {d.applicable ?? '—'}</span>
                      <span>Received: {d.received ?? '—'}</span>
                    </div>
                  ))}
                  {details.checklist.checklistDocDetails.length === 0 && <div className="text-xs text-gray-400">No documents logged.</div>}
                </div>
              ) : <div className="text-xs text-gray-400">No checklist record.</div>}
            </section>

            <section>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Insurance</h4>
              {details.insurance ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Agent: {details.insurance.partnerMaster?.name ?? '—'}</div>
                  <div>Payout: {fmtMoney(details.insurance.payoutAmount)}</div>
                  <div>Received: {fmtMoney(details.insurance.totalAmountReceived)}</div>
                  <div>Status: {details.insurance.payoutPaymentStatus ?? '—'} / {details.insurance.policyStatus ?? '—'}</div>
                </div>
              ) : <div className="text-xs text-gray-400">No insurance record.</div>}
            </section>

            <section>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">RTO</h4>
              {details.rto ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Agent: {details.rto.partnerMaster?.name ?? '—'}</div>
                  <div>Charges: {fmtMoney(details.rto.transferCharges)}</div>
                  <div>Paid: {fmtMoney(details.rto.amtPaid)}</div>
                  <div>Status: {details.rto.paymentStatus ?? '—'} / {details.rto.rcStatus ?? '—'} / {details.rto.transferStatus ?? '—'}</div>
                </div>
              ) : <div className="text-xs text-gray-400">No RTO record.</div>}
            </section>

            <section>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Loan</h4>
              {details.loan ? (
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Bank: {details.loan.bankName ?? details.loan.partnerMaster?.name ?? '—'}</div>
                  <div>Payout: {fmtMoney(details.loan.payoutAmount)}</div>
                  <div>Received: {fmtMoney(details.loan.totalAmountReceived)}</div>
                  <div>Status: {details.loan.paymentStatus ?? '—'}</div>
                </div>
              ) : <div className="text-xs text-gray-400">No loan record.</div>}
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
