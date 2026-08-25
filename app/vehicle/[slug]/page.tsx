import Link from 'next/link'
import { headers } from 'next/headers'
import { Phone, MessageCircle, Gauge, Fuel, CalendarDays, ShieldCheck } from 'lucide-react'
import { buildPublicVehicleViewModel, recordTrackedVehicleVisit, resolveTrackedVehicleByToken } from '@/features/vehicleEmailLinks/service'
import { VehicleContactActions } from '@/features/vehicleEmailLinks/VehicleContactActions'

function UnavailableVehiclePage() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-gray-900">
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
  const mailHref = `mailto:${vehicle.contactEmail}`

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-gray-900">
      <header className="border-b border-white/10 bg-[#111111] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-2xl font-bold tracking-[0.2em] text-[#c8a24c]">EXCEL CARS</div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-white/70">Premium Pre-Owned Cars</div>
          </div>
          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href={phoneHref} className="flex items-center gap-2 hover:text-[#c8a24c]"><Phone className="h-4 w-4" />Call Now</a>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-[#25D366]"><MessageCircle className="h-4 w-4" />WhatsApp Us</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-[#e7dcc7] bg-white shadow-sm">
              {vehicle.hasGallery ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vehicle.gallery[0].src} alt={vehicle.gallery[0].alt} className="h-[420px] w-full object-cover" />
              ) : (
                <div className="flex h-[420px] items-center justify-center bg-gradient-to-br from-[#efe6d4] to-[#f7f4ee] text-sm text-gray-500">
                  Vehicle photos available on request
                </div>
              )}
            </div>

            {vehicle.gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {vehicle.gallery.slice(0, 4).map((photo: { documentId: number; src: string; alt: string }) => (
                  <div key={photo.documentId} className="overflow-hidden rounded-2xl border border-[#e7dcc7] bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.src} alt={photo.alt} className="h-24 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-5 rounded-3xl border border-[#e7dcc7] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">{vehicle.heading}</h1>
                <p className="mt-2 text-2xl text-gray-600">{vehicle.subheading}</p>
              </div>
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">{vehicle.status}</span>
            </div>

            <div>
              <div className="text-5xl font-bold text-[#c59b3b]">₹{vehicle.price ?? 'On Request'}</div>
              <div className="mt-1 text-sm text-gray-500">Inclusive of all taxes</div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[#eee3cf] bg-[#faf7f1] p-4 sm:grid-cols-4">
              <div className="text-center">
                <Gauge className="mx-auto h-5 w-5 text-[#c59b3b]" />
                <div className="mt-2 text-lg font-semibold">{vehicle.kmsDriven ?? '—'}</div>
                <div className="text-xs text-gray-500">KM Driven</div>
              </div>
              <div className="text-center">
                <Fuel className="mx-auto h-5 w-5 text-[#c59b3b]" />
                <div className="mt-2 text-lg font-semibold">{vehicle.fuelType}</div>
                <div className="text-xs text-gray-500">Fuel Type</div>
              </div>
              <div className="text-center">
                <CalendarDays className="mx-auto h-5 w-5 text-[#c59b3b]" />
                <div className="mt-2 text-lg font-semibold">{vehicle.year ?? '—'}</div>
                <div className="text-xs text-gray-500">Year</div>
              </div>
              <div className="text-center">
                <ShieldCheck className="mx-auto h-5 w-5 text-[#c59b3b]" />
                <div className="mt-2 text-lg font-semibold">{vehicle.noOfOwners ?? '—'}</div>
                <div className="text-xs text-gray-500">Owners</div>
              </div>
            </div>

            <VehicleContactActions token={rawToken} phoneHref={phoneHref} whatsappHref={whatsappHref} mailHref={mailHref} />
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-[#e7dcc7] bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Vehicle Details</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              {[
                ['Make', vehicle.make || '—'],
                ['Model / Variant', [vehicle.model, vehicle.variant].filter(Boolean).join(' / ') || vehicle.subheading],
                ['Year of Manufacture', vehicle.year ? String(vehicle.year) : '—'],
                ['Month of Manufacture', vehicle.month],
                ['Fuel Type', vehicle.fuelType],
                ['KM Driven', vehicle.kmsDriven ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#f0eadf] pb-3 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[
                ['No. of Owners', vehicle.noOfOwners != null ? String(vehicle.noOfOwners) : '—'],
                ['Colour', vehicle.colour],
                ['Registration', vehicle.maskedRegistrationNo],
                ['Insurance Type', vehicle.insuranceType],
                ['Road Tax', vehicle.tax],
                ['Status', vehicle.status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#f0eadf] pb-3 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
