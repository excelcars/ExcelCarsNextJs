'use client'

import { useEffect, useState } from 'react'
import { Building2, CalendarDays, CarFront, Clock3, Eye, FileText, Fuel, Gauge, Grid2X2, IndianRupee, Link2, Loader2, Mail, MessageCircle, Palette, Phone, PhoneCall, Send, ShieldCheck, UserPlus, UserRound, UsersRound, type LucideIcon } from 'lucide-react'
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

const detailIcons: Record<string, LucideIcon> = {
  'Variant': Grid2X2, 'Year / Month': CalendarDays, 'Colour': Palette, 'Fuel type': Fuel, 'Registration': FileText, 'Tax': FileText, 'Insurance': ShieldCheck, 'Legacy vehicle': CarFront,
  'Owner type': Building2, 'Owned by': UserRound, 'Owner mobile': Phone, 'Owner email': Mail, 'Customer': UsersRound, 'Customer mobile': Phone, 'Customer email': Mail, 'Source / reference': Link2,
}

function DetailList({ rows }: { rows: Array<[string, unknown]> }) {
  return <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
    {rows.map(([label, item]) => {
      const Icon = detailIcons[label] ?? FileText
      return <div key={label}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#1B2A6B]" />{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-gray-900">{value(item)}</div>
    </div>})}
  </div>
}

function engagementInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'CU'
}

function EngagementMetric({ label, detail, Icon, tone }: { label: string; detail: string; Icon: LucideIcon; tone: string }) {
  return <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5"><div className="flex items-start gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}><Icon aria-hidden="true" className="h-4 w-4" /></span><div className="min-w-0"><div className="text-[10px] font-medium leading-4 text-slate-500">{label}</div><div className="break-words text-xs font-semibold leading-4 text-slate-800" title={detail}>{detail}</div></div></div></div>
}

interface InventoryViewModalProps {
  open: boolean
  loading: boolean
  error: string
  row: InventoryRow | null
  onClose: () => void
}

type InventoryPreviewPhoto = {
  documentId: number
  path: string | null
  fileName: string
}

