'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneCall, AlertTriangle, Eye, Pencil } from 'lucide-react'
import { Badge, Btn, Input, Select, Textarea, Modal, Table, PageHeader, SearchBar } from '@/components/ui'
import { logFollowup, type LogFollowupInput } from './actions'

const CLASSIFICATIONS = ['Hot', 'Warm', 'Cold'] as const
const STATUSES = ['FollowUp', 'Closed'] as const
const SUB_STATUS_SUGGESTIONS = ['Ringing', 'Not Intrested', 'Busy', 'Desired Car Not In Stock', 'Not connected', 'Already Bought Car', 'Visited', 'Gave Details', 'Sold Car']

interface FollowupRow {
  inquiryId: number
  inquiryNo: string | null
  dateOfInquiry: Date | string | null
  website: string | null
  customerId?: number | null
  customerNameLegacy: string | null
  mobileno: string | null
  email: string | null
  budgetOfCustomer?: string | number | null
  classification: string | null
  status?: string | null
  subStatus: string | null
  followUpDate: Date | string | null
  visitedDateOfCustomer?: Date | string | null
  remark: string | null
  customer: { custId?: number; custName: string; custMobile?: string | null; custEmail?: string | null } | null
  inquiryCarDetails: {
    year: number | null
    carVariantMaster: {
      variant: string | null
      carMakeMaster: { make: string | null } | null
      carModelMaster: { model: string | null } | null
    } | null
  }[]
}

interface HistoryEntry {
  pkFollowupId: number
  followupDate: string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
}

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtDate = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : ''
const isOverdue = (d: Date | string | null) => d ? new Date(d) < new Date(new Date().toDateString()) : false

function emptyForm(): LogFollowupInput {
  return { status: 'FollowUp', subStatus: '', classification: 'Warm', comments: '', nextFollowUpDate: '' }
}

