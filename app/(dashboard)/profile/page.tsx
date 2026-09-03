import { redirect } from 'next/navigation'
import { auth } from '../../../auth'
import { getCurrentUserProfile } from '@/features/profile/queries'
import { ProfileClient } from '@/features/profile/ProfileClient'

export default async function ProfilePage() {
  const session = await auth()
  const userId = session?.user?.id ? Number(session.user.id) : NaN

  if (!Number.isInteger(userId) || userId <= 0) redirect('/login')

  const profile = await getCurrentUserProfile(userId)
  if (!profile) redirect('/login')

  return <ProfileClient profile={profile} />
}
