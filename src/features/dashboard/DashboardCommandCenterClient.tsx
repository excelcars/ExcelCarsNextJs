'use client'

import { Children, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Car,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Search,
  Shield,
  Sun,
  Users,
} from 'lucide-react'
import { Badge, Modal } from '@/components/ui'
import { LeadSourceChart, type LeadSourceBreakdown } from './LeadSourceChart'
import { LeadLocationChart, type LeadRegionBreakdowns } from './LeadLocationChart'

type Workspace = 'attention' | 'leads' | 'followups' | 'insurance' | 'rto' | 'payments' | 'loans' | 'birthdays' | 'anniversaries'
type SortMode = 'priority' | 'dateAsc' | 'dateDesc'
type DateValue = string | Date | null
const DASHBOARD_WORKSPACES: Workspace[] = ['attention', 'leads', 'followups', 'insurance', 'rto', 'payments', 'loans', 'birthdays', 'anniversaries']

function workspaceHref(workspace: Workspace) {
  return workspace === 'leads' ? '/dashboard' : `/dashboard?workspace=${workspace}`
}

function localDateParam(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function readWorkspaceFromUrl() {
  if (typeof window === 'undefined') return 'leads'
  const value = new URLSearchParams(window.location.search).get('workspace') ?? undefined
  return value && DASHBOARD_WORKSPACES.includes(value as Workspace) ? value as Workspace : 'leads'
}

export interface DashboardStats {
  totalInventory: number
  availableStock: number
  soldThisMonth: number
  totalInquiries: number
  todayInquiries: number
  hotLeads: number
  pendingFollowups: number
  overdueFollowups: number
  activeLoans: number
  activeInsurance: number
  pendingRTO: number
}

interface TodayStats {
  deliveriesToday: number
  followupsToday: number
  paymentsReceivedToday: number
}

interface LeadRow {
  label: string
  total: number
  own: number
  other: number
  href: string
  ownHref: string
}

interface ReminderRow {
  id: string
  name: string
  mobile: string | null
  email: string | null
  type: string
}

interface PendingPolicyRow {
  insuranceMainId: number
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  carRegistrationNo: string | null
  policyStatus: string | null
  agentNameLegacy: string | null
  agentMobileNoLegacy: string | null
  customer: { custName: string; custMobile: string | null } | null
  partnerMaster: { name: string; mobile: string | null } | null
}

interface ExpiryPolicyRow {
  insuranceMainId: number
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  carRegistrationNo: string | null
  agentNameLegacy: string | null
  agentMobileNoLegacy: string | null
  expiryDate: DateValue
  renewalDate: DateValue
  customer: { custName: string; custMobile: string | null } | null
  partnerMaster: { name: string; mobile: string | null } | null
}

interface AssignedExpiryPolicyRow {
  insuranceMainId: number
  customerNameLegacy: string | null
  customerMobileLegacy: string | null
  carRegistrationNo: string | null
  expiryDate: DateValue
  renewalDate: DateValue
  customer: { custName: string; custMobile: string | null } | null
}

interface RtoPendingRow {
  rtoAgentMainId: number
  customerNameLegacy: string | null
  customerMobLegacy: string | null
  carRegistrationNo: string | null
  rcStatus: string | null
  transferStatus: string | null
  agentNameLegacy: string | null
  agentMobileNoLegacy: string | null
  customer: { custName: string; custMobile: string | null } | null
  partnerMaster: { name: string; mobile: string | null } | null
}

interface PaymentRow {
  id: string
  type: string
  registrationNo: string | null
  href: string
  customerName: string | null
  customerMobile: string | null
  agentName: string | null
  agentMobile: string | null
  followupDate: DateValue
  actual: number
  received: number
  balance: number
}

interface FollowupRow {
  id: number
  customerName: string
  mobile: string
  followupDate: DateValue
  classification: string | null
  status: string | null
}

export interface DashboardCommandCenterProps {
  firstName: string
  todayLabel: string
  initialWorkspace?: Workspace
  permissions: {
    canInventory: boolean
    canInquiry: boolean
    canFollowup: boolean
    canInsurance: boolean
    canLoan: boolean
    canRto: boolean
  }
  stats: DashboardStats
  todayStats: TodayStats
  leadSources: LeadSourceBreakdown[]
  leadRegionBreakdowns: LeadRegionBreakdowns
  leadDetails: LeadRow[]
  reminders: ReminderRow[]
  pendingPolicies: PendingPolicyRow[]
  expiryRenewalPolicies: ExpiryPolicyRow[]
  assignedExpiryRenewalPolicies: AssignedExpiryPolicyRow[]
  rtoPending: RtoPendingRow[]
  pendingPayments: PaymentRow[]
  followups: FollowupRow[]
}

interface AttentionItem {
  id: string
  priority: 'High' | 'Medium' | 'Normal'
  rank: number
  customer: string
  type: string
  date: DateValue
  status: string
  actionHref: string
  workspace: Workspace
}

const todayStart = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(value: DateValue) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)
}

function customerName(row: PendingPolicyRow | ExpiryPolicyRow | AssignedExpiryPolicyRow | RtoPendingRow) {
  return row.customer?.custName ?? row.customerNameLegacy ?? '-'
}

function customerMobile(row: PendingPolicyRow | ExpiryPolicyRow | AssignedExpiryPolicyRow | RtoPendingRow) {
  if ('customerMobileLegacy' in row) return row.customer?.custMobile ?? row.customerMobileLegacy ?? '-'
  return row.customer?.custMobile ?? row.customerMobLegacy ?? '-'
}

function agentName(row: PendingPolicyRow | ExpiryPolicyRow | RtoPendingRow) {
  return row.partnerMaster?.name ?? row.agentNameLegacy ?? '-'
}

