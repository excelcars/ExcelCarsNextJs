'use client'

import { useState, type ReactNode } from 'react'

export function MessagingTemplatesTabs({ whatsapp, email }: { whatsapp: ReactNode; email: ReactNode }) {
  const [tab, setTab] = useState<'whatsapp' | 'email'>('whatsapp')
  return <div className="min-w-0">
    <div className="mb-6 grid grid-cols-2 gap-2 border-b border-gray-200 sm:flex [&_button]:min-h-11">
      <button type="button" onClick={() => setTab('whatsapp')} className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'whatsapp' ? 'border-[#1B2A6B] text-[#1B2A6B]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>WhatsApp Templates</button>
      <button type="button" onClick={() => setTab('email')} className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'email' ? 'border-[#1B2A6B] text-[#1B2A6B]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>Email Templates</button>
    </div>
    {tab === 'whatsapp' ? whatsapp : email}
  </div>
}
