'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { Btn, Modal } from '@/components/ui'
import type { InventoryRow } from './inventoryTypes'

interface InventoryDocument {
  inventoryDocumentId: number
  documentType: string | null
  originalName: string
  contentType: string
  sizeBytes: number
  createdAt: string | Date
  downloadUrl: string
}

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 15 * 1024 * 1024

export function InventoryDocumentsModal({
  row,
  onClose,
  onDocumentCountChange,
}: {
  row: InventoryRow | null
  onClose: () => void
  onDocumentCountChange: (inventoryId: number, count: number) => void
}) {
  const [documents, setDocuments] = useState<InventoryDocument[]>([])
  const [documentType, setDocumentType] = useState('Other')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isUploading, startUploadTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const requestRef = useRef(0)

  useEffect(() => {
    if (!row) return
    const requestId = ++requestRef.current
    setDocuments([])
    setSelectedFiles([])
    setError('')
    setLoading(true)
    void fetch(`/api/inventory/documents?inventoryId=${row.inventoryId}`)
      .then(async response => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? 'Could not load internal documents.')
        if (requestRef.current === requestId) setDocuments(Array.isArray(payload) ? payload : [])
      })
      .catch(reason => { if (requestRef.current === requestId) setError(reason instanceof Error ? reason.message : 'Could not load internal documents.') })
      .finally(() => { if (requestRef.current === requestId) setLoading(false) })
  }, [row])

  const selectFiles = (files: FileList | null) => {
    if (!files?.length) return
    const next = Array.from(files)
    const invalid = next.find(file => !ALLOWED_TYPES.has(file.type) || !file.size || file.size > MAX_FILE_SIZE)
    if (invalid) {
      setError('Only PDF, JPG, PNG, and WEBP files up to 15 MB each are allowed.')
      return
    }
    setError('')
    setSelectedFiles(next)
  }

  const upload = () => {
    if (!row || selectedFiles.length === 0) return
    startUploadTransition(async () => {
      setError('')
      const formData = new FormData()
      formData.append('inventoryId', String(row.inventoryId))
      formData.append('documentType', documentType)
      selectedFiles.forEach(file => formData.append('files', file))
      try {
        const response = await fetch('/api/inventory/documents', { method: 'POST', body: formData })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? 'Upload failed.')
        const uploaded = (payload?.results ?? []).flatMap((result: { success: boolean; document?: InventoryDocument }) => result.success && result.document ? [result.document] : [])
        const failures = (payload?.results ?? []).filter((result: { success: boolean }) => !result.success)
        if (uploaded.length) {
          setDocuments(previous => {
            const next = [...uploaded, ...previous]
            onDocumentCountChange(row.inventoryId, next.length)
            return next
          })
          setSelectedFiles([])
        }
        if (failures.length) setError(failures[0]?.error ?? 'Some documents could not be uploaded.')
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Upload failed.')
      }
    })
  }

  const remove = (document: InventoryDocument) => {
    if (!row) return
    startDeleteTransition(async () => {
      setError('')
      try {
        const response = await fetch('/api/inventory/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryDocumentId: document.inventoryDocumentId }) })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? 'Could not delete document.')
        setDocuments(previous => {
          const next = previous.filter(item => item.inventoryDocumentId !== document.inventoryDocumentId)
          onDocumentCountChange(row.inventoryId, next.length)
          return next
        })
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not delete document.')
      }
    })
  }

  return (
    <Modal title={`Internal Inventory Documents${row ? ` — ${row.registrationNo ?? row.inventoryNumber ?? ''}` : ''}`} open={!!row} onClose={onClose} width="max-w-3xl">
      {row ? <div className="space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Internal only.</strong> These files are not included in public vehicle pages, customer emails, or WhatsApp messages.</div>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-36 text-sm font-medium text-gray-700">Document type<select value={documentType} onChange={event => setDocumentType(event.target.value)} className="mt-1 block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"><option>RC</option><option>Insurance</option><option>KYC</option><option>Other</option></select></label>
            <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><Upload className="h-4 w-4" />Select files<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => { selectFiles(event.target.files); event.currentTarget.value = '' }} /></label>
            <Btn onClick={upload} disabled={isUploading || selectedFiles.length === 0}>{isUploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</> : `Upload${selectedFiles.length ? ` (${selectedFiles.length})` : ''}`}</Btn>
          </div>
          <p className="mt-2 text-xs text-gray-500">PDF, JPG, PNG, or WEBP · maximum 15 MB per file.</p>
          {selectedFiles.length ? <div className="mt-3 text-sm text-gray-700">Selected: {selectedFiles.map(file => file.name).join(', ')}</div> : null}
        </div>
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="flex items-center gap-2 py-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Loading documents...</div> : documents.length === 0 ? <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">No internal documents have been uploaded.</div> : <div className="divide-y overflow-hidden rounded-xl border border-gray-200">{documents.map(document => <div key={document.inventoryDocumentId} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3"><div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-amber-600" /><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-900">{document.originalName}</div><div className="text-xs text-gray-500">{document.documentType ?? 'Other'} · {(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB · {new Date(document.createdAt).toLocaleDateString('en-IN')}</div></div></div><div className="flex items-center gap-3"><a href={document.downloadUrl} className="text-xs font-semibold text-[#1B2A6B] hover:underline">Download</a><button type="button" onClick={() => remove(document)} disabled={isDeleting} className="text-red-600 hover:text-red-700 disabled:opacity-50" title="Delete document"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
      </div> : null}
    </Modal>
  )
}