function agentMobile(row: PendingPolicyRow | ExpiryPolicyRow | RtoPendingRow) {
  return row.partnerMaster?.mobile ?? row.agentMobileNoLegacy ?? '-'
}

function textMatches(parts: Array<string | number | null | undefined>, query: string) {
  if (!query) return true
  const haystack = parts.filter(value => value != null).join(' ').toLowerCase()
  return haystack.includes(query.toLowerCase())
}

function dateMs(value: DateValue) {
  return value ? new Date(value).getTime() : 0
}

function sortByMode<T>(rows: T[], sort: SortMode, getDate: (row: T) => DateValue, getPriority: (row: T) => number) {
  const next = [...rows]
  if (sort === 'dateAsc') return next.sort((a, b) => dateMs(getDate(a)) - dateMs(getDate(b)))
  if (sort === 'dateDesc') return next.sort((a, b) => dateMs(getDate(b)) - dateMs(getDate(a)))
  return next.sort((a, b) => getPriority(a) - getPriority(b) || dateMs(getDate(a)) - dateMs(getDate(b)))
}

function CompactKpi({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
  onClick,
  visual,
  href,
}: {
  label: string
  value: number
  sub?: string
  icon: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  onClick?: () => void
  visual?: ReactNode
  href?: string
}) {
  const colors = {
    neutral: { icon: 'bg-blue-50 text-blue-600', visual: 'text-blue-400', ring: 'hover:border-blue-200' },
    success: { icon: 'bg-emerald-50 text-emerald-600', visual: 'text-emerald-400', ring: 'hover:border-emerald-200' },
    warning: { icon: 'bg-amber-50 text-amber-600', visual: 'text-amber-400', ring: 'hover:border-amber-200' },
    danger: { icon: 'bg-red-50 text-red-600', visual: 'text-red-400', ring: 'hover:border-red-200' },
  }
  const content = (
    <div className="flex h-full items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${colors[tone].icon}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-bold leading-none text-[#11275B]">{value}</span>
          {sub && <span className="truncate text-xs font-medium text-slate-500">{sub}</span>}
        </div>
      </div>
      {visual && <div className={`flex h-10 shrink-0 items-end ${colors[tone].visual}`}>{visual}</div>}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </div>
  )
  const className = `block h-[78px] min-w-0 cursor-pointer overflow-hidden rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/20 ${colors[tone].ring}`
  if (href) {
    return <a href={href} onClick={onClick} className={className}>{content}</a>
  }
  return <button type="button" onClick={onClick} className={className}>{content}</button>
}

