'use client'

import { Eye, Mail, Pencil, Trash2, UserPlus } from 'lucide-react'

type InquiryRowActionsProps = {
  mobile?: boolean
  isEmailPending: boolean
  onSendEmail: () => void
  onView: () => void
  onEdit: () => void
  onAssign: () => void
  onDelete: () => void
}

export function InquiryRowActions({ mobile = false, isEmailPending, onSendEmail, onView, onEdit, onAssign, onDelete }: InquiryRowActionsProps) {
  if (mobile) return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'View', Icon: Eye, onClick: onView },
        { label: 'Edit', Icon: Pencil, onClick: onEdit },
        { label: 'Assign', Icon: UserPlus, onClick: onAssign },
        { label: 'Email', Icon: Mail, onClick: onSendEmail, disabled: isEmailPending },
        { label: 'Delete', Icon: Trash2, onClick: onDelete },
      ].map(({ label, Icon, onClick, disabled }) => <button key={label} type="button" onClick={onClick} disabled={disabled} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 text-xs font-medium transition disabled:opacity-40 ${label === 'Delete' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-blue-50'}`}><Icon aria-hidden="true" className="h-4 w-4" />{label}</button>)}
    </div>
  )
  return (
    <div className="flex items-center gap-1">
      <button onClick={onSendEmail} disabled={isEmailPending} className="rounded p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-600 disabled:opacity-40" title="Send car details by email">
        <Mail className="h-3.5 w-3.5" />
      </button>
      <button onClick={onView} className="inline-flex rounded-md p-2 text-gray-700 transition hover:bg-gray-50" title="View"><Eye className="h-4 w-4" /></button>
      <button onClick={onEdit} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
      <button onClick={onAssign} className="rounded p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-[#1B2A6B]" title="Assign Inquiry"><UserPlus className="h-3.5 w-3.5" /></button>
      <button onClick={onDelete} className="rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  )
}
