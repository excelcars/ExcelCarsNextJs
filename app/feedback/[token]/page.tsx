import { QUESTIONS } from '@/features/feedback/queries'
import { getFeedbackInvitation, submitPublicFeedback } from '@/features/feedback/publicActions'

export const dynamic = 'force-dynamic'

function PublicHeader() {
  return <header className="border-b border-[#e4e9f2] bg-white text-[#142b62]">
    <div className="mx-auto flex max-w-7xl items-center px-6 py-5 sm:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-excel-car.png" alt="Excel Cars" className="h-14 w-auto object-contain" />
    </div>
  </header>
}

function PublicMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#f7f9fc] text-gray-900"><PublicHeader /><div className="mx-auto flex min-h-[calc(100vh-94px)] max-w-3xl items-center justify-center px-6 py-12 text-center"><div className="w-full rounded-3xl border border-[#e4e9f2] bg-white p-8 shadow-sm sm:p-12"><div className="mx-auto mb-5 h-1 w-16 bg-[#d7194a]" /><h1 className="text-3xl font-bold tracking-tight text-[#142b62]">{title}</h1><div className="mt-3 text-sm leading-6 text-gray-600">{children}</div></div></div></main>
}

function UnavailableFeedbackPage() {
  return <PublicMessage title="Feedback link unavailable">This feedback link has expired, was already used, or is no longer available.</PublicMessage>
}

export default async function PublicFeedbackPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ status?: string }> }) {
  const { token } = await params
  const { status } = await searchParams

  if (status === 'thanks') {
    return <PublicMessage title="Thank you for your feedback">Your response has been submitted successfully.</PublicMessage>
  }

  const invitation = await getFeedbackInvitation(token)
  if (!invitation) return <UnavailableFeedbackPage />

  const vehicle = invitation.inventoryManagement
  const vehicleName = [vehicle.carVariantMaster?.carMakeMaster?.make, vehicle.carVariantMaster?.carModelMaster?.model, vehicle.carVariantMaster?.variant].filter(Boolean).join(' ')
  const submit = submitPublicFeedback.bind(null, token)
  const error = status === 'invalid-answer' ? 'Please answer every question.' : status === 'invalid-comment' ? 'Comments cannot exceed 1,000 characters.' : null

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-gray-900">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-7 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="h-fit rounded-3xl border border-[#e4e9f2] bg-white p-6 shadow-sm lg:sticky lg:top-8">
            <div className="h-1 w-12 bg-[#d7194a]" />
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#142b62]">Tell us about your experience</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">Hello {invitation.customer.custName || 'there'}, your feedback helps us deliver a better experience.</p>
            <div className="mt-7 rounded-2xl border border-[#e4e9f2] bg-[#f7f9fc] p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d7194a]">Your purchase</div>
              <div className="mt-3 font-semibold text-gray-900">{vehicleName || 'Vehicle details'}</div>
              <div className="mt-1 text-gray-600">{[vehicle.registrationNo, vehicle.year].filter(Boolean).join(' · ') || 'Excel Cars purchase'}</div>
            </div>
          </aside>
          <form action={submit} className="space-y-7 rounded-3xl border border-[#e4e9f2] bg-white p-6 shadow-sm sm:p-8">
            <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7194a]">Customer feedback</div><h2 className="mt-2 text-2xl font-bold tracking-tight text-[#142b62]">Your opinion matters to us</h2></div>
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {QUESTIONS.map((question, index) => <fieldset key={question.key} className="border-b border-[#edf0f5] pb-6 last:border-0 last:pb-0"><legend className="mb-4 text-sm font-medium leading-6 text-gray-900">{index + 1}. {question.text}</legend><div className="grid gap-2 sm:grid-cols-3">{question.options.map(option => <label key={option} className="cursor-pointer"><input required type="radio" name={question.key} value={option} className="peer sr-only" /><span className="flex min-h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm font-medium text-gray-700 transition hover:border-[#d7194a] peer-checked:border-[#d7194a] peer-checked:bg-[#d7194a] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#d7194a]">{option}</span></label>)}</div></fieldset>)}
            <div><label htmlFor="comments" className="mb-2 block text-sm font-medium">Any additional comments? <span className="font-normal text-gray-500">(optional)</span></label><textarea id="comments" name="comments" maxLength={1000} rows={4} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#d7194a] focus:ring-1 focus:ring-[#d7194a]" /></div>
            <button type="submit" className="w-full rounded-xl bg-[#142b62] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#0d1e48]">Submit Feedback</button>
          </form>
        </div>
      </div>
    </main>
  )
}
