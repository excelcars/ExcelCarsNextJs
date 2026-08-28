'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Btn, Input, PageHeader } from '@/components/ui'
import { changeMyPassword } from './actions'

type ProfileData = {
  userName: string | null
  roleName: string | null
  status: string | null
  displayName: string | null
  emailId: string | null
  lastLoginTime: Date | string | null
  createdDate: Date | string | null
  employee: {
    empFirstName: string | null
    empLastName: string | null
    empGender: string | null
    empAddress: string | null
    empCity: string | null
    empStateLegacy: string | null
    empPincode: string | null
    empMobileNo: string | null
    empPhoneNo: string | null
    empEmailId: string | null
  } | null
}

const valueOrDash = (value: string | null | undefined) => value?.trim() || '—'
const formatDate = (value: Date | string | null) => value ? new Date(value).toLocaleString('en-IN') : '—'

export function ProfileClient({ profile }: { profile: ProfileData }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const submitPasswordChange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await changeMyPassword({ currentPassword, newPassword, confirmPassword })
      if (!result.success) {
        setMessage({ type: 'error', text: result.error ?? 'Could not update your password.' })
        return
      }
      setMessage({ type: 'success', text: 'Password updated. Redirecting you to sign in again...' })
      await signOut({ callbackUrl: '/login' })
    })
  }

  const employee = profile.employee
  const email = profile.emailId ?? employee?.empEmailId
  const fullName = profile.displayName ?? [employee?.empFirstName, employee?.empLastName].filter(Boolean).join(' ')

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View your account details and manage security settings." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <section className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C8102E] text-xl font-bold text-white">
                {(fullName || profile.userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{valueOrDash(fullName)}</h2>
                <p className="text-sm text-gray-500">{valueOrDash(profile.roleName)}</p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-semibold text-gray-900">
              <UserRound className="h-4 w-4 text-[#1B2A6B]" />
              Account information
            </div>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div><dt className="text-xs font-medium text-gray-500">Username</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(profile.userName)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Email</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(email)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Role</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(profile.roleName)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Status</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(profile.status)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Last login</dt><dd className="mt-1 text-sm text-gray-900">{formatDate(profile.lastLoginTime)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Account created</dt><dd className="mt-1 text-sm text-gray-900">{formatDate(profile.createdDate)}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 border-b border-gray-100 pb-3 text-sm font-semibold text-gray-900">Personal information</div>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div><dt className="text-xs font-medium text-gray-500">First name</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empFirstName)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Last name</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empLastName)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Gender</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empGender)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Mobile</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empMobileNo)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Phone</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empPhoneNo)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">City</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empCity)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">State</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empStateLegacy)}</dd></div>
              <div><dt className="text-xs font-medium text-gray-500">Pincode</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empPincode)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-medium text-gray-500">Address</dt><dd className="mt-1 text-sm text-gray-900">{valueOrDash(employee?.empAddress)}</dd></div>
            </dl>
          </div>
        </section>

        <section id="security" className="h-fit rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <LockKeyhole className="h-4 w-4 text-[#1B2A6B]" />
            Change password
          </div>
          <p className="mb-5 text-xs leading-5 text-gray-500">Use at least 8 characters with uppercase, lowercase, a number, and a special character.</p>

          <form onSubmit={submitPasswordChange} className="space-y-4">
            <div className="relative">
              <Input label="Current password" type={showCurrentPassword ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={isPending} className="pr-10" />
              <button type="button" onClick={() => setShowCurrentPassword(value => !value)} aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'} className="absolute right-3 top-7 cursor-pointer text-gray-400 hover:text-gray-600">
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input label="New password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={isPending} className="pr-10" />
              <button type="button" onClick={() => setShowNewPassword(value => !value)} aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} className="absolute right-3 top-7 cursor-pointer text-gray-400 hover:text-gray-600">
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input label="Confirm new password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={isPending} className="pr-10" />
              <button type="button" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'} className="absolute right-3 top-7 cursor-pointer text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {message && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`} role="alert">
                {message.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Btn type="submit" disabled={isPending}>{isPending ? 'Updating...' : 'Update Password'}</Btn>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