export function FollowupClient({ initialData }: { initialData: FollowupRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterClassification, setFilterClassification] = useState('All')
  const [logRow, setLogRow] = useState<FollowupRow | null>(null)
  const [form, setForm] = useState<LogFollowupInput>(emptyForm())
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initialData.filter(r => {
      const name = (r.customer?.custName ?? r.customerNameLegacy ?? '').toLowerCase()
      const matches = !q || name.includes(q) || (r.mobileno ?? '').includes(q)
      return matches && (filterClassification === 'All' || r.classification === filterClassification)
    })
  }, [initialData, search, filterClassification])

  const overdueCount = useMemo(() => initialData.filter(r => isOverdue(r.followUpDate)).length, [initialData])

  const openLog = async (r: FollowupRow) => {
    setLogRow(r)
    setForm({ ...emptyForm(), classification: r.classification ?? 'Warm' })
    setError('')
    setHistory([])
    setHistoryLoading(true)
    const res = await fetch(`/api/followup/history?inquiryId=${r.inquiryId}`)
    setHistory(await res.json())
    setHistoryLoading(false)
  }

  const f = <K extends keyof LogFollowupInput>(k: K, v: LogFollowupInput[K]) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    if (!logRow) return
    setError('')
    startTransition(async () => {
      const result = await logFollowup(logRow.inquiryId, form)
      if (!result.success) {
        setError(result.error ?? 'Something went wrong.')
        return
      }
      setLogRow(null)
      router.refresh()
    })
  }

  const openInquiryView = (inquiryId: number) => {
    router.push(`/inquiry?view=${inquiryId}`)
  }

  const openInquiryEdit = (inquiryId: number) => {
    router.push(`/inquiry?edit=${inquiryId}`)
  }

  return (
    <div>
      <PageHeader
        title="Follow-up Queue"
        subtitle={`${filtered.length} open inquiries${overdueCount ? ` · ${overdueCount} overdue` : ''}`}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Customer, mobile..." />
        <div className="flex flex-wrap gap-1.5">
          {['All', ...CLASSIFICATIONS].map(c => (
            <button key={c} onClick={() => setFilterClassification(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterClassification === c ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={filterClassification === c ? { backgroundColor: '#C8102E' } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <Table headers={['Customer', 'Contact', 'Car of Interest', 'Classification', 'Sub-status', 'Follow-up Date', 'Last Remark', 'Actions']} empty={filtered.length === 0}>
        {filtered.map(r => {
          const car = r.inquiryCarDetails[0]
          const name = r.customer?.custName ?? r.customerNameLegacy ?? '—'
          const overdue = isOverdue(r.followUpDate)
          return (
            <tr key={r.inquiryId} className={`hover:bg-gray-50 transition ${overdue ? 'bg-red-50/40' : ''}`}>
              <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-sm text-gray-700 font-mono">
                  <Phone className="w-3 h-3 text-gray-400" />{r.mobileno ?? '—'}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {car?.carVariantMaster
                  ? [clean(car.carVariantMaster.carMakeMaster?.make), clean(car.carVariantMaster.carModelMaster?.model), clean(car.carVariantMaster.variant)]
                      .filter(Boolean).join(' ') + (car.year ? ` · ${car.year}` : '') || '—'
                  : '—'}
              </td>
              <td className="px-4 py-3">{r.classification ? <Badge label={r.classification} /> : '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={r.subStatus ?? ''}>{r.subStatus ?? '—'}</td>
              <td className="px-4 py-3 text-sm whitespace-nowrap">
                <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {overdue && <AlertTriangle className="w-3.5 h-3.5" />}
                  {fmtDate(r.followUpDate) || '—'}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={r.remark ?? ''}>{r.remark ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Btn variant="outline" size="sm" onClick={() => openLog(r)}>
                    <PhoneCall className="w-3.5 h-3.5" />Log
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => openInquiryView(r.inquiryId)}>
                    <Eye className="w-3.5 h-3.5" />View
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => openInquiryEdit(r.inquiryId)}>
                    <Pencil className="w-3.5 h-3.5" />Edit
                  </Btn>
                </div>
              </td>
            </tr>
          )
        })}
      </Table>

      <Modal title={`Log Follow-up${logRow ? ` — ${logRow.customer?.custName ?? logRow.customerNameLegacy ?? ''}` : ''}`} open={!!logRow} onClose={() => setLogRow(null)}>
        {logRow && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inquiry Context</div>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div><span className="font-medium text-gray-900">Inquiry ID:</span> {logRow.inquiryId}</div>
                  <div><span className="font-medium text-gray-900">Inquiry No:</span> {logRow.inquiryNo ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Inquiry Date:</span> {fmtDate(logRow.dateOfInquiry) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Source:</span> {logRow.website ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Budget:</span> {logRow.budgetOfCustomer ? `₹${Number(logRow.budgetOfCustomer).toLocaleString('en-IN')}` : '—'}</div>
                  <div><span className="font-medium text-gray-900">Visited Date:</span> {fmtDate(logRow.visitedDateOfCustomer ?? null) || '—'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer & Vehicle</div>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div><span className="font-medium text-gray-900">Linked Customer ID:</span> {logRow.customer?.custId ?? logRow.customerId ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Customer:</span> {logRow.customer?.custName ?? logRow.customerNameLegacy ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Mobile:</span> {logRow.customer?.custMobile ?? logRow.mobileno ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Email:</span> {logRow.customer?.custEmail ?? logRow.email ?? '—'}</div>
                  <div><span className="font-medium text-gray-900">Car of Interest:</span> {(() => {
                    const car = logRow.inquiryCarDetails[0]
                    return car?.carVariantMaster
                      ? [clean(car.carVariantMaster.carMakeMaster?.make), clean(car.carVariantMaster.carModelMaster?.model), clean(car.carVariantMaster.variant)]
                          .filter(Boolean).join(' ') + (car.year ? ` · ${car.year}` : '') || '—'
                      : '—'
                  })()}</div>
                  <div><span className="font-medium text-gray-900">Current Follow-up Date:</span> {fmtDate(logRow.followUpDate) || '—'}</div>
                  <div><span className="font-medium text-gray-900">Last Remark:</span> {logRow.remark?.trim() ? logRow.remark : '—'}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-600 mb-1.5">Recent activity</div>
              {historyLoading ? (
                <div className="text-xs text-gray-400">Loading...</div>
              ) : history.length === 0 ? (
                <div className="text-xs text-gray-400">No prior follow-ups logged.</div>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                  {history.map(h => (
                    <div key={h.pkFollowupId} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-gray-400 whitespace-nowrap">{fmtDate(h.followupDate)}</span>
                      {h.followupStatus && <Badge label={h.followupStatus} />}
                      <span className="truncate">{h.followupSubStatus ?? h.comments ?? ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Status *" value={form.status} onChange={e => f('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Select label="Classification" value={form.classification} onChange={e => f('classification', e.target.value)}>
                {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
              </Select>
              <div>
                <Input label="Sub-status" list="followup-sub-status-suggestions" value={form.subStatus} onChange={e => f('subStatus', e.target.value)} />
                <datalist id="followup-sub-status-suggestions">
                  {SUB_STATUS_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              {form.status === 'FollowUp' && (
                <Input label="Next Follow-up Date *" type="date" value={form.nextFollowUpDate} onChange={e => f('nextFollowUpDate', e.target.value)} />
              )}
            </div>
            <Textarea label="Comments" value={form.comments} onChange={e => f('comments', e.target.value)} placeholder="What was discussed on this call..." />

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="outline" onClick={() => openInquiryView(logRow.inquiryId)}>
                <Eye className="w-3.5 h-3.5" />View Inquiry
              </Btn>
              <Btn variant="outline" onClick={() => openInquiryEdit(logRow.inquiryId)}>
                <Pencil className="w-3.5 h-3.5" />Edit Inquiry
              </Btn>
              <Btn variant="outline" onClick={() => setLogRow(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={isPending}>{isPending ? 'Saving...' : 'Save Follow-up'}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
