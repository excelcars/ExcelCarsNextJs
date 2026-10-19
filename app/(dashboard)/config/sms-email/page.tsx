import { listTemplates } from '@/features/messagetemplates/queries'
import { TemplatesClient } from '@/features/messagetemplates/TemplatesClient'
import { WhatsAppGlobalClient } from '@/features/messagetemplates/WhatsAppGlobalClient'
import { MessagingTemplatesTabs } from '@/features/messagetemplates/MessagingTemplatesTabs'
import { listWhatsAppDrafts } from '@/features/messagetemplates/whatsappActions'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function SmsEmailPage() {
  if (!(await canCurrentUserAccessRoute('/config/sms-email'))) redirect('/dashboard')
  const rows = await listTemplates()
  const drafts = await listWhatsAppDrafts()
  return <MessagingTemplatesTabs whatsapp={<WhatsAppGlobalClient initialDrafts={drafts} />} email={<TemplatesClient initialData={rows} />} />
}
