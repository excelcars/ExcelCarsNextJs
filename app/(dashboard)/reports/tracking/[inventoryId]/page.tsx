import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CarFront, ClipboardCheck, Download, FileText, Fuel, Landmark, Palette, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { getVehicleDetails } from '@/features/reports/tracking/queries'

const clean = (value: string | null | undefined) => !value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '—' : value
const money = (value: { toString(): string } | null | undefined) => value == null ? '—' : `₹${Number(value.toString()).toLocaleString('en-IN')}`

function StatusPill({ value }: { value: string | null | undefined }) {
  const label = clean(value)
  const normalized = label.toLowerCase()
  const tone = normalized.includes('paid') || normalized.includes('complete') || normalized.includes('received') || normalized.includes('done')
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : normalized.includes('partial') || normalized.includes('progress')
      ? 'bg-blue-50 text-blue-700 ring-blue-100'
      : normalized.includes('pending') || normalized.includes('follow')
        ? 'bg-amber-50 text-amber-700 ring-amber-100'
        : 'bg-slate-100 text-slate-600 ring-slate-200'

  return <span className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{label}</span>
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Palette }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</div>
    <div className="mt-1 [overflow-wrap:anywhere] text-sm font-semibold text-slate-800" title={value}>{value}</div>
  </div>
}

function ModuleHeader({ title, subtitle, href, icon: Icon, tone }: { title: string; subtitle: string; href?: string; icon: typeof ClipboardCheck; tone: string }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 items-start gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon className="h-4.5 w-4.5" /></span>
      <div><h2 className="font-semibold text-slate-900">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div>
    </div>
    {href ? <Link className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1B2A6B] transition hover:bg-slate-50" href={href}>Open module <ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Link> : null}
  </div>
}