export function InventoryViewModal({ open, loading, error, row, onClose }: InventoryViewModalProps) {
  const [previewPhoto, setPreviewPhoto] = useState<InventoryPreviewPhoto | null>(null)

  useEffect(() => {
    if (!open || !row) {
      setPreviewPhoto(null)
      return
    }

    let active = true
    setPreviewPhoto(null)
    const photoParams = new URLSearchParams({ inventoryId: String(row.inventoryId) })
    if (row.inventoryNumber) photoParams.set('inventoryNumber', row.inventoryNumber)
    fetch(`/api/inventory/photos?${photoParams.toString()}`)
      .then(response => response.ok ? response.json() : [])
      .then((photos: InventoryPreviewPhoto[]) => {
        if (active) setPreviewPhoto(photos.find(photo => Boolean(photo.path)) ?? null)
      })
      .catch(() => {
        if (active) setPreviewPhoto(null)
      })

    return () => { active = false }
  }, [open, row?.inventoryId, row?.inventoryNumber])

  return (
    <Modal title={row ? `View Inventory — ${row.inventoryNumber ?? `#${row.inventoryId}`}` : 'View Inventory'} open={open} onClose={onClose} width="max-w-6xl">
      {loading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /><div>Loading vehicle details...</div></div>
      ) : error ? (
        <div className="space-y-4"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div><div className="flex justify-end"><Btn variant="outline" onClick={onClose}>Close</Btn></div></div>
      ) : row ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{row.inventoryNumber ?? `Inventory/${row.inventoryId}`}</span>
                {row.registrationNo ? <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-[#1B2A6B]">{row.registrationNo}</span> : null}
                {row.sku ? <span className="rounded-md bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600">SKU · {row.sku}</span> : null}
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-900">{[clean(row.carVariantMaster?.carMakeMaster?.make ?? row.makeLegacy), clean(row.carVariantMaster?.carModelMaster?.model ?? row.modelLegacy)].filter(Boolean).join(' ') || 'Vehicle not set'}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{clean(row.carVariantMaster?.variant ?? row.variantLegacy) || 'Variant not set'}</span><span>·</span><span>{row.year ?? 'Year not set'}</span><span>·</span><span>{row.fuelType ?? 'Fuel not set'}</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">{row.status ? <Badge label={row.status} /> : null}<div className="hidden h-32 w-56 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 text-[#1B2A6B] lg:grid lg:place-items-center">{previewPhoto?.path ? <img src={previewPhoto.path} alt={previewPhoto.fileName || `Photo of ${row.registrationNo ?? 'vehicle'}`} className="h-full w-full object-cover" onError={() => setPreviewPhoto(null)} /> : <div className="flex h-full w-full flex-col items-center justify-center"><CarFront aria-hidden="true" className="h-14 w-14" strokeWidth={1.35} /><span className="mt-2 text-xs font-medium text-slate-500">No vehicle photo</span></div>}</div></div>
          </div>

          <div className="grid gap-3 border-t border-gray-100 bg-slate-50/70 px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
            {([
              ['Price', fmt(row.price), 'Listed vehicle value', IndianRupee, 'from-emerald-50 to-white text-emerald-600'],
              ['KM Driven', row.kmsDriven !== null ? Number(row.kmsDriven).toLocaleString('en-IN') : '—', 'Current odometer', Gauge, 'from-blue-50 to-white text-blue-600'],
              ['Ownership', row.noOfOwners ? `${row.noOfOwners} owner${row.noOfOwners === 1 ? '' : 's'}` : '—', row.ownedType ?? 'Ownership type not set', UserRound, 'from-amber-50 to-white text-amber-600'],
              ['Linked Customer', row.customer?.custName ?? row.customerName ?? 'Not linked', row.customer?.custMobile ?? row.mobileNoOwnedBy ?? 'No mobile recorded', Link2, 'from-rose-50 to-white text-rose-600'],
            ] as Array<[string, string, string, LucideIcon, string]>).map(([label, metric, detail, MetricIcon, color]) => <div key={label} className={`rounded-xl bg-gradient-to-br px-4 py-3 ${color}`}>
              <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/75 shadow-sm"><MetricIcon aria-hidden="true" className="h-4 w-4" /></span><div><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">{label}</div><div className="mt-0.5 text-lg font-bold text-gray-900">{metric}</div><div className="mt-0.5 text-xs text-gray-500">{detail}</div></div></div>
            </div>)}
          </div>

          <div className="grid gap-5 border-t border-gray-100 px-6 py-5 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1B2A6B]"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-50"><CarFront aria-hidden="true" className="h-4 w-4" /></span>Vehicle specification</div><DetailList rows={[
              ['Variant', clean(row.carVariantMaster?.variant ?? row.variantLegacy)], ['Year / Month', [row.year, row.month].filter(Boolean).join(' / ')], ['Colour', row.colour], ['Fuel type', row.fuelType], ['Registration', row.isCarRegistered === null ? '—' : row.isCarRegistered ? 'Registered' : 'Not registered'], ['Tax', row.tax], ['Insurance', row.insuranceType], ['Legacy vehicle', [row.makeLegacy, row.modelLegacy, row.variantLegacy].filter(Boolean).join(' ')],
            ]} /></section>
            <section className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1B2A6B]"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-50"><UsersRound aria-hidden="true" className="h-4 w-4" /></span>Ownership & contact</div><DetailList rows={[
              ['Owner type', row.ownedType], ['Owned by', row.ownedBy], ['Owner mobile', row.mobileNoOwnedBy], ['Owner email', row.emailIdOwnedBy], ['Customer', row.customer?.custName ?? row.customerName], ['Customer mobile', row.customer?.custMobile], ['Customer email', row.customer?.custEmail], ['Source / reference', row.customerName],
            ]} /></section>
          </div>

          {(row.internalComments || row.otherRemarks) ? <div className="grid gap-5 border-t border-gray-100 px-6 py-5 lg:grid-cols-2"><section className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Internal comments</div><div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{row.internalComments || '—'}</div></section><section className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Remarks</div><div className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{row.otherRemarks || '—'}</div></section></div> : null}

          <div className="border-t border-gray-100 bg-gradient-to-r from-violet-50 via-blue-50 to-white px-6 py-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1B2A6B]"><span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100"><UsersRound aria-hidden="true" className="h-4 w-4" /></span>Customer engagement</div>
            {!row.vehicleEmailLinks || row.vehicleEmailLinks.length === 0 ? <div className="text-sm text-gray-500">No tracked vehicle emails have been sent for this inventory record yet.</div> : <div className="space-y-3">
              {row.vehicleEmailLinks.map(link => <div key={link.vehicleEmailLinkId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{engagementInitials(link.recipientName || link.recipientEmail || 'Customer')}</span><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{link.recipientName || 'Customer'}</div><div className="truncate text-xs text-slate-500">{link.recipientEmail || '—'}</div></div></div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${link.firstHumanViewAt ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}><Eye aria-hidden="true" className="h-3.5 w-3.5" />Viewed: {link.firstHumanViewAt ? 'Yes' : 'No'}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <EngagementMetric label="Sent" detail={fmtDateTime(link.emailSentAt)} Icon={Send} tone="bg-slate-100 text-slate-600" />
                  <EngagementMetric label="First Request" detail={fmtDateTime(link.firstRequestedAt)} Icon={UserPlus} tone="bg-violet-100 text-violet-600" />
                  <EngagementMetric label="First Human View" detail={fmtDateTime(link.firstHumanViewAt)} Icon={UsersRound} tone="bg-blue-100 text-blue-600" />
                  <EngagementMetric label="Last Request" detail={fmtDateTime(link.lastRequestedAt)} Icon={Clock3} tone="bg-rose-100 text-rose-600" />
                  <EngagementMetric label="Requests / Human Views" detail={`${link.requestCount} / ${link.humanViewCount}`} Icon={Eye} tone="bg-amber-100 text-amber-600" />
                  <EngagementMetric label="Call Clicks" detail={String(link.interactionSummary?.callClickCount ?? 0)} Icon={PhoneCall} tone="bg-emerald-100 text-emerald-600" />
                  <EngagementMetric label="WhatsApp Clicks" detail={String(link.interactionSummary?.whatsappClickCount ?? 0)} Icon={MessageCircle} tone="bg-green-100 text-green-600" />
                  <EngagementMetric label="Enquire Clicks" detail={String(link.interactionSummary?.emailClickCount ?? 0)} Icon={Mail} tone="bg-violet-100 text-violet-600" />
                  <EngagementMetric label="First Interaction" detail={fmtDateTime(link.interactionSummary?.firstInteractionAt)} Icon={UserPlus} tone="bg-rose-100 text-rose-600" />
                  <EngagementMetric label="Last Interaction" detail={fmtDateTime(link.interactionSummary?.lastInteractionAt)} Icon={Clock3} tone="bg-blue-100 text-blue-600" />
                </div>
              </div>)}
            </div>}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
