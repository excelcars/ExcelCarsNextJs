import Link from 'next/link'
import { headers } from 'next/headers'
import { Phone, MessageCircle, Gauge, Fuel, CalendarDays, ShieldCheck } from 'lucide-react'
import { buildPublicVehicleViewModel, recordTrackedVehicleVisit, resolveTrackedVehicleByToken } from '@/features/vehicleEmailLinks/service'
import { VehicleContactActions } from '@/features/vehicleEmailLinks/VehicleContactActions'
import { VehicleGallery } from '@/features/vehicleEmailLinks/VehicleGallery'
import { VehicleSpecifications } from '@/features/vehicleEmailLinks/VehicleSpecifications'

function UnavailableVehiclePage() {
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 text-4xl font-bold tracking-tight">Vehicle details unavailable</div>
        <p className="mb-8 max-w-xl text-sm text-gray-600">
          This vehicle link is unavailable or has expired. Please contact Excel Cars for the latest availability and details.
        </p>
        <Link href="/" className="rounded-lg bg-[#1B2A6B] px-5 py-3 text-sm font-semibold text-white">
          Back to Excel Cars
        </Link>
      </div>
    </div>
  )
}

export default async function PublicVehiclePage({
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const sp = await searchParams
  const rawToken = sp.t?.trim()
  if (!rawToken) return <UnavailableVehiclePage />

  const trackedLink = await resolveTrackedVehicleByToken(rawToken)
  if (!trackedLink) return <UnavailableVehiclePage />

  try {
    const requestHeaders = await headers()
    const forwardedFor = requestHeaders.get('x-forwarded-for')
    await recordTrackedVehicleVisit(trackedLink.vehicleEmailLinkId, {
      userAgent: requestHeaders.get('user-agent'),
      referrer: requestHeaders.get('referer'),
      ipAddress: forwardedFor?.split(',')[0]?.trim() || null,
    })
  } catch {
    // page rendering is more important than analytics; fail softly
  }

  const vehicle = buildPublicVehicleViewModel(trackedLink)
  const phoneHref = `tel:${vehicle.phoneNumber.replace(/[^\d+]/g, '')}`
  const whatsappHref = `https://wa.me/${vehicle.whatsappNumber.replace(/[^\d]/g, '')}`

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-gray-900">
      <header className="border-b border-[#e4e9f2] bg-white text-[#142b62]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-excel-car.png" alt="Excel Cars" className="h-14 w-auto object-contain" />
          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href={phoneHref} className="flex items-center gap-2 font-medium hover:text-[#d7194a]"><Phone className="h-4 w-4" />Call Now</a>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium hover:text-[#d7194a]"><MessageCircle className="h-4 w-4" />WhatsApp Us</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-6 py-6 sm:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,0.85fr)]">
          <section className="space-y-6">
            <VehicleGallery photos={vehicle.gallery} />
            <VehicleSpecifications
              highlights={[
                ['Registration', vehicle.maskedRegistrationNo],
                ['No. of Owners', vehicle.noOfOwners != null ? String(vehicle.noOfOwners) : '—'],
                ['Colour', vehicle.colour],
                ['Status', vehicle.status],
              ]}
              ownership={[
                ['Insurance Type', vehicle.insuranceType],
                ['Road Tax', vehicle.tax],
                ['Month of Manufacture', vehicle.month],
                ['Service History', 'Not recorded'],
              ]}
              performance={[
                ['Fuel Type', vehicle.fuelType],
                ['KM Driven', vehicle.kmsDriven ?? '—'],
                ['Year of Manufacture', vehicle.year ? String(vehicle.year) : '—'],
                ['Model / Variant', [vehicle.model, vehicle.variant].filter(Boolean).join(' / ') || '—'],
              ]}
            />
          </section>

          <aside className="space-y-5 rounded-3xl border border-[#e4e9f2] bg-white p-5 shadow-sm lg:sticky lg:top-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#101b38] sm:text-3xl">{vehicle.heading}</h1>
                <p className="mt-1 text-lg text-gray-600">{vehicle.subheading}</p>
              </div>
              <span className="rounded-full bg-[#fff0f4] px-3 py-1.5 text-xs font-semibold text-[#d7194a]">{vehicle.status}</span>
            </div>

            <div>
              <div className="text-4xl font-bold text-[#d7194a]">{vehicle.price ? `₹${vehicle.price}` : 'On Request'}</div>
              <div className="mt-1 text-sm text-gray-500">Inclusive of all taxes</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#e4e9f2] bg-[#fbfcff] p-3 text-center">
                <Gauge className="mx-auto h-5 w-5 text-[#d7194a]" />
                <div className="mt-1.5 text-base font-semibold">{vehicle.kmsDriven ?? '—'}</div>
                <div className="text-xs text-gray-500">KM Driven</div>
              </div>
              <div className="rounded-xl border border-[#e4e9f2] bg-[#fbfcff] p-3 text-center">
                <Fuel className="mx-auto h-5 w-5 text-[#d7194a]" />
                <div className="mt-1.5 text-base font-semibold">{vehicle.fuelType}</div>
                <div className="text-xs text-gray-500">Fuel Type</div>
              </div>
              <div className="rounded-xl border border-[#e4e9f2] bg-[#fbfcff] p-3 text-center">
                <CalendarDays className="mx-auto h-5 w-5 text-[#d7194a]" />
                <div className="mt-1.5 text-base font-semibold">{vehicle.year ?? '—'}</div>
                <div className="text-xs text-gray-500">Year</div>
              </div>
              <div className="rounded-xl border border-[#e4e9f2] bg-[#fbfcff] p-3 text-center">
                <ShieldCheck className="mx-auto h-5 w-5 text-[#d7194a]" />
                <div className="mt-1.5 text-base font-semibold">{vehicle.noOfOwners ?? '—'}</div>
                <div className="text-xs text-gray-500">Owners</div>
              </div>
            </div>

            <VehicleContactActions token={rawToken} phoneHref={phoneHref} whatsappHref={whatsappHref} canEnquire={vehicle.canEnquire} />
          </aside>
        </div>

      </main>
    </div>
  )
}
