'use client'

import { Children, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Car,
  Clock,
  ExternalLink,
  FileText,
  Search,
  Shield,
  Sun,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { LeadSourceChart } from './LeadSourceChart'

type Workspace = 'leads' | 'followups' | 'insurance' | 'rto' | 'payments' | 'birthdays'
type SortMode = 'priority' | 'dateAsc' | 'dateDesc'
type DateValue = string | Date | null
const DASHBOARD_WORKSPACES: Workspace[] = ['leads', 'followups', 'insurance', 'rto', 'payments', 'birthdays']

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
  leadSources: { name: string; value: number }[]
  leadDetails: LeadRow[]
  reminders: ReminderRow[]
  pendingPolicies: PendingPolicyRow[]
  expiryRenewalPolicies: ExpiryPolicyRow[]
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
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)
}

function customerName(row: PendingPolicyRow | ExpiryPolicyRow | RtoPendingRow) {
  return row.customer?.custName ?? row.customerNameLegacy ?? '-'
}

function customerMobile(row: PendingPolicyRow | ExpiryPolicyRow | RtoPendingRow) {
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
  tone?: 'neutral' | 'warning' | 'danger'
  onClick?: () => void
  visual?: ReactNode
  href?: string
}) {
  const colors = {
    neutral: 'border-white/15 bg-white/14 text-white',
    warning: 'border-amber-200/25 bg-amber-100/15 text-white',
    danger: 'border-red-200/35 bg-red-100/15 text-white',
  }
  const content = (
    <div className="grid h-full grid-rows-[18px_1fr]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/85">{label}</span>
        <span className="shrink-0 text-white/60">{icon}</span>
      </div>
      <div className="flex min-h-0 items-end justify-between gap-3">
        <div className="min-w-0 pb-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold leading-none">{value}</span>
            {sub && <span className="truncate text-sm text-white/75">{sub}</span>}
          </div>
        </div>
        {visual && <div className="flex h-10 shrink-0 items-end">{visual}</div>}
      </div>
    </div>
  )
  const className = `block h-[72px] min-w-0 cursor-pointer overflow-hidden rounded-lg border px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 ${colors[tone]}`
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
    <div className={`${maxHeight} overflow-auto rounded-lg border border-gray-200 bg-white [scrollbar-gutter:stable]`}>
      <div className={tableMinWidth}>
        <table className={`${tableClass} text-xs`}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50">
              {headers.map(header => (
                <th key={header} className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
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

function SparkLine() {
  return (
    <svg width="96" height="34" viewBox="0 0 96 34" aria-hidden="true" className="text-emerald-200/80">
      <path d="M2 29H94" stroke="currentColor" strokeOpacity="0.2" />
      <path d="M4 27C14 27 14 14 24 16C33 18 32 28 42 24C50 20 51 8 60 11C68 14 66 26 76 25C85 24 84 14 92 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="11" r="3" fill="white" />
    </svg>
  )
}

function FunnelVisual() {
  return (
    <div aria-hidden="true" className="relative h-10 w-20">
      <div className="mx-auto h-0 w-16 border-l-[12px] border-r-[12px] border-t-[18px] border-l-transparent border-r-transparent border-t-emerald-400/80" />
      <div className="mx-auto h-0 w-11 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-sky-300/80" />
      <div className="mx-auto h-3 w-4 bg-white/70" />
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
    { label: 'RTO', value: rto, workspace: 'rto' as const, show: canRto, icon: <Car className="h-5 w-5 text-red-200" /> },
    { label: 'Payments', value: payments, workspace: 'payments' as const, show: canRto, icon: <FileText className="h-5 w-5 text-yellow-200" /> },
    { label: 'Insurance', value: insurance, workspace: 'insurance' as const, show: canInsurance, icon: <Shield className="h-5 w-5 text-amber-200" /> },
  ].filter(item => item.show)
  return (
    <div className="grid shrink-0 grid-cols-3 gap-1.5">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={event => {
            event.stopPropagation()
            onOpen(item.workspace)
          }}
          className="grid h-10 w-11 cursor-pointer grid-rows-[16px_10px_10px] place-items-center rounded-md px-0.5 text-center text-[9px] leading-none text-white/80 transition hover:bg-white/15 focus:outline-none focus:ring-1 focus:ring-white/60"
        >
          <div className="scale-75">{item.icon}</div>
          <strong className="text-[10px] leading-none text-white">{item.value}</strong>
          <span className="max-w-full truncate">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function PendingFilesKpi({
  value,
  rto,
  payments,
  insurance,
  canRto,
  canInsurance,
  onOpen,
}: {
  value: number
  rto: number
  payments: number
  insurance: number
  canRto: boolean
  canInsurance: boolean
  onOpen: (workspace: Workspace) => void
}) {
  return (
    <div className="grid h-[72px] min-w-0 grid-rows-[18px_1fr] overflow-hidden rounded-lg border border-amber-200/25 bg-amber-100/15 px-3 py-2 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/85">Pending Files</span>
        <FileText className="h-4 w-4 shrink-0 text-white/60" />
      </div>
      <div className="flex min-h-0 items-end justify-between gap-2">
        <div className="flex min-w-0 shrink-0 items-baseline gap-2 pb-0.5">
          <span className="text-xl font-bold leading-none">{value}</span>
          <span className="text-sm text-white/75">pending</span>
        </div>
        <PendingFilesVisual rto={rto} payments={payments} insurance={insurance} canRto={canRto} canInsurance={canInsurance} onOpen={onOpen} />
      </div>
    </div>
  )
}

function DailyTotals({ stats, todayStats, permissions }: Pick<DashboardCommandCenterProps, 'stats' | 'todayStats' | 'permissions'>) {
  const today = localDateParam()
  const rows = [
    { show: permissions.canInventory, label: 'Available Stock', value: stats.availableStock, unit: stats.availableStock === 1 ? 'unit' : 'units', sub: 'available', href: '/inventory?status=In%20Stock', icon: <Car className="h-3.5 w-3.5" />, tone: 'bg-emerald-500', visual: <SparkLine /> },
    { show: permissions.canInquiry, label: "Today's Leads", value: stats.todayInquiries, unit: stats.todayInquiries === 1 ? 'lead' : 'leads', sub: 'today', href: `/inquiry?quickFilter=all&inquiryDate=${today}`, icon: <Users className="h-3.5 w-3.5" />, tone: 'bg-slate-500', visual: <FunnelVisual /> },
    { show: permissions.canFollowup, label: 'Follow-ups', value: todayStats.followupsToday, unit: todayStats.followupsToday === 1 ? 'task' : 'tasks', sub: 'due today', href: `/followup?status=FollowUp&followUpDateFrom=${today}&followUpDateTo=${today}`, icon: <Clock className="h-3.5 w-3.5" />, tone: 'bg-rose-500', visual: <FileText className="h-6 w-6 text-gray-500" /> },
    { show: permissions.canRto, label: 'Payments', value: todayStats.paymentsReceivedToday, unit: todayStats.paymentsReceivedToday === 1 ? 'task' : 'tasks', sub: 'received today', href: '/dashboard?workspace=payments', icon: <FileText className="h-3.5 w-3.5" />, tone: 'bg-gray-500', visual: <FileText className="h-6 w-6 text-gray-500" /> },
  ].filter(row => row.show)
  return (
    <div className="h-full overflow-hidden rounded-lg bg-white px-3 py-2.5">
      <h3 className="text-base font-semibold text-gray-900">Daily Totals</h3>
      <div className="mt-2 space-y-1">
        {rows.map(row => (
          <a key={row.label} href={row.href} className="grid grid-cols-[38px_24px_minmax(0,1fr)] items-center gap-2 rounded-lg transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/30">
            <div className="text-right">
              <div className="text-sm font-bold leading-none text-gray-900">{row.value}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-gray-500">{row.unit}</div>
            </div>
            <div className={`grid h-6 w-6 place-items-center rounded-full text-white ${row.tone}`}>{row.icon}</div>
            <div className="flex h-10 min-w-0 items-center justify-between gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 shadow-sm">
              <div className="min-w-0">
                <div className="whitespace-nowrap text-[9px] font-bold uppercase leading-tight text-gray-900">{row.label}: {row.value}</div>
                <div className="whitespace-nowrap text-[9px] uppercase leading-tight text-gray-600">{row.sub}</div>
              </div>
              <div className="grid h-7 w-11 shrink-0 place-items-center overflow-hidden opacity-80">
                <div className="scale-[0.46]">{row.visual}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
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
              <div className="mt-1 text-[11px] leading-tight text-gray-500">total open<br />attention</div>
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
                <div className="min-w-0 text-[11px] leading-tight text-gray-700">
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

export function DashboardCommandCenterClient(props: DashboardCommandCenterProps) {
  const [workspace, setWorkspace] = useState<Workspace>(props.initialWorkspace ?? 'leads')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('priority')
  const [page, setPage] = useState(1)
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

  const filteredReminderRows = useMemo(() => {
    const rows = props.reminders.filter(row => textMatches([row.name, row.mobile, row.email, row.type], query))
    if (sort === 'dateDesc') return [...rows].sort((a, b) => b.name.localeCompare(a.name))
    return [...rows].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  }, [props.reminders, query, sort])

  const totalAttention =
    (permissions.canFollowup ? stats.overdueFollowups : 0) +
    (permissions.canRto ? props.pendingPayments.length : 0) +
    (permissions.canInsurance ? props.expiryRenewalPolicies.length + props.pendingPolicies.length : 0) +
    (permissions.canRto ? props.rtoPending.length : 0) +
    props.reminders.length

  const tabs = [
    { key: 'leads' as const, label: 'Lead Details', count: props.leadDetails.find(row => row.label === 'All Leads')?.total ?? 0, show: permissions.canFollowup },
    { key: 'followups' as const, label: 'Follow-ups', count: stats.pendingFollowups, show: permissions.canFollowup },
    { key: 'insurance' as const, label: 'Insurance', count: props.pendingPolicies.length + props.expiryRenewalPolicies.length, show: permissions.canInsurance },
    { key: 'rto' as const, label: 'RTO', count: props.rtoPending.length, show: permissions.canRto },
    { key: 'payments' as const, label: 'Payments', count: props.pendingPayments.length, show: permissions.canRto },
    { key: 'birthdays' as const, label: 'Birthdays', count: props.reminders.length, show: true },
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
  const showActionLoad = permissions.canFollowup || permissions.canRto || permissions.canInsurance
  const showDailyTotals = permissions.canInventory || (permissions.canInquiry && permissions.canFollowup) || permissions.canFollowup || permissions.canRto
  const attentionAreas = [
    permissions.canFollowup ? 'follow-ups' : null,
    permissions.canRto ? 'payments' : null,
    permissions.canInsurance ? 'insurance' : null,
    permissions.canRto ? 'RTO' : null,
  ].filter(Boolean)
  const attentionDescription = attentionAreas.length
    ? `Highest priority work across ${attentionAreas.join(', ')}.`
    : 'No operational modules are available for this account.'

  return (
    <div className="min-h-full 2xl:h-full 2xl:min-h-0 2xl:overflow-hidden">
      <div className="min-h-full border border-black/20 bg-gradient-to-br from-[#10183d] via-[#123652] to-[#1f673d] p-3 shadow-2xl 2xl:h-full 2xl:overflow-hidden">
        <div className="grid gap-2 2xl:h-full 2xl:grid-rows-[auto_72px_235px_minmax(250px,1fr)]">
          <div className="flex flex-wrap items-start justify-between gap-3 px-1">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-base font-semibold text-white shadow-sm ring-1 ring-white/10">
                <Sun className="h-4 w-4 text-amber-200" />
                <span>Good morning, {props.firstName}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-white/65">{props.todayLabel}</span>
              <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-200 to-sky-500 text-white">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-bold">Action Required:</div>
                  <div>{totalAttention} items need your attention.</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`grid gap-3 ${kpiGridClass}`}>
            {permissions.canInventory && (
              <CompactKpi label="Available Stock" value={stats.availableStock} sub="available" icon={<Car className="h-4 w-4" />} visual={<SparkLine />} href="/inventory?status=In%20Stock" />
            )}
            {permissions.canInquiry && (
              <CompactKpi label="Today's Leads" value={stats.todayInquiries} icon={<Users className="h-4 w-4" />} visual={<FunnelVisual />} href={`/inquiry?quickFilter=all&inquiryDate=${localDateParam()}`} />
            )}
            {permissions.canFollowup && (
              <CompactKpi label="Critical Issues" value={stats.overdueFollowups} sub="overdue" tone={stats.overdueFollowups ? 'danger' : 'warning'} icon={<Clock className="h-4 w-4" />} href={`/followup?status=FollowUp&followUpDateTo=${localDateParam(new Date(Date.now() - 86_400_000))}`} />
            )}
            {(permissions.canRto || permissions.canInsurance) && (
              <PendingFilesKpi
                value={stats.pendingRTO + props.pendingPayments.length + props.pendingPolicies.length}
                rto={stats.pendingRTO}
                payments={props.pendingPayments.length}
                insurance={props.pendingPolicies.length}
                canRto={permissions.canRto}
                canInsurance={permissions.canInsurance}
                onOpen={workspace => openWorkspace(workspace)}
              />
            )}
          </div>

          <div className={`grid min-h-0 gap-3 ${showActionLoad && showDailyTotals ? '2xl:grid-cols-[minmax(0,1fr)_580px]' : ''}`}>
            <section className="min-h-0 overflow-hidden rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Needs Attention</h2>
            <p className="text-xs text-gray-500">{attentionDescription}</p>
            </div>
            <button type="button" onClick={() => openWorkspace('followups', true)} className="cursor-pointer text-xs font-semibold text-[#C8102E] hover:underline">View All</button>
          </div>
          <WorkTable headers={['Priority', 'Customer', 'Type', 'Due / Date', 'Status', 'Action']} empty="No urgent work right now" maxHeight="max-h-[145px]">
            {attentionItems.slice(0, 7).map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-2 py-2"><Badge label={item.priority === 'High' ? 'Overdue' : item.priority} /></td>
                <td className="px-2 py-2 font-medium text-gray-900">{item.customer}</td>
                <td className="px-2 py-2 text-gray-700">{item.type}</td>
                <td className="px-2 py-2 text-gray-600">{formatDate(item.date)}</td>
                <td className="px-2 py-2 text-gray-700">{item.status}</td>
                <td className="whitespace-nowrap px-2 py-2">
                  <button type="button" onClick={() => openWorkspace(item.workspace, true)} className="mr-3 cursor-pointer text-xs font-semibold text-[#1B2A6B] hover:underline">Details</button>
                  <a href={item.actionHref} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a>
                </td>
              </tr>
            ))}
          </WorkTable>
            </section>

            {(showActionLoad || showDailyTotals) && (
            <section className={`grid min-h-0 gap-3 overflow-hidden ${showActionLoad && showDailyTotals ? 'md:grid-cols-[minmax(270px,1fr)_minmax(270px,1fr)]' : ''}`}>
              {showActionLoad && (
                <ActionLoad
                  overdueFollowups={stats.overdueFollowups}
                  pendingPayments={props.pendingPayments.length}
                  insuranceItems={insuranceAttention}
                  rtoRcPending={rtoRcPending}
                  permissions={permissions}
                />
              )}
              {showDailyTotals && <DailyTotals stats={stats} todayStats={props.todayStats} permissions={permissions} />}
            </section>
            )}
          </div>

      <section ref={detailWorkspaceRef} className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-white p-3 shadow-sm">
        <div className="mb-2 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} type="button" onClick={() => openWorkspace(tab.key)} className={`cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${workspace === tab.key ? 'bg-[#1B2A6B] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {tab.label} <span className="ml-1 rounded bg-white/20 px-1">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
              <input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search workspace" className="h-8 w-48 rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-[#1B2A6B]" />
            </div>
            <select value={sort} onChange={event => { setSort(event.target.value as SortMode); setPage(1) }} className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm outline-none focus:ring-1 focus:ring-[#1B2A6B]">
              <option value="priority">Priority</option>
              <option value="dateAsc">Date Asc</option>
              <option value="dateDesc">Date Desc</option>
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1">
        {workspace === 'leads' ? (
          <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <WorkTable headers={['Leads Heads', 'Total Count', 'Own Count', "Other's Count"]} maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[620px]" tableClass="w-auto min-w-[700px]">
              {filteredLeadDetails.map(row => (
                <tr key={row.label} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{row.label}</td>
                  <td className="px-3 py-2"><a href={row.href} className="font-semibold text-[#1B2A6B] hover:underline">{row.total}</a></td>
                  <td className="px-3 py-2"><a href={row.ownHref} className="font-semibold text-[#1B2A6B] hover:underline">{row.own}</a></td>
                  <td className="px-3 py-2 font-semibold text-gray-700">{row.other}</td>
                </tr>
              ))}
            </WorkTable>
            <section className="h-[215px] rounded-lg border border-gray-200 bg-white p-3">
              <LeadSourceChart data={props.leadSources} totalLeads={stats.totalInquiries} />
            </section>
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
        ) : workspace === 'birthdays' ? (
          <WorkTable headers={['Name', 'Mobile', 'Email', 'Type']} maxHeight="max-h-[215px] 2xl:h-full 2xl:max-h-none" tableMinWidth="min-w-[620px]">
            {filteredReminderRows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.mobile ?? '-'}</td>
                <td className="px-3 py-2 text-gray-700">{row.email ?? '-'}</td>
                <td className="px-3 py-2"><Badge label={row.type} /></td>
              </tr>
            ))}
          </WorkTable>
        ) : (
          <>
            <WorkTable headers={['Priority', 'Customer', 'Type', 'Due / Date', 'Status', 'Action']} empty="No records found" maxHeight="max-h-[192px] 2xl:h-[calc(100%-2.5rem)] 2xl:max-h-none" tableMinWidth="min-w-[760px]">
              {pagedAttention.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2"><Badge label={item.priority === 'High' ? 'Overdue' : item.priority} /></td>
                  <td className="px-3 py-2 font-medium text-gray-900">{item.customer}</td>
                  <td className="px-3 py-2 text-gray-700">{item.type}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(item.date)}</td>
                  <td className="px-3 py-2 text-gray-700">{item.status}</td>
                  <td className="px-3 py-2"><a href={item.actionHref} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8102E] hover:underline">Open <ExternalLink className="h-3 w-3" /></a></td>
                </tr>
              ))}
            </WorkTable>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Page {page} of {pageCount}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">Prev</button>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
        </div>
      </section>
        </div>
      </div>
    </div>
  )
}
