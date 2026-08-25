import { AlertCircle, Car, Users, PhoneCall, Clock, FileText, Shield } from 'lucide-react'
import { auth } from '../../../auth'
import { StatCard, Badge } from '@/components/ui'
import { getDashboardStats, getLeadSourceBreakdown, getPendingFollowups } from '@/features/dashboard/queries'
import { LeadSourceChart } from '@/features/dashboard/LeadSourceChart'

const R = '#C8102E'
const N = '#1B2A6B'

function formatDate(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

export default async function DashboardPage() {
  const session = await auth()
  const [stats, leadSources, followups] = await Promise.all([
    getDashboardStats(),
    getLeadSourceBreakdown(),
    getPendingFollowups(),
  ])

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const firstName = (session?.user?.name || 'there').split(' ')[0]
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterday = new Date(todayStart)
  yesterday.setDate(yesterday.getDate() - 1)
  const pendingFollowupHref = '/followup?status=FollowUp'
  const overdueFollowupHref = `/followup?status=FollowUp&followUpDateTo=${isoDate(yesterday)}`

  return (
    <div className="space-y-6">
      {/* greeting */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, {firstName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        {stats.overdueFollowups > 0 && (
          <a
            href={overdueFollowupHref}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100 transition"
          >
            <AlertCircle className="w-4 h-4" />
            {stats.overdueFollowups} Overdue Follow-ups
          </a>
        )}
      </div>

      {/* KPI rows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available Stock" value={stats.availableStock} sub={`${stats.totalInventory} total`} color={N} icon={<Car className="w-5 h-5" />} />
        <StatCard label="Sold This Month" value={stats.soldThisMonth} sub="vehicles" color={R} icon={<Car className="w-5 h-5" />} />
        <StatCard label="Total Inquiries" value={stats.totalInquiries} sub={`${stats.todayInquiries} today`} color={N} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Hot Leads" value={stats.hotLeads} sub="requires action" color={R} icon={<PhoneCall className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <a href={pendingFollowupHref} className="block">
          <StatCard label="Pending Follow-ups" value={stats.pendingFollowups} sub={`${stats.overdueFollowups} overdue`} color="#F59E0B" icon={<Clock className="w-5 h-5" />} />
        </a>
        <StatCard label="Active Loans" value={stats.activeLoans} sub="financed vehicles" color={N} icon={<FileText className="w-5 h-5" />} />
        <StatCard label="Active Insurance" value={stats.activeInsurance} sub="policies received" color={N} icon={<Shield className="w-5 h-5" />} />
        <StatCard label="Pending RTO" value={stats.pendingRTO} sub="cases" color={R} icon={<FileText className="w-5 h-5" />} />
      </div>

      {/* Lead sources */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Top Inquiry Sources</h2>
          <span className="text-xs text-gray-400">Raw source values, as recorded</span>
        </div>
        <LeadSourceChart data={leadSources} />
      </div>

      {/* Follow-up table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Pending Follow-ups</h2>
          <a href={pendingFollowupHref} className="text-xs font-medium hover:underline" style={{ color: R }}>View All →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Customer', 'Mobile', 'Follow-up Date', 'Classification', 'Status'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {followups.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No pending follow-ups</td></tr>
              ) : followups.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-3 font-medium text-gray-900">{f.customerName}</td>
                  <td className="py-3 px-3 text-gray-600 font-mono text-xs">{f.mobile}</td>
                  <td className="py-3 px-3 text-gray-600">{formatDate(f.followupDate)}</td>
                  <td className="py-3 px-3">{f.classification ? <Badge label={f.classification} /> : '—'}</td>
                  <td className="py-3 px-3">{f.status ? <Badge label={f.status} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