function WorkTable({
  headers,
  children,
  empty,
  maxHeight = 'max-h-[210px]',
  tableMinWidth = 'min-w-full',
  tableClass = 'w-full',
}: {
  headers: string[]
  children: ReactNode
  empty?: string
  maxHeight?: string
  tableMinWidth?: string
  tableClass?: string
}) {
  const hasRows = Children.count(children) > 0
  return (
    <div className={`${maxHeight} overflow-auto rounded-lg border border-gray-200 bg-white`}>
      <div className={tableMinWidth}>
        <table className={`${tableClass} text-[13px]`}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50">
              {headers.map(header => (
                <th key={header} className="whitespace-nowrap px-3 py-2 text-left text-[13px] font-bold uppercase text-gray-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {hasRows ? children : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-8 text-center text-sm text-gray-400">{empty ?? 'No records found'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OwnShareBar({ total, own }: { total: number; own: number }) {
  const percentage = total > 0 ? Math.min(100, (own / total) * 100) : 0
  const visiblePercentage = own > 0 ? Math.max(2, percentage) : 0
  return <div className="min-w-[132px]"><div className="mb-1 flex items-center justify-between text-[13px] font-medium text-slate-500"><span>Own share</span><span>{percentage.toFixed(1)}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Own lead share" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}><div className="h-full rounded-full bg-blue-500" style={{ width: `${visiblePercentage}%` }} /></div></div>
}

function SparkLine() {
  return (
    <svg width="82" height="34" viewBox="0 0 96 34" aria-hidden="true" className="text-current">
      <path d="M2 29H94" stroke="currentColor" strokeOpacity="0.2" />
      <path d="M4 27C14 27 14 14 24 16C33 18 32 28 42 24C50 20 51 8 60 11C68 14 66 26 76 25C85 24 84 14 92 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="11" r="3" fill="white" />
    </svg>
  )
}

function FunnelVisual() {
  return (
    <div aria-hidden="true" className="relative h-10 w-20">
      <div className="mx-auto h-0 w-16 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent border-t-blue-500/80" />
      <div className="mx-auto h-0 w-11 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-sky-300/80" />
      <div className="mx-auto h-3 w-4 bg-blue-100" />
    </div>
  )
}

function PendingFilesVisual({
  rto,
  payments,
  insurance,
  canRto,
  canInsurance,
  onOpen,
}: {
  rto: number
  payments: number
  insurance: number
  canRto: boolean
  canInsurance: boolean
  onOpen: (workspace: Workspace) => void
}) {
  const items = [
    { label: 'RTO', value: rto, workspace: 'rto' as const, show: canRto, icon: <Car className="h-4 w-4 text-red-500" /> },
    { label: 'Payments', value: payments, workspace: 'payments' as const, show: canRto, icon: <FileText className="h-4 w-4 text-amber-500" /> },
    { label: 'Insurance', value: insurance, workspace: 'insurance' as const, show: canInsurance, icon: <Shield className="h-4 w-4 text-yellow-600" /> },
  ].filter(item => item.show)
  return <div className="grid shrink-0 grid-cols-3 gap-1">{items.map(item => <button key={item.label} type="button" title={item.label} onClick={event => { event.stopPropagation(); onOpen(item.workspace) }} className="grid h-12 w-14 cursor-pointer grid-rows-[17px_14px_12px] place-items-center rounded-lg px-0.5 text-center leading-none text-slate-600 transition hover:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-300"><div>{item.icon}</div><strong className="text-base leading-none text-[#11275B]">{item.value}</strong><span className="max-w-full whitespace-nowrap text-[11px] font-medium">{item.label}</span></button>)}</div>
}

function PendingFilesKpi({ value, rto, payments, insurance, canRto, canInsurance, onOpen }: { value: number; rto: number; payments: number; insurance: number; canRto: boolean; canInsurance: boolean; onOpen: (workspace: Workspace) => void }) {
  return <div className="grid h-[78px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-hidden rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.08)]"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><FileText className="h-4 w-4" /></span><div className="min-w-0"><span className="block truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">Pending Files</span><div className="mt-1 flex items-baseline gap-2"><span className="text-xl font-bold leading-none text-[#11275B]">{value}</span><span className="text-xs font-medium text-slate-500">pending</span></div></div></div><PendingFilesVisual rto={rto} payments={payments} insurance={insurance} canRto={canRto} canInsurance={canInsurance} onOpen={onOpen} /></div>
}

function ActionLoad({
  overdueFollowups,
  pendingPayments,
  insuranceItems,
  rtoRcPending,
  permissions,
}: {
  overdueFollowups: number
  pendingPayments: number
  insuranceItems: number
  rtoRcPending: number
  permissions: DashboardCommandCenterProps['permissions']
}) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const rows = [
    { show: permissions.canFollowup, label: 'Overdue Follow-up', value: overdueFollowups, color: '#dc5f5f', href: `/followup?status=FollowUp&followUpDateTo=${localDateParam(yesterday)}` },
    { show: permissions.canRto, label: 'Pending Payments', value: pendingPayments, color: '#9a7378', href: '/dashboard?workspace=payments' },
    { show: permissions.canInsurance, label: 'Insurance', value: insuranceItems, color: '#8f969e', href: '/dashboard?workspace=insurance' },
    { show: permissions.canRto, label: 'RTO', value: rtoRcPending, color: '#c6ced6', href: '/dashboard?workspace=rto' },
  ].filter(row => row.show)
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const max = Math.max(...rows.map(row => row.value), 1)
  const segments = rows.reduce<Array<{ row: typeof rows[number]; start: number; end: number }>>((acc, row) => {
    const start = acc.length ? acc[acc.length - 1].end : 0
    const size = total ? (row.value / total) * 100 : 0
    acc.push({ row, start, end: start + size })
    return acc
  }, [])
  const donut = total
    ? `conic-gradient(${segments.map(segment => `${segment.row.color} ${segment.start}% ${segment.end}%`).join(', ')}, #e5e7eb 0)`
    : '#e5e7eb'
  return (
    <div className="h-full overflow-hidden rounded-lg bg-white p-4">
      <h3 className="text-base font-semibold text-gray-900">Action Load Analyzer</h3>
      <div className="mt-3 grid h-[calc(100%-2rem)] grid-cols-[118px_minmax(0,1fr)] items-center gap-2">
        <div className="grid h-[108px] w-[108px] place-items-center justify-self-center rounded-full shadow-[0_0_18px_rgba(239,107,104,0.25)]" style={{ background: donut }}>
          <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white text-center">
            <div>
              <div className="text-2xl font-bold leading-none text-gray-900">{total}</div>
              <div className="mt-1 text-xs leading-tight text-gray-500">total open<br />attention</div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          {rows.map((row, index) => {
            const sizes = ['h-10 w-10', 'h-8 w-8', 'h-8 w-8', 'h-8 w-8']
            return (
              <a key={row.label} href={row.href} className="grid grid-cols-[40px_minmax(0,1fr)_28px] items-center gap-2 rounded-md transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/25">
                <div className={`grid ${sizes[index]} place-items-center rounded-full shadow-md`} style={{ background: `conic-gradient(${row.color} ${Math.max(8, Math.round((row.value / max) * 100))}%, #e5e7eb 0)` }}>
                  <div className="h-2/3 w-2/3 rounded-full bg-white" />
                </div>
                <div className="min-w-0 text-xs leading-tight text-gray-700">
                  <div>{row.label}</div>
                </div>
                <strong className="shrink-0 text-right text-sm leading-none text-gray-900">{row.value}</strong>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TodoWorkloadSnapshot({ items }: { items: AttentionItem[] }) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)
  const inNextWeek = new Date(endOfToday)
  inNextWeek.setDate(inNextWeek.getDate() + 7)
  const dueDate = (item: AttentionItem) => item.date ? new Date(item.date) : null
  const overdue = items.filter(item => item.priority === 'High').length
  const dueToday = items.filter(item => {
    const date = dueDate(item)
    return item.priority !== 'High' && date !== null && date >= startOfToday && date < endOfToday
  }).length
  const upcoming = items.filter(item => {
    const date = dueDate(item)
    return item.priority !== 'High' && date !== null && date >= endOfToday && date < inNextWeek
  }).length
  const pending = Math.max(items.length - overdue - dueToday - upcoming, 0)
  const total = items.length
  const parts = [
    { label: 'Overdue', value: overdue, color: '#ef4444', dot: 'bg-red-500' },
    { label: 'Due today', value: dueToday, color: '#f59e0b', dot: 'bg-amber-500' },
    { label: 'Upcoming', value: upcoming, color: '#3b82f6', dot: 'bg-blue-500' },
    { label: 'Pending', value: pending, color: '#94a3b8', dot: 'bg-slate-400' },
  ]
  const gradient = total
    ? `conic-gradient(${parts.reduce<{ value: string; offset: number }>((state, part) => {
      const start = state.offset
      const end = start + (part.value / total) * 360
      return { value: `${state.value}${part.color} ${start}deg ${end}deg, `, offset: end }
    }, { value: '', offset: 0 }).value.slice(0, -2)})`
    : 'conic-gradient(#e2e8f0 0deg 360deg)'
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-sm font-bold text-[#172d62]">Workload Snapshot</h2><p className="mt-0.5 text-[11px] text-slate-500">Open work by urgency and module</p></div>
        {overdue > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600"><AlertTriangle className="h-3 w-3" /> {overdue} overdue</span>}
      </div>
      <div className="grid min-h-0 flex-1 content-center">
        <div className="flex items-center justify-center gap-4">
          <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: gradient }} aria-label={`${total} open tasks`}>
            <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-white text-center shadow-sm"><strong className="text-2xl leading-none text-[#172d62]">{total}</strong><span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">open</span></div>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">{parts.map(part => <div key={part.label} className="flex items-center gap-1.5 text-xs text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${part.dot}`} /><span>{part.label}</span><strong className="ml-auto text-slate-800">{part.value}</strong></div>)}</div>
        </div>
      </div>
    </section>
  )
}

export function DashboardCommandCenterClient(props: DashboardCommandCenterProps) {
  const [workspace, setWorkspace] = useState<Workspace>(props.initialWorkspace ?? 'leads')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('priority')
  const [page, setPage] = useState(1)
  const [selectedLeadSource, setSelectedLeadSource] = useState<LeadSourceBreakdown | null>(null)
  const [salespersonRenewalAlertOpen, setSalespersonRenewalAlertOpen] = useState(props.assignedExpiryRenewalPolicies.length > 0)
  const [attentionBreakdownOpen, setAttentionBreakdownOpen] = useState(false)
  const detailWorkspaceRef = useRef<HTMLElement>(null)
  const { permissions, stats } = props

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const today = todayStart()
    const items: AttentionItem[] = []

    props.followups.forEach(row => {
      const due = row.followupDate ? new Date(row.followupDate) : null
      const overdue = due ? due < today : false
      items.push({
        id: `followup-${row.id}`,
        priority: overdue ? 'High' : 'Medium',
        rank: overdue ? 1 : 5,
        customer: row.customerName,
        type: overdue ? 'Overdue follow-up' : 'Follow-up',
        date: row.followupDate,
        status: row.status ?? 'FollowUp',
        actionHref: `/followup?status=FollowUp&inquiryId=${row.id}`,
        workspace: 'followups',
      })
    })

    props.expiryRenewalPolicies.forEach(row => {
      items.push({
        id: `insurance-expiry-${row.insuranceMainId}`,
        priority: 'High',
        rank: 2,
        customer: customerName(row),
        type: 'Insurance renewal',
        date: row.expiryDate,
        status: 'Expiring Soon',
        actionHref: `/insurance?search=${encodeURIComponent(row.carRegistrationNo ?? '')}`,
        workspace: 'insurance',
      })
    })

    props.pendingPolicies.forEach(row => {
      items.push({
        id: `insurance-pending-${row.insuranceMainId}`,
        priority: 'Medium',
        rank: 2,
        customer: customerName(row),
        type: 'Pending insurance policy',
        date: null,
        status: row.policyStatus ?? 'Pending',
        actionHref: `/insurance?search=${encodeURIComponent(row.carRegistrationNo ?? '')}`,
        workspace: 'insurance',
      })
    })

    props.pendingPayments.forEach(row => {
      items.push({
        id: `payment-${row.id}`,
        priority: 'Medium',
        rank: 3,
        customer: row.customerName ?? '-',
        type: `${row.type} payment`,
        date: row.followupDate,
        status: `Balance ${formatMoney(row.balance)}`,
        actionHref: row.href,
        workspace: 'payments',
      })
    })

    props.rtoPending.forEach(row => {
      items.push({
        id: `rto-${row.rtoAgentMainId}`,
        priority: row.rcStatus === 'Pending' ? 'Medium' : 'Normal',
        rank: row.rcStatus === 'Pending' ? 4 : 6,
        customer: customerName(row),
        type: row.rcStatus === 'Pending' ? 'RTO RC pending' : 'RTO transfer',
        date: null,
        status: [row.transferStatus, row.rcStatus].filter(Boolean).join(' / ') || 'Pending',
        actionHref: `/rto?registrationNo=${encodeURIComponent(row.carRegistrationNo ?? '')}`,
        workspace: 'rto',
      })
    })

    return items.sort((a, b) => a.rank - b.rank || new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())
  }, [props.expiryRenewalPolicies, props.followups, props.pendingPayments, props.pendingPolicies, props.rtoPending])

  const currentRows = useMemo(() => {
    const q = query.trim()
    const rows = attentionItems.filter(row => textMatches([row.customer, row.type, row.status], q))
    if (sort === 'dateAsc') return rows.sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())
    if (sort === 'dateDesc') return rows.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    return rows.sort((a, b) => a.rank - b.rank)
  }, [attentionItems, query, sort])

  const hasOverdueAttention = attentionItems.some(row => row.priority === 'High')

  const filteredLeadDetails = useMemo(() => {
    // This is the legacy operational sequence, not a ranked report. Preserve it
    // even when dashboard sorting is changed for the other workspaces.
    return props.leadDetails.filter(row => textMatches([row.label, row.total, row.own, row.other], query))
  }, [props.leadDetails, query])

  const filteredFollowups = useMemo(() => {
    const rows = props.followups.filter(row => textMatches([row.customerName, row.mobile, row.classification, row.status, formatDate(row.followupDate)], query))
    return sortByMode(rows, sort, row => row.followupDate, row => dateMs(row.followupDate))
  }, [props.followups, query, sort])

  const insuranceRows = useMemo(() => [
    ...props.pendingPolicies.map(row => ({
      id: `p-${row.insuranceMainId}`,
      type: 'Pending Policy',
      reg: row.carRegistrationNo,
      name: customerName(row),
      mobile: customerMobile(row),
      agent: agentName(row),
      agentMobile: agentMobile(row),
      expiryDate: null as DateValue,
      renewalDate: null as DateValue,
      date: null as DateValue,
      status: row.policyStatus ?? 'Pending',
      priority: 2,
    })),
    ...props.expiryRenewalPolicies.map(row => ({
      id: `e-${row.insuranceMainId}`,
      type: 'Expiring Soon',
      reg: row.carRegistrationNo,
      name: customerName(row),
      mobile: customerMobile(row),
      agent: agentName(row),
      agentMobile: agentMobile(row),
      expiryDate: row.expiryDate,
      renewalDate: row.renewalDate,
      date: row.expiryDate,
      status: 'Expiring Soon',
      priority: 1,
    })),
  ], [props.expiryRenewalPolicies, props.pendingPolicies])

  const filteredInsuranceRows = useMemo(() => {
    const rows = insuranceRows.filter(row => textMatches([row.type, row.reg, row.name, row.mobile, row.agent, row.agentMobile, row.status, formatDate(row.expiryDate), formatDate(row.renewalDate)], query))
    return sortByMode(rows, sort, row => row.date, row => row.priority)
  }, [insuranceRows, query, sort])
  const filteredPendingInsuranceRows = filteredInsuranceRows.filter(row => row.type === 'Pending Policy')
  const filteredExpiryInsuranceRows = filteredInsuranceRows.filter(row => row.type === 'Expiring Soon')

  const filteredRtoRows = useMemo(() => {
    const rows = props.rtoPending.filter(row => textMatches([row.carRegistrationNo, customerName(row), customerMobile(row), agentName(row), agentMobile(row), row.transferStatus, row.rcStatus], query))
    return sortByMode(rows, sort, () => null, row => row.rcStatus === 'Pending' ? 1 : row.transferStatus === 'Pending' ? 2 : 3)
  }, [props.rtoPending, query, sort])

  const filteredPaymentRows = useMemo(() => {
    const rows = props.pendingPayments.filter(row => textMatches([row.type, row.registrationNo, row.customerName, row.customerMobile, row.agentName, row.agentMobile, row.balance, formatDate(row.followupDate)], query))
    return sortByMode(rows, sort, row => row.followupDate, row => -row.balance)
  }, [props.pendingPayments, query, sort])

  const filteredLoanRows = useMemo(() => {
    const rows = props.pendingPayments.filter(row => row.type === 'Loan' && textMatches([row.registrationNo, row.customerName, row.customerMobile, row.agentName, row.agentMobile, row.balance, formatDate(row.followupDate)], query))
    return sortByMode(rows, sort, row => row.followupDate, row => -row.balance)
  }, [props.pendingPayments, query, sort])

  const filteredReminderRows = useMemo(() => {
    const rows = props.reminders.filter(row => textMatches([row.name, row.mobile, row.email, row.type], query))
    if (sort === 'dateDesc') return [...rows].sort((a, b) => b.name.localeCompare(a.name))
    return [...rows].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  }, [props.reminders, query, sort])
  const filteredBirthdayRows = filteredReminderRows.filter(row => row.type === 'Birth Day')
  const filteredAnniversaryRows = filteredReminderRows.filter(row => row.type === 'Anniversary')
  const birthdayCount = props.reminders.filter(row => row.type === 'Birth Day').length
  const anniversaryCount = props.reminders.filter(row => row.type === 'Anniversary').length
  const loanCount = props.pendingPayments.filter(row => row.type === 'Loan').length

  const tabs = [
    { key: 'leads' as const, label: 'Lead Details', count: props.leadDetails.find(row => row.label === 'All Leads')?.total ?? 0, show: permissions.canFollowup },
    { key: 'attention' as const, label: 'To-do', count: currentRows.length, show: true, warning: hasOverdueAttention },
    { key: 'followups' as const, label: 'Follow-ups', count: stats.pendingFollowups, show: permissions.canFollowup },
    { key: 'insurance' as const, label: 'Insurance', count: props.pendingPolicies.length + props.expiryRenewalPolicies.length, show: permissions.canInsurance },
    { key: 'rto' as const, label: 'RTO', count: props.rtoPending.length, show: permissions.canRto },
    { key: 'payments' as const, label: 'Payments', count: props.pendingPayments.filter(row => row.type !== 'Loan').length, show: permissions.canRto || permissions.canInsurance },
    { key: 'loans' as const, label: 'Loans', count: loanCount, show: permissions.canLoan },
    { key: 'birthdays' as const, label: 'Birthdays', count: birthdayCount, show: true },
    { key: 'anniversaries' as const, label: 'Anniversaries', count: anniversaryCount, show: true },
  ].filter(tab => tab.show)

  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(currentRows.length / pageSize))
  const pagedAttention = currentRows.slice((page - 1) * pageSize, page * pageSize)

  const openWorkspace = (next: Workspace, focusDetail = false) => {
    setWorkspace(next)
    setQuery('')
    setSort('priority')
    setPage(1)
    if (typeof window !== 'undefined') {
      window.history.pushState({ workspace: next }, '', workspaceHref(next))
      if (focusDetail) {
        window.requestAnimationFrame(() => {
          detailWorkspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
    }
  }

  useEffect(() => {
    const syncWorkspace = () => setWorkspace(readWorkspaceFromUrl())
    window.addEventListener('popstate', syncWorkspace)
    return () => window.removeEventListener('popstate', syncWorkspace)
  }, [])

  const rtoRcPending = props.rtoPending.filter(row => row.rcStatus === 'Pending').length
  const insuranceAttention = props.expiryRenewalPolicies.length + props.pendingPolicies.length
  const kpiCount = [
    permissions.canInventory,
    permissions.canInquiry && permissions.canFollowup,
    permissions.canFollowup,
    permissions.canRto || permissions.canInsurance,
  ].filter(Boolean).length
  const kpiGridClass = kpiCount === 1
    ? 'grid-cols-1'
    : kpiCount === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : kpiCount === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
  return (
    <div className="min-h-full 2xl:h-full 2xl:min-h-0 2xl:overflow-hidden">
      <Modal title="Insurance renewal alerts" open={salespersonRenewalAlertOpen} onClose={() => setSalespersonRenewalAlertOpen(false)} width="max-w-2xl">
        <p className="text-sm text-gray-600">The following customers assigned to you have insurance policies expiring within the next 30 days.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-[620px] w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Registration</th><th className="px-3 py-2">Expiry date</th><th className="px-3 py-2">Renewal date</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {props.assignedExpiryRenewalPolicies.map(row => <tr key={row.insuranceMainId}><td className="px-3 py-2 font-medium text-gray-900"><div>{customerName(row)}</div><div className="font-mono text-xs font-normal text-gray-500">{customerMobile(row)}</div></td><td className="px-3 py-2 font-mono text-xs font-semibold">{row.carRegistrationNo ?? '-'}</td><td className="px-3 py-2 text-gray-700">{formatDate(row.expiryDate)}</td><td className="px-3 py-2 text-gray-700">{formatDate(row.renewalDate)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Modal>
      <Modal title="Needs attention" open={attentionBreakdownOpen} onClose={() => setAttentionBreakdownOpen(false)} width="max-w-2xl">
        <p className="text-sm text-gray-600">Open work grouped by urgency and module. Select a category to continue in that workspace.</p>
        <div className="mt-4 h-[240px]"><ActionLoad overdueFollowups={stats.overdueFollowups} pendingPayments={props.pendingPayments.length} insuranceItems={insuranceAttention} rtoRcPending={rtoRcPending} permissions={permissions} /></div>
      </Modal>
      <div className="min-h-full bg-[#f5f8fc] p-3 2xl:h-full 2xl:overflow-hidden">
        <div className="grid gap-3 2xl:h-full 2xl:grid-rows-[94px_78px_minmax(250px,1fr)]">
          <div className="relative min-h-[94px] overflow-hidden rounded-2xl bg-[linear-gradient(105deg,#0d1f50_0%,#102966_46%,#8c143d_100%)] px-5 py-3 shadow-[0_12px_26px_rgba(20,38,91,0.2)]">
            <div className="absolute inset-y-0 left-[27%] right-[24%] bg-[url('/login-hero-car.png')] bg-[length:500px_auto] bg-[position:72%_48%] bg-no-repeat opacity-70 mix-blend-screen" aria-hidden="true" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,24,66,0.25),transparent_48%,rgba(130,16,57,0.12))]" aria-hidden="true" />
            <div className="dashboard-hero-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" aria-hidden="true" />
            <div className="relative flex h-full flex-wrap items-center justify-between gap-4">
              <div className="text-white">
                <div className="flex items-center gap-3">
                  <span className="dashboard-greeting-sun grid h-10 w-10 place-items-center rounded-full bg-white/10 text-amber-300 ring-1 ring-white/10"><Sun className="h-5 w-5" /></span>
                  <div><div className="text-base font-bold">Good morning, {props.firstName}</div><p className="mt-0.5 text-xs text-white/75">Here&apos;s what&apos;s happening with your dealership today.</p></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-white/80">{props.todayLabel}</span>
                <button type="button" onClick={() => setAttentionBreakdownOpen(true)} className="flex items-center gap-2 rounded-lg border border-red-100/80 bg-white/95 px-3 py-2 text-left text-red-800 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-red-200">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white"><AlertTriangle className="h-3.5 w-3.5" /></span>
                  <div><div className="text-xs font-bold">Action Required</div><div className="mt-0.5 text-[11px] text-red-700">{stats.overdueFollowups} items need your attention.</div></div><ChevronRight className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            </div>
          </div>

          <div className={`relative z-10 -mt-4 grid gap-3 ${kpiGridClass}`}>
            {permissions.canInventory && (
              <CompactKpi label="Available Stock" value={stats.availableStock} sub="available" tone="success" icon={<Car className="h-4 w-4" />} visual={<SparkLine />} href="/inventory?status=In%20Stock" />
            )}
            {permissions.canInquiry && (
              <CompactKpi label="Today's Leads" value={stats.todayInquiries} icon={<Users className="h-4 w-4" />} visual={<FunnelVisual />} href={`/inquiry?quickFilter=all&inquiryDate=${localDateParam()}`} />
            )}
            {permissions.canFollowup && (
              <CompactKpi label="Critical Issues" value={stats.overdueFollowups} sub="overdue" tone={stats.overdueFollowups ? 'danger' : 'warning'} icon={<AlertTriangle className="h-4 w-4" />} href="/followup?status=FollowUp" />
            )}
            {(permissions.canRto || permissions.canInsurance) && <PendingFilesKpi value={stats.pendingRTO + props.pendingPayments.length + props.pendingPolicies.length} rto={stats.pendingRTO} payments={props.pendingPayments.length} insurance={props.pendingPolicies.length} canRto={permissions.canRto} canInsurance={permissions.canInsurance} onOpen={workspace => openWorkspace(workspace)} />}
          </div>

      <section ref={detailWorkspaceRef} className="-mt-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-3 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div role="tablist" aria-label="Dashboard workspaces" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {tabs.map(tab => (
              <button key={tab.key} role="tab" aria-selected={workspace === tab.key} type="button" onClick={() => openWorkspace(tab.key)} className={`cursor-pointer whitespace-nowrap rounded-lg border px-3 py-2 text-[13px] font-semibold leading-none transition-all focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/20 ${workspace === tab.key ? 'border-[#1B2A6B] bg-[#1B2A6B] text-white shadow-sm' : 'border-transparent bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-200 hover:bg-slate-100 hover:text-[#1B2A6B]'}`}>
                {tab.warning && <AlertTriangle aria-label="Overdue items need attention" className={`mr-1 inline-block h-3.5 w-3.5 align-[-2px] ${workspace === tab.key ? 'text-amber-200' : 'text-amber-600'}`} />}
                {tab.label} <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[11px] ${workspace === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
              <input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search workspace..." className="h-9 w-52 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-[#1B2A6B] focus:bg-white focus:ring-2 focus:ring-[#1B2A6B]/10" />
            </div>
            <select value={sort} onChange={event => { setSort(event.target.value as SortMode); setPage(1) }} className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium outline-none focus:border-[#1B2A6B] focus:bg-white focus:ring-2 focus:ring-[#1B2A6B]/10">
              <option value="priority">Priority</option>
              <option value="dateAsc">Date Asc</option>
              <option value="dateDesc">Date Desc</option>
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
        {workspace === 'leads' ? (
          <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.96fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center gap-2"><h2 className="text-base font-bold text-[#172d62]">Lead Details</h2><span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-bold text-white">{stats.totalInquiries.toLocaleString('en-IN')}</span></div>
              <WorkTable headers={['Leads Heads', 'Total Count', 'Own Count', "Other's Count", 'Own Share']} maxHeight="max-h-[215px] flex-1 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-full" tableClass="w-full [&_th]:py-1 [&_td]:py-1">
                {filteredLeadDetails.map(row => (
                  <tr key={row.label} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
                    <td className="px-3 py-2"><a href={row.href} className="font-semibold text-blue-600 hover:underline">{row.total}</a></td>
                    <td className="px-3 py-2"><a href={row.ownHref} className="font-semibold text-blue-600 hover:underline">{row.own}</a></td>
                    <td className="px-3 py-2 font-semibold text-blue-600">{row.other}</td>
                    <td className="px-3 py-2"><OwnShareBar total={Number(row.total)} own={Number(row.own)} /></td>
                  </tr>
                ))}
              </WorkTable>
            </section>
              <div className="grid min-h-0 gap-3">
                <section className="min-h-[154px] rounded-xl border border-slate-100 bg-white p-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                  <LeadSourceChart
                    data={props.leadSources}
                    totalLeads={stats.totalInquiries}
                    selectedSourceCode={selectedLeadSource?.sourceCode}
                    onSelectSource={source => setSelectedLeadSource(current => current?.sourceCode === source.sourceCode ? null : source)}
                  />
                </section>
                <section className="min-h-[154px] rounded-xl border border-slate-100 bg-white p-3.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                  <LeadLocationChart
                    breakdowns={selectedLeadSource?.sourceCode ? props.leadRegionBreakdowns.bySource[selectedLeadSource.sourceCode] ?? { month: [], quarter: [], year: [] } : props.leadRegionBreakdowns.all}
                    selectedSourceName={selectedLeadSource?.name}
                    selectedSourceCode={selectedLeadSource?.sourceCode}
                    onClearSource={() => setSelectedLeadSource(null)}
                    title="Leads by Region"
                    emptyMessage={selectedLeadSource ? `No controlled location data for ${selectedLeadSource.name} in this period.` : 'No controlled location data for this period.'}
                  />
                </section>
              </div>
          </div>
        ) : workspace === 'followups' ? (
          <WorkTable headers={['Customer', 'Mobile', 'Follow-up Date', 'Classification', 'Status', 'Action']} maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[760px]">
            {filteredFollowups.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{row.customerName}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.mobile}</td>
                <td className="px-3 py-2 text-gray-600">{formatDate(row.followupDate)}</td>
                <td className="px-3 py-2">{row.classification ? <Badge label={row.classification} /> : '-'}</td>
                <td className="px-3 py-2">{row.status ? <Badge label={row.status} /> : '-'}</td>
                <td className="px-3 py-2"><a href={`/followup?status=FollowUp&inquiryId=${row.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
              </tr>
            ))}
          </WorkTable>
        ) : workspace === 'insurance' ? (
          <div className="grid max-h-[215px] gap-3 overflow-auto md:grid-cols-2">
            <section className="min-w-0">
              <h3 className="mb-1 text-xs font-semibold text-[#008ab8]">Pending Insurance Policy Details</h3>
              <WorkTable headers={['Registration', 'Customer', 'Mobile', 'Agent', 'Agent Mobile', 'Status', 'Action']} maxHeight="max-h-[186px]" tableMinWidth="min-w-[760px]">
                {filteredPendingInsuranceRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{row.reg ?? '-'}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.mobile}</td>
                    <td className="px-3 py-2 text-gray-700">{row.agent}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.agentMobile}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2"><a href={`/insurance?search=${encodeURIComponent(row.reg ?? '')}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
                  </tr>
                ))}
              </WorkTable>
            </section>
            <section className="min-w-0">
              <h3 className="mb-1 text-xs font-semibold text-[#4f8a10]">Expiry Date/Renewal Date of Policy</h3>
              <WorkTable headers={['Registration', 'Customer', 'Mobile', 'Agent', 'Agent Mobile', 'Expiry Date', 'Renewal Date', 'Action']} maxHeight="max-h-[186px]" tableMinWidth="min-w-[860px]">
                {filteredExpiryInsuranceRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-semibold">{row.reg ?? '-'}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.mobile}</td>
                    <td className="px-3 py-2 text-gray-700">{row.agent}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.agentMobile}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(row.expiryDate)}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(row.renewalDate)}</td>
                    <td className="px-3 py-2"><a href={`/insurance?search=${encodeURIComponent(row.reg ?? '')}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
                  </tr>
                ))}
              </WorkTable>
            </section>
          </div>
        ) : workspace === 'rto' ? (
          <WorkTable headers={['Registration', 'Customer', 'Mobile', 'Agent', 'Agent Mobile', 'Transfer', 'RC', 'Action']} maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[860px]">
            {filteredRtoRows.map(row => (
              <tr key={row.rtoAgentMainId} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{row.carRegistrationNo ?? '-'}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{customerName(row)}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{customerMobile(row)}</td>
                <td className="px-3 py-2 text-gray-700">{agentName(row)}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{agentMobile(row)}</td>
                <td className="px-3 py-2">{row.transferStatus ? <Badge label={row.transferStatus} /> : '-'}</td>
                <td className="px-3 py-2">{row.rcStatus ? <Badge label={row.rcStatus} /> : '-'}</td>
                <td className="px-3 py-2"><a href={`/rto?registrationNo=${encodeURIComponent(row.carRegistrationNo ?? '')}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
              </tr>
            ))}
          </WorkTable>
        ) : workspace === 'payments' ? (
          <WorkTable headers={['Type', 'Registration', 'Customer', 'Customer Mobile', 'Agent', 'Agent Mobile', 'Due', 'Total', 'Received', 'Balance', 'Action']} maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[1080px]">
            {filteredPaymentRows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2"><Badge label={row.type} /></td>
                <td className="px-3 py-2 font-mono text-xs font-semibold">{row.registrationNo ?? '-'}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{row.customerName ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.customerMobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-700">{row.agentName ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.agentMobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-600">{formatDate(row.followupDate)}</td>
                <td className="px-3 py-2 text-gray-700">{formatMoney(row.actual)}</td>
                <td className="px-3 py-2 text-gray-700">{formatMoney(row.received)}</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{formatMoney(row.balance)}</td>
                <td className="px-3 py-2"><a href={row.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
              </tr>
            ))}
          </WorkTable>
        ) : workspace === 'loans' ? (
          <WorkTable headers={['Registration', 'Customer', 'Customer Mobile', 'Bank Contact', 'Bank Mobile', 'Follow-up', 'Payout', 'Received', 'Balance', 'Action']} maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[980px]">
            {filteredLoanRows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs font-semibold">{row.registrationNo ?? '-'}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{row.customerName ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.customerMobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-700">{row.agentName ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.agentMobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-600">{formatDate(row.followupDate)}</td>
                <td className="px-3 py-2 text-gray-700">{formatMoney(row.actual)}</td>
                <td className="px-3 py-2 text-gray-700">{formatMoney(row.received)}</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{formatMoney(row.balance)}</td>
                <td className="px-3 py-2"><a href={row.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
              </tr>
            ))}
          </WorkTable>
        ) : workspace === 'birthdays' ? (
          <WorkTable headers={['Name', 'Mobile', 'Email']} empty="No birthdays today" maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[620px]">
            {filteredBirthdayRows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.mobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-700">{row.email ?? '-'}</td>
              </tr>
            ))}
          </WorkTable>
        ) : workspace === 'anniversaries' ? (
          <WorkTable headers={['Name', 'Mobile', 'Email']} empty="No anniversaries today" maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[620px]">
            {filteredAnniversaryRows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.mobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-700">{row.email ?? '-'}</td>
              </tr>
            ))}
          </WorkTable>
        ) : workspace === 'attention' ? (
          <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.96fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-base font-bold text-[#172d62]">To-do</h2><p className="mt-0.5 text-xs text-slate-500">Priority work awaiting action</p></div><span className="rounded-full bg-[#1B2A6B] px-2 py-0.5 text-[11px] font-bold text-white">{attentionItems.length}</span></div>
              <WorkTable headers={['Priority', 'Customer', 'Type', 'Due / Date', 'Status', 'Action']} empty="No records found" maxHeight="max-h-[192px] flex-1 2xl:max-h-none" tableMinWidth="min-w-[760px]">
                {pagedAttention.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><Badge label={item.priority === 'High' ? 'Overdue' : item.priority} /></td>
                    <td className="px-3 py-2 font-medium text-gray-900">{item.customer}</td>
                    <td className="px-3 py-2 text-gray-700">{item.type}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(item.date)}</td>
                    <td className="px-3 py-2 text-gray-700">{item.status}</td>
                    <td className="whitespace-nowrap px-3 py-2"><button type="button" onClick={() => openWorkspace(item.workspace, true)} className="mr-3 cursor-pointer text-xs font-semibold text-[#1B2A6B] hover:underline">Details</button><a href={item.actionHref} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
                  </tr>
                ))}
              </WorkTable>
              <div className="mt-2 flex shrink-0 items-center justify-between text-xs text-gray-500">
                <span>Page {page} of {pageCount}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">Prev</button>
                  <button type="button" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">Next</button>
                </div>
              </div>
            </section>
            <TodoWorkloadSnapshot items={attentionItems} />
          </div>
        ) : null}
        </div>
      </section>
        </div>
      </div>
    </div>
  )
}