export default async function TrackingDetailPage({ params }: { params: Promise<{ inventoryId: string }> }) {
  if (!(await canCurrentUserAccessRoute('/reports/tracking'))) redirect('/dashboard')
  const inventoryId = Number((await params).inventoryId)
  if (!Number.isInteger(inventoryId) || inventoryId <= 0) notFound()
  const [detail, canChecklist, canInsurance, canRto, canLoan] = await Promise.all([getVehicleDetails(inventoryId), canCurrentUserAccessRoute('/checklist'), canCurrentUserAccessRoute('/insurance'), canCurrentUserAccessRoute('/rto'), canCurrentUserAccessRoute('/loan')])
  if (!detail) notFound()
  const vehicle = detail.vehicle
  const name = [vehicle.carVariantMaster?.carMakeMaster?.make, vehicle.carVariantMaster?.carModelMaster?.model, vehicle.carVariantMaster?.variant].filter(Boolean).join(' ') || 'Vehicle'
  return <main className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Link href="/reports/tracking" className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-[#1B2A6B] hover:underline"><ArrowLeft className="h-4 w-4" />Stock Tracking</Link><a className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href={`/api/reports/tracking/export?inventoryId=${inventoryId}`}><Download className="h-4 w-4" />Export vehicle detail</a></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="bg-gradient-to-r from-[#14285f] via-[#1B2A6B] to-[#315d9f] px-5 py-5 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15"><CarFront className="h-6 w-6" /></span><div><h1 className="text-xl font-bold">{name}</h1><p className="mt-1 text-sm text-white/75">Registration {clean(vehicle.registrationNo)} · SKU {clean(vehicle.sku)}</p></div></div><StatusPill value={vehicle.status} /></div></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><DetailItem label="Colour" value={clean(vehicle.colour)} icon={Palette} /><DetailItem label="Fuel type" value={clean(vehicle.fuelType)} icon={Fuel} /><DetailItem label="Year" value={vehicle.year?.toString() ?? '—'} icon={CarFront} /><DetailItem label="Owner" value={clean(vehicle.ownedBy)} icon={UserRound} /><DetailItem label="Customer" value={clean(vehicle.customer?.custName ?? vehicle.customerName)} icon={UserRound} /><DetailItem label="Customer mobile" value={clean(vehicle.customer?.custMobile)} icon={Phone} /></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><ModuleHeader title="Checklist & Documents" subtitle={`${detail.checklist.length} checklist record${detail.checklist.length === 1 ? '' : 's'}`} href={canChecklist ? `/checklist?registration=${encodeURIComponent(vehicle.registrationNo ?? '')}` : undefined} icon={ClipboardCheck} tone="bg-sky-50 text-sky-700" />{detail.checklist.length ? <div className="space-y-2">{detail.checklist.map(record => record.checklistDocDetails.length ? record.checklistDocDetails.map(item => <div key={item.checklistDetailsId} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><span className="font-medium text-slate-800">{clean(item.documentName)}</span><span className="text-slate-500">Applicable: <b className="font-medium text-slate-700">{clean(item.applicable)}</b></span><span className="text-slate-500">Received: <b className="font-medium text-slate-700">{clean(item.received)}</b></span><span className="text-slate-500">Original: <b className="font-medium text-slate-700">{clean(item.originalCopy)}</b></span></div>) : <div key={record.documentId} className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">Checklist record exists but has no documents.</div>)}</div> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No checklist records for this vehicle.</p>}</section>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><ModuleHeader title="Insurance" subtitle={`${detail.insurance.length} policy record${detail.insurance.length === 1 ? '' : 's'}`} href={canInsurance ? `/insurance?search=${encodeURIComponent(vehicle.registrationNo ?? '')}` : undefined} icon={ShieldCheck} tone="bg-emerald-50 text-emerald-700" />{detail.insurance.length ? <div className="space-y-3">{detail.insurance.map(item => <div key={item.insuranceMainId} className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-medium text-slate-500">Insurance agent</div><div className="mt-1 font-semibold text-slate-800">{clean(item.partnerMaster?.name ?? item.agentNameLegacy)}</div></div><div className="flex flex-wrap gap-1.5"><StatusPill value={item.payoutPaymentStatus} /><StatusPill value={item.policyStatus} /></div></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><span className="text-slate-500">Premium <b className="ml-1 text-slate-800">{money(item.insurancePremium)}</b></span><span className="text-slate-500">Payout / received <b className="ml-1 text-slate-800">{money(item.payoutAmount)} / {money(item.totalAmountReceived)}</b></span></div></div>)}</div> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No insurance records for this vehicle.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><ModuleHeader title="RTO" subtitle={`${detail.rto.length} RTO record${detail.rto.length === 1 ? '' : 's'}`} href={canRto ? `/rto?registrationNo=${encodeURIComponent(vehicle.registrationNo ?? '')}` : undefined} icon={FileText} tone="bg-violet-50 text-violet-700" />{detail.rto.length ? <div className="space-y-3">{detail.rto.map(item => <div key={item.rtoAgentMainId} className="rounded-xl border border-violet-100 bg-violet-50/30 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-medium text-slate-500">RTO agent</div><div className="mt-1 font-semibold text-slate-800">{clean(item.partnerMaster?.name ?? item.agentNameLegacy)}</div></div><div className="flex flex-wrap gap-1.5"><StatusPill value={item.paymentStatus} /><StatusPill value={item.rcStatus} /><StatusPill value={item.transferStatus} /></div></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><span className="text-slate-500">Charges / paid <b className="ml-1 text-slate-800">{money(item.transferCharges)} / {money(item.amtPaid)}</b></span><span className="text-slate-500">Agent mobile <b className="ml-1 text-slate-800">{clean(item.agentMobileNoLegacy)}</b></span></div></div>)}</div> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No RTO records for this vehicle.</p>}</section>
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"><ModuleHeader title="Loan" subtitle={`${detail.loan.length} loan record${detail.loan.length === 1 ? '' : 's'}`} href={canLoan ? `/loan?search=${encodeURIComponent(vehicle.registrationNo ?? '')}` : undefined} icon={Landmark} tone="bg-amber-50 text-amber-700" />{detail.loan.length ? <div className="grid gap-3 lg:grid-cols-2">{detail.loan.map(item => <div key={item.loanManagementId} className="rounded-xl border border-amber-100 bg-amber-50/30 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-medium text-slate-500">Lender</div><div className="mt-1 font-semibold text-slate-800">{clean(item.bankName ?? item.partnerMaster?.name)}</div></div><StatusPill value={item.paymentStatus} /></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><span className="text-slate-500">Loan amount <b className="ml-1 text-slate-800">{money(item.loanAmount)}</b></span><span className="text-slate-500">Payout / received <b className="ml-1 text-slate-800">{money(item.payoutAmount)} / {money(item.totalAmountReceived)}</b></span><span className="text-slate-500 sm:col-span-2">Contact <b className="ml-1 text-slate-800">{clean(item.bankPersonName)} · {clean(item.bankPersonMobileNo)}</b></span></div></div>)}</div> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No loan records for this vehicle.</p>}</section>
  </main>
}
