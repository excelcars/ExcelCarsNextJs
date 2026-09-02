'use client'

import { Eye, Mail, Pencil, Trash2, UserPlus } from 'lucide-react'

type InquiryRowActionsProps = {
  inquiryId: number
  isEmailPending: boolean
  onSendEmail: () => void
  onView: () => void
  onEdit: () => void
  onAssign: () => void
  onDelete: () => void
}

export function InquiryRowActions({ inquiryId, isEmailPending, onSendEmail, onView, onEdit, onAssign, onDelete }: InquiryRowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onSendEmail} disabled={isEmailPending} className="rounded p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-600 disabled:opacity-40" title="Send car details by email">
        <Mail className="h-3.5 w-3.5" />
      </button>
      <button onClick={onView} className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" title="View"><Eye className="h-3.5 w-3.5" /></button>
      <button onClick={onEdit} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={onAssign} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]" title="Assign Inquiry"><UserPlus className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  )
}
