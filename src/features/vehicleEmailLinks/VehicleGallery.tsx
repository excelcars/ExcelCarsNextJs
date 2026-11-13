'use client'
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import { Play, Video } from 'lucide-react'

type VehiclePhoto = {
  documentId: number
  src: string
  alt: string
}

type VehicleVideo = {
  inventoryVideoId: number
  sourceType: 'YOUTUBE' | 'UPLOAD'
  youtubeVideoId: string | null
  src: string | null
}

type GalleryItem = ({ kind: 'photo' } & VehiclePhoto) | ({ kind: 'video' } & VehicleVideo)

export function VehicleGallery({ photos, videos = [] }: { photos: VehiclePhoto[]; videos?: VehicleVideo[] }) {
  const items: GalleryItem[] = [...photos.map(photo => ({ ...photo, kind: 'photo' as const })), ...videos.map(video => ({ ...video, kind: 'video' as const }))]
  const [selectedId, setSelectedId] = useState(() => items[0]?.kind === 'photo' ? `photo-${items[0].documentId}` : items[0] ? `video-${items[0].inventoryVideoId}` : null)
  const selected = items.find(item => (item.kind === 'photo' ? `photo-${item.documentId}` : `video-${item.inventoryVideoId}`) === selectedId) ?? items[0]

  if (!selected) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[#e4e9f2] bg-gradient-to-br from-[#edf2fb] to-[#f7f9fc] px-6 text-center text-sm text-gray-500 shadow-sm sm:h-[420px] sm:rounded-3xl">
        Vehicle photos and videos available on request
      </div>
    )
  }

  return (
    <>
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-sm sm:aspect-[16/10] sm:rounded-3xl lg:aspect-[4/3]">
        {selected.kind === 'photo' ? <img src={selected.src} alt={selected.alt} className="h-full w-full object-cover" /> : selected.sourceType === 'YOUTUBE' && selected.youtubeVideoId ? <iframe className="h-full w-full bg-black" src={`https://www.youtube-nocookie.com/embed/${selected.youtubeVideoId}`} title="Vehicle video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : selected.src ? <video className="h-full w-full bg-black" controls preload="metadata" src={selected.src} /> : <div className="grid h-full place-items-center bg-black text-white"><Video className="h-14 w-14" /></div>}
      </div>

      {items.length > 1 ? (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:gap-3" aria-label="Vehicle media">
          {items.map(item => {
            const id = item.kind === 'photo' ? `photo-${item.documentId}` : `video-${item.inventoryVideoId}`
            const isSelected = id === selectedId
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                aria-label={item.kind === 'photo' ? `Show ${item.alt}` : 'Show video'}
                aria-pressed={isSelected}
                className={`shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#142b62] focus:ring-offset-2 sm:rounded-2xl ${isSelected ? 'border-[#142b62]' : 'border-[#e4e9f2] hover:border-[#7185b6]'}`}
              >
                {item.kind === 'photo' ? <img src={item.src} alt="" className="h-16 w-24 object-cover sm:h-20 sm:w-32" /> : <span className="relative block h-16 w-24 bg-black sm:h-20 sm:w-32">{item.sourceType === 'YOUTUBE' && item.youtubeVideoId ? <img src={`https://i.ytimg.com/vi/${item.youtubeVideoId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" /> : item.src ? <video className="h-full w-full object-cover" muted preload="metadata" src={item.src} /> : null}<span className="absolute inset-0 grid place-items-center bg-black/30 text-white"><Play className="h-6 w-6 fill-current" /></span></span>}
              </button>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
