import { WhatsAppInboxClient } from '@/features/messages/WhatsAppInboxClient'

export default function Page() {
  return <div className="min-h-screen bg-[#f8fafb] p-4"><div className="mb-4 flex h-12 items-center rounded-lg bg-[#112d49] px-5 font-semibold text-white">Excel Cars · Inbox preview</div><WhatsAppInboxClient /></div>
}
