export function EmailPreview({ subject, body, recipientCount, hasSelectedRecipients, attachmentNames }: {
  subject: string | null | undefined
  body: string | null | undefined
  recipientCount: number
  hasSelectedRecipients: boolean
  attachmentNames: string[]
}) {
  return <div className="min-w-0 space-y-4">
    <div className="min-w-0 break-words [overflow-wrap:anywhere] rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <div><b>Subject:</b> {subject || '(no subject)'}</div>
      <div className="mt-1"><b>Recipients:</b> {recipientCount} selected {recipientCount === 1 ? 'address' : 'addresses'}{hasSelectedRecipients ? ' (duplicate email addresses will be sent only once)' : ''}</div>
      <div className="mt-1"><b>Attachments:</b> {attachmentNames.length ? attachmentNames.join(', ') : 'None'}</div>
    </div>
    <iframe title="Email preview" sandbox="" srcDoc={body ?? ''} className="min-h-80 w-full max-w-full rounded-lg border border-gray-200 bg-white" />
  </div>
}
