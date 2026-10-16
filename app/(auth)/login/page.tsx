'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { BarChart3, CarFront, Eye, EyeOff, FileText, IndianRupee, LockKeyhole, LogIn, ShieldCheck, TrendingUp, UserRound, UsersRound, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid username or password, or account is inactive.')
        setLoading(false)
        return
      }

      router.replace('/dashboard')
      router.refresh()
    } catch {
      setError('Unable to sign in right now. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-1 sm:p-2">
      <div className="min-h-[calc(100vh-0.5rem)] overflow-hidden rounded-xl bg-white shadow-2xl sm:min-h-[calc(100vh-1rem)] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(400px,1fr)]">
        <section className="relative hidden min-h-full overflow-hidden bg-[#071a52] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_35%,rgba(232,33,78,0.75),transparent_30%),linear-gradient(135deg,#102c7c_0%,#071a52_55%,#10134d_100%)]" />
          <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
          <div className="relative z-10 flex h-full min-h-[680px] flex-col px-12 py-16 xl:px-20">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-blue-300"><span className="h-px w-7 bg-white" />One platform. Every deal.</div>
              <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100/85">Complete Dealership Management — Inventory, Inquiries, Finance, Insurance, RTO and more, all in one platform.</p>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-5 gap-2 text-center text-white">
              {[[CarFront, 'Inventory', 'Manage stock'], [UsersRound, 'Inquiries', 'Track leads'], [IndianRupee, 'Finance', 'Loans & payouts'], [ShieldCheck, 'Insurance', 'Policy renewal'], [FileText, 'RTO', 'Jobs & transfers']].map(([Icon, name, detail]) => {
                const FeatureIcon = Icon as typeof CarFront
                return <div key={name as string} className="min-w-0"><span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-blue-100 ring-1 ring-white/10"><FeatureIcon aria-hidden="true" className="h-5 w-5" /></span><div className="mt-2 text-[13px] font-semibold leading-4">{name as string}</div><div className="mt-1 text-[10px] leading-[15px] text-blue-200/75">{detail as string}</div></div>
              })}
            </div>
            <div className="login-hero-car-slot pointer-events-none absolute bottom-8 right-[-8%] z-0 w-[72%] max-w-[760px] select-none">
              <video
                className="login-hero-drift-video block w-full mix-blend-screen"
                autoPlay
                muted
                playsInline
                preload="auto"
                poster="/login-hero-car.png"
                aria-label="Sports car drifting into position"
              >
                <source src="/login-hero-drift.mp4" type="video/mp4" />
              </video>
              {/* Static fallback for users who request reduced motion. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/login-hero-car.png" alt="Premium blue car" className="login-hero-car-poster hidden w-full" />
            </div>
            <div className="relative mt-auto max-w-xl rounded-xl border border-white/10 bg-white/[0.09] px-5 py-4 backdrop-blur-sm"><div className="grid grid-cols-3 divide-x divide-white/15"><div className="flex items-center gap-3 pr-3"><Zap className="h-5 w-5 text-blue-300" /><span><b className="block text-xs">Faster Operations</b><small className="text-[10px] text-blue-200">Save time daily</small></span></div><div className="flex items-center gap-3 px-4"><BarChart3 className="h-5 w-5 text-blue-300" /><span><b className="block text-xs">Better Visibility</b><small className="text-[10px] text-blue-200">Track everything</small></span></div><div className="flex items-center gap-3 pl-4"><TrendingUp className="h-5 w-5 text-blue-300" /><span><b className="block text-xs">Higher Conversions</b><small className="text-[10px] text-blue-200">Grow your business</small></span></div></div></div>
          </div>
        </section>

        <section className="relative flex min-h-[calc(100vh-0.5rem)] items-center justify-center overflow-hidden bg-white px-7 py-12 sm:px-12 lg:min-h-full lg:px-11 xl:px-14">
          <div className="absolute inset-x-0 bottom-0 h-36 bg-[radial-gradient(ellipse_at_50%_100%,rgba(224,232,255,.9),transparent_65%)]" />
          <div className="relative z-10 w-full max-w-md">
            <div className="mb-7 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-excel-car.png" alt="Excel Cars" className="h-14 w-28 object-contain object-left" />
            </div>
            <div className="mb-9 hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-excel-car.png" alt="Excel Cars" className="h-14 w-28 object-contain object-left" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-base text-slate-500">Sign in to your ExcelCars CRM account</p>

          <form onSubmit={handleSubmit} className="relative mt-8 space-y-5" aria-busy={loading}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <div className="relative"><UserRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1B2A6B] focus:ring-4 focus:ring-[#1B2A6B]/10" required disabled={loading} autoComplete="username" /></div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#1B2A6B] focus:ring-4 focus:ring-[#1B2A6B]/10" required disabled={loading} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm"><label className="flex cursor-pointer items-center gap-2 text-slate-600"><input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-[#1B2A6B] focus:ring-[#1B2A6B]" />Remember me</label><button type="button" className="font-medium text-blue-600 hover:text-blue-700">Forgot password?</button></div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#142b78] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#142b78]/20 transition hover:bg-[#0f2366] disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>

            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/85 text-center backdrop-blur-[1px]">
                <svg className="h-7 w-7 animate-spin text-[#1B2A6B]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-gray-800" role="status">Signing you in…</p>
                <p className="mt-1 text-xs text-gray-500">Please wait.</p>
              </div>
            )}
          </form>
          </div>
          <div className="absolute bottom-10 left-0 right-0 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Drive your dealership forward<div className="mx-auto mt-3 h-0.5 w-12 rounded-full bg-gradient-to-r from-[#f22f58] via-[#f22f58] to-blue-500" /></div>
        </section>
      </div>
    </main>
  )
}
