import { listTemplates } from '@/features/messagetemplates/queries'
import { TemplatesClient } from '@/features/messagetemplates/TemplatesClient'

export default async function SmsEmailPage() {
  const rows = await listTemplates()
  return <TemplatesClient initialData={rows} />
}
