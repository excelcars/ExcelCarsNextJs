'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, LogIn } from 'lucide-react'

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

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid username or password, or account is inactive.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B2A6B 0%, #12204F 70%, #C8102E 100%)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.3) 39px, rgba(255,255,255,0.3) 40px)' }} />
        <div className="relative text-center max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-excel-car.png" alt="Excel Cars" className="h-20 object-contain mx-auto mb-8 bg-white rounded-xl px-5 py-3" />
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">ExcelCars CRM</h2>
          <p className="text-blue-200 text-base leading-relaxed mb-8">
            Complete Dealership Management — Inventory, Inquiries, Finance, Insurance, RTO and more, all in one platform.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-excel-car.png" alt="Excel Cars" className="h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to your ExcelCars CRM account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/30 transition"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#1B2A6B]/30 transition"
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium text-sm transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#1B2A6B' }}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <LogIn className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
