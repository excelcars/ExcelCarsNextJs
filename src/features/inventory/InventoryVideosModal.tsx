'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from 'react'
import { Loader2, Play, Star, Trash2, Upload, Video } from 'lucide-react'
import { Btn, ConfirmDialog, Input, Modal } from '@/components/ui'
import type { InventoryRow } from './inventoryTypes'

type InventoryVideo = {
  inventoryVideoId: number
  sourceType: 'YOUTUBE' | 'UPLOAD'
  youtubeUrl: string | null
  youtubeVideoId: string | null
  fileName: string | null
  isFeatured: boolean
  url: string | null
}

async function readResponsePayload(response: Response): Promise<{ payload: unknown; error?: string }> {
  const body = await response.text()
  if (!body.trim()) return { payload: null, error: `The server returned an empty response (${response.status}).` }
  try {
    return { payload: JSON.parse(body) }
  } catch {
    return { payload: null, error: `The server returned an invalid response (${response.status}).` }
  }
}

export function InventoryVideosModal({ row, onClose, onVideoCountChange }: { row: InventoryRow | null; onClose: () => void; onVideoCountChange: (inventoryId: number, count: number) => void }) {
  const [videos, setVideos] = useState<InventoryVideo[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [playerVideo, setPlayerVideo] = useState<InventoryVideo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryVideo | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; percent: number } | null>(null)
  const [pending, startTransition] = useTransition()

  const load = async () => {
    if (!row) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/inventory/videos?inventoryId=${row.inventoryId}`)
      const { payload, error: responseError } = await readResponsePayload(response)
      if (!response.ok) throw new Error(responseError ?? (payload as { error?: string } | null)?.error ?? 'Could not load videos.')
      if (!Array.isArray(payload)) throw new Error(responseError ?? 'Could not load videos.')
      const loadedVideos = payload as InventoryVideo[]
      setVideos(loadedVideos)
      onVideoCountChange(row.inventoryId, loadedVideos.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load videos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [row?.inventoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const addYoutube = () => {
    if (!row || !youtubeUrl.trim()) return
    startTransition(async () => {
      setError('')
      const response = await fetch('/api/inventory/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryId: row.inventoryId, youtubeUrl }) })
      const { payload, error: responseError } = await readResponsePayload(response)
      if (!response.ok) { setError(responseError ?? (payload as { error?: string } | null)?.error ?? 'Could not add the YouTube video.'); return }
      setYoutubeUrl('')
      await load()
    })
  }

  const uploadFile = (uploadUrl: string, file: File, contentType: string, onProgress: (loaded: number) => void) => new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', contentType)
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded) }
    request.onerror = () => reject(new Error('The browser could not upload the video to storage. Check the Firebase bucket CORS configuration, then try again.'))
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`The video upload failed (${request.status}).`))
    request.send(file)
  })

  const upload = (files: FileList | null) => {
    if (!row || !files?.length) return
    const selected = Array.from(files)
    if (selected.some(file => !['.mp4', '.mov'].some(extension => file.name.toLowerCase().endsWith(extension)) || !['', 'video/mp4', 'video/quicktime'].includes(file.type) || file.size > 100 * 1024 * 1024)) {
      setError('Only MP4 or MOV videos up to 100 MB each are allowed.')
      return
    }
    startTransition(async () => {
      setError('')
      setUploadProgress({ completed: 0, total: selected.reduce((total, file) => total + file.size, 0), percent: 0 })
      const fileType = (file: File) => file.type || (file.name.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4')
      const prepare = await fetch('/api/inventory/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepareUpload', inventoryId: row.inventoryId, files: selected.map(file => ({ name: file.name, size: file.size, type: fileType(file) })) }) })
      const prepared = await readResponsePayload(prepare)
      const uploads = (prepared.payload as { uploads?: Array<{ name: string; storagePath: string; contentType: string; uploadUrl: string }> } | null)?.uploads
      if (!prepare.ok || !uploads || uploads.length !== selected.length) { setError(prepared.error ?? (prepared.payload as { error?: string } | null)?.error ?? 'Could not prepare video upload.'); setUploadProgress(null); return }
      const loaded = selected.map(() => 0)
      const total = selected.reduce((sum, file) => sum + file.size, 0)
      try {
        await Promise.all(uploads.map((item, index) => uploadFile(item.uploadUrl, selected[index], item.contentType, bytes => {
          loaded[index] = bytes
          const completed = loaded.reduce((sum, value) => sum + value, 0)
          setUploadProgress({ completed, total, percent: Math.min(100, Math.round((completed / total) * 100)) })
        })))
      } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); setUploadProgress(null); return }
      const response = await fetch('/api/inventory/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'completeUpload', inventoryId: row.inventoryId, files: uploads.map((item, index) => ({ name: selected[index].name, size: selected[index].size, type: fileType(selected[index]), storagePath: item.storagePath })) }) })
      const { payload, error: responseError } = await readResponsePayload(response)
      const result = payload as { success?: boolean; error?: string; results?: Array<{ error?: string }> } | null
      if (!response.ok || !result?.success) { setError(responseError ?? result?.error ?? result?.results?.find(item => item.error)?.error ?? 'Upload failed.'); setUploadProgress(null); return }
      setUploadProgress({ completed: total, total, percent: 100 })
      await load()
      setUploadProgress(null)
    })
  }

  const feature = (inventoryVideoId: number) => {
    if (!row) return
    startTransition(async () => {
      const response = await fetch('/api/inventory/videos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'feature', inventoryId: row.inventoryId, inventoryVideoId }) })
      const { payload, error: responseError } = await readResponsePayload(response)
      if (!response.ok) { setError(responseError ?? (payload as { error?: string } | null)?.error ?? 'Could not set featured video.'); return }
      await load()
    })
  }

  const remove = (inventoryVideoId: number) => {
    if (!row) return
    startTransition(async () => {
      const response = await fetch('/api/inventory/videos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryId: row.inventoryId, inventoryVideoId }) })
      const { payload, error: responseError } = await readResponsePayload(response)
      if (!response.ok) { setError(responseError ?? (payload as { error?: string } | null)?.error ?? 'Could not delete the video.'); return }
      await load()
    })
  }

  return <Modal title={`Inventory Videos${row ? ` — ${row.registrationNo ?? row.inventoryNumber ?? ''}` : ''}`} open={!!row} onClose={onClose} width="max-w-5xl">
    {row ? <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_auto]">
        <Input label="YouTube video link" value={youtubeUrl} onChange={event => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." disabled={pending} />
        <div className="flex items-end"><Btn onClick={addYoutube} disabled={pending || !youtubeUrl.trim()}><Video className="h-4 w-4" />Add YouTube Video</Btn></div>
      </div>
      {uploadProgress ? <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="flex justify-between text-xs font-medium text-[#1B2A6B]"><span>Uploading videos…</span><span>{uploadProgress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-[#1B2A6B] transition-all" style={{ width: `${uploadProgress.percent}%` }} /></div><div className="mt-1 text-xs text-blue-800">{(uploadProgress.completed / 1024 / 1024).toFixed(1)} MB of {(uploadProgress.total / 1024 / 1024).toFixed(1)} MB</div></div> : null}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
        <div><div className="text-sm font-semibold text-gray-900">Upload MP4 or MOV videos</div><div className="text-xs text-gray-500">Maximum 100 MB per video. The first video is featured by default.</div></div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Select Video Files
          <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" multiple className="hidden" disabled={pending} onChange={event => { upload(event.target.files); event.currentTarget.value = '' }} />
        </label>
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="py-8 text-center text-sm text-gray-500">Loading videos...</div> : videos.length === 0 ? <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">No videos added yet.</div> : <div className="grid gap-4 md:grid-cols-2">
        {videos.map(video => <div key={video.inventoryVideoId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <button type="button" onClick={() => setPlayerVideo(video)} className="group relative block aspect-video w-full overflow-hidden bg-black" title="Play video">
            {video.sourceType === 'YOUTUBE' && video.youtubeVideoId ? <img src={`https://i.ytimg.com/vi/${video.youtubeVideoId}/hqdefault.jpg`} alt="YouTube video preview" className="h-full w-full object-cover" /> : video.url ? <video className="h-full w-full object-cover" muted preload="metadata" src={video.url} /> : null}
            <span className="absolute inset-0 grid place-items-center bg-black/25 transition group-hover:bg-black/40"><span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#1B2A6B] shadow"><Play className="ml-0.5 h-6 w-6 fill-current" /></span></span>
          </button>
          <div className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><div className="truncate text-xs font-medium text-gray-800">{video.sourceType === 'YOUTUBE' ? 'YouTube video' : video.fileName ?? 'Uploaded video'}</div>{video.isFeatured ? <div className="mt-1 text-xs font-medium text-amber-700">Featured on public page</div> : null}</div><div className="flex items-center gap-1"><button type="button" onClick={() => feature(video.inventoryVideoId)} disabled={pending || video.isFeatured} title="Set as featured" className="rounded p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"><Star className={`h-4 w-4 ${video.isFeatured ? 'fill-amber-400 text-amber-500' : ''}`} /></button><button type="button" onClick={() => setDeleteTarget(video)} disabled={pending} title="Delete video" className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></div>
        </div>)}
      </div>}
    </div> : null}
    <Modal title="Video Player" open={playerVideo !== null} onClose={() => setPlayerVideo(null)} width="max-w-4xl">
      {playerVideo?.sourceType === 'YOUTUBE' && playerVideo.youtubeVideoId ? <iframe className="aspect-video w-full rounded-lg bg-black" src={`https://www.youtube-nocookie.com/embed/${playerVideo.youtubeVideoId}?autoplay=1`} title="Vehicle video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : playerVideo?.url ? <video className="aspect-video w-full rounded-lg bg-black" controls autoPlay src={playerVideo.url} /> : null}
    </Modal>
    <ConfirmDialog
      open={deleteTarget !== null}
      onClose={() => setDeleteTarget(null)}
      onConfirm={() => { if (deleteTarget) remove(deleteTarget.inventoryVideoId) }}
      title="Delete video?"
      message={`Delete ${deleteTarget?.sourceType === 'YOUTUBE' ? 'this YouTube video' : deleteTarget?.fileName ?? 'this uploaded video'}? This cannot be undone.`}
      confirmDisabled={pending}
    />
  </Modal>
}
