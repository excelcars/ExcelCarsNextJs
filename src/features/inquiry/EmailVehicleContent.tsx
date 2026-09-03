import { Btn, SearchBar } from '@/components/ui'
import { EmailInquirySummary } from './EmailInquirySummary'
import { EmailInventoryState } from './EmailInventoryState'

interface EmailInventoryMatch {
  inventoryId: number
  inventoryNumber: string | null
  registrationNo: string | null
  year: number | null
  kmsDriven: string | null
  price: string | null
  status: string | null
  matchReasons?: string[]
  currentState?: string | null
  currentStateAt?: string | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
}

interface EmailHistoryState {
  emailed: boolean
  emailedAt: string | null
}

export function EmailVehicleContent({
  customer,
  email,
  mobile,
  error,
  loading,
  matches,
  historyByInventoryId,
  selectedIds,
  search,
  pending,
  onSearchChange,
  onToggleSelection,
  onCancel,
  onSend,
  clean,
  formatMoney,
  formatWorkflowState,
}: {
  customer: string
  email: string
  mobile: string
  error: string
  loading: boolean
  matches: EmailInventoryMatch[]
  historyByInventoryId: Record<number, EmailHistoryState>
  selectedIds: number[]
  search: string
  pending: boolean
  onSearchChange: (value: string) => void
  onToggleSelection: (inventoryId: number) => void
  onCancel: () => void
  onSend: () => void
  clean: (value: string | null | undefined) => string
  formatMoney: (value: string | null | undefined) => string
  formatWorkflowState: (value: string) => string
}) {
  const filteredMatches = matches.filter(match => {
    const vehicle = [
      clean(match.carVariantMaster?.carMakeMaster?.make),
      clean(match.carVariantMaster?.carModelMaster?.model),
      clean(match.carVariantMaster?.variant),
    ].filter(Boolean).join(' ')
    const haystack = [match.inventoryNumber ?? '', match.registrationNo ?? '', vehicle, match.status ?? ''].join(' ').toLowerCase()
    return !search.trim() || haystack.includes(search.trim().toLowerCase())
  })

  return (
    <div className="space-y-4">
      <EmailInquirySummary customer={customer} email={email} mobile={mobile} />
      {error ? <EmailInventoryState type="error" message={error} /> : null}
      {loading ? <EmailInventoryState type="loading" message="Loading matching inventory..." /> : matches.length === 0 ? (
        <EmailInventoryState type="empty" message="No matching inventory found for this inquiry yet." />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-gray-800">Choose which vehicles to send</div>
            <div className="min-w-56"><SearchBar value={search} onChange={onSearchChange} placeholder="Search inventory, reg, make..." /></div>
          </div>
          {filteredMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No vehicles match the current popup search.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-[#1B2A6B] text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <tr>
                    <th className="w-12 px-3 py-3">Select</th><th className="px-3 py-3">Make / Model</th><th className="px-3 py-3">Variant / Color</th><th className="px-3 py-3">Year</th><th className="px-3 py-3">Registration No</th><th className="px-3 py-3">Match Reason</th><th className="px-3 py-3">Kms Driven</th><th className="px-3 py-3">Price / Status</th><th className="px-3 py-3">Current State</th><th className="px-3 py-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map(match => {
                    const make = clean(match.carVariantMaster?.carMakeMaster?.make) || '—'
                    const model = clean(match.carVariantMaster?.carModelMaster?.model) || '—'
                    const variant = clean(match.carVariantMaster?.variant) || '—'
                    const isSelected = selectedIds.includes(match.inventoryId)
                    const emailHistory = historyByInventoryId[match.inventoryId]
                    return (
                      <tr key={match.inventoryId} onClick={() => onToggleSelection(match.inventoryId)} className={`cursor-pointer border-t border-gray-200 align-top transition ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                        <td className="px-3 py-3"><input type="checkbox" checked={isSelected} onChange={() => onToggleSelection(match.inventoryId)} onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-[#1B2A6B] focus:ring-[#1B2A6B]" /></td>
                        <td className="px-3 py-3 text-gray-700"><div className="font-medium text-gray-900">{make}</div><div>{model}</div><div className="text-xs text-gray-500">{match.inventoryNumber ?? `#${match.inventoryId}`}</div></td>
                        <td className="px-3 py-3 text-gray-700"><div className="font-medium text-gray-900">{variant}</div><div>—</div></td>
                        <td className="px-3 py-3 text-gray-700">{match.year ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-700">{match.registrationNo ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-700"><div className="max-w-44 text-xs leading-5">{match.matchReasons?.join(' · ') || 'In stock match'}</div></td>
                        <td className="px-3 py-3 text-gray-700">{match.kmsDriven ? Number(match.kmsDriven).toLocaleString('en-IN') : '—'}</td>
                        <td className="px-3 py-3 text-gray-700"><div>{formatMoney(match.price)}</div><div className="text-xs text-gray-500">{match.status ?? '—'}</div></td>
                        <td className="px-3 py-3 text-gray-700"><div className="font-medium text-gray-900">{match.currentState ? formatWorkflowState(match.currentState) : 'Not marked'}</div><div className="text-xs text-gray-500">{match.currentStateAt ?? '—'}</div></td>
                        <td className="px-3 py-3 text-gray-700"><div className="font-medium text-gray-900">{emailHistory?.emailed ? 'Yes' : 'No'}</div><div className="text-xs text-gray-500">{emailHistory?.emailedAt ?? '—'}</div></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Btn variant="outline" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={onSend} disabled={pending || selectedIds.length === 0 || loading}>{pending ? 'Sending...' : `Send Email${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}</Btn>
      </div>
    </div>
  )
}
