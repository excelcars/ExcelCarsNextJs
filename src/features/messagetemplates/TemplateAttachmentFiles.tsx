export interface TemplateAttachment {
  uploadId: string
  originalName: string
  byteSize: number
  scope: string
}

export function TemplateAttachmentFiles({ files, onRemove }: { files: TemplateAttachment[]; onRemove: (uploadId: string) => void }) {
  return <div className="min-w-0 space-y-2">{files.map(file => <div key={file.uploadId} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
    <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-gray-800">{file.originalName} <span className="text-xs text-gray-500">({Math.ceil(file.byteSize / 1024)} KB)</span></span>
    <button type="button" aria-label={`Remove ${file.originalName}`} onClick={() => onRemove(file.uploadId)} className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>
  </div>)}</div>
}
