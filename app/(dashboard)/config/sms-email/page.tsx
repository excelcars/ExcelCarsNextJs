import { listTemplates } from '@/features/messagetemplates/queries'
import { TemplatesClient } from '@/features/messagetemplates/TemplatesClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function SmsEmailPage() {
  if (!(await canCurrentUserAccessRoute('/config/sms-email'))) redirect('/dashboard')
  const rows = await listTemplates()
  return <TemplatesClient initialData={rows} />
}
