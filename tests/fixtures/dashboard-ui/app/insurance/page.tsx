'use client'

import { useState } from 'react'
import { InsuranceTable } from '../../../../../src/features/insurance/InsuranceTable'
import { InsuranceFilters } from '../../../../../src/features/insurance/InsuranceFilters'
import { InsurancePagination } from '../../../../../src/features/insurance/InsurancePagination'
import { InsuranceViewDetails } from '../../../../../src/features/insurance/InsuranceViewDetails'
import type { InsuranceRow } from '../../../../../src/features/insurance/InsuranceClient'
import { Modal, Btn } from '../../../../../src/components/ui'

const rows: InsuranceRow[] = Array.from({ length: 3 }, (_, index) => ({
  insuranceMainId: index + 1, inventoryId: null, agentNameLegacy: 'Sample insurance agent with a long name', agentMobileNoLegacy: '0000000000', agentEmailIdLegacy: 'long-insurance-agent-address@example.test',
  customerId: null, customerNameLegacy: 'Sample customer with a long name', customerMobileLegacy: '0000000000', customerEmailLegacy: 'verylongcustomeremailaddressformobilelayout@example.test',
  carType: 'PreOwned', fkVariantId: null, carMakeLegacy: 'Hyundai', carModelLegacy: 'Creta', carVariantLegacy: 'SX Optional Automatic Long Wheelbase Limited Edition', carYear: 2024, carRegistrationNo: `MH00AB123${index}`,
  entryDate: '2026-10-01', renewalDate: '2026-10-01', expiryDate: '2027-10-01', followupDate: '2026-11-05', insurancePremium: '20000', oDPremium: '15000', payoutPercentageOdPremium: '10', payoutAmount: '1500', totalAmountReceived: String(index * 750), payoutPaymentStatus: index === 2 ? 'Paid' : 'Pending', policyStatus: 'Pending', remark: 'Sample follow-up remarks with additional details about this policy.\nKeep all remarks readable on mobile.', fkPartnerId: null, customer: null, partnerMaster: null,
}))

export default function InsurancePreview() {
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [view, setView] = useState<InsuranceRow | null>(null)
  const [feedback, setFeedback] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const filtered = rows.filter(row => `${row.carRegistrationNo} ${row.customerNameLegacy}`.toLowerCase().includes(search.toLowerCase()) && (!from || String(row.entryDate) >= from) && (!to || String(row.entryDate) <= to))
  return <main className="min-w-0 bg-gray-50 p-3 sm:p-6">
    <h1 className="mb-4 text-xl font-bold">Insurance Management</h1>
    <InsuranceFilters search={search} fromDate={from} toDate={to} pending={false} onSearch={setSearch} onFromDate={setFrom} onToDate={setTo} onReset={() => { setSearch(''); setFrom(''); setTo('') }} />
    <InsuranceTable rows={filtered} onView={setView} onPay={row => setFeedback(`Log payment for ${row.carRegistrationNo}`)} onEdit={row => setFeedback(`Edit ${row.carRegistrationNo}`)} onDelete={id => setFeedback(`Delete insurance ${id} — preview only`)} />
    <InsurancePagination total={filtered.length} page={1} pageSize={pageSize} pageCount={1} pending={false} onNavigate={(_, size) => size && setPageSize(size)} />
    <Modal title="View Insurance" open={!!view} onClose={() => setView(null)} width="max-w-6xl">{view && <InsuranceViewDetails row={view} onEdit={() => setFeedback('Edit — preview only')} onLogPayment={() => setFeedback('Log payment — preview only')} />}</Modal>
    <Modal title="Preview action" open={!!feedback} onClose={() => setFeedback('')}><p>{feedback}</p><Btn onClick={() => setFeedback('')}>Close preview</Btn></Modal>
  </main>
}
