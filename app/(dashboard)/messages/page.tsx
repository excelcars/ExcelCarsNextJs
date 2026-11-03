import { redirect } from 'next/navigation'
import { getAuthorizedActorForFunctions } from '@/lib/access/accessControl'
import { WHATSAPP_INBOX_FUNCTION } from '@/lib/access/accessCatalog'
import { WhatsAppInboxClient } from '@/features/messages/WhatsAppInboxClient'

export default async function MessagesPage() {
  if (!await getAuthorizedActorForFunctions([WHATSAPP_INBOX_FUNCTION])) redirect('/dashboard')
  return <WhatsAppInboxClient />
}
