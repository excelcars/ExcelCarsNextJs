'use client'

import { useState } from 'react'

type VehiclePhoto = {
  documentId: number
  src: string
  alt: string
}

export function VehicleGallery({ photos }: { photos: VehiclePhoto[] }) {
  const [selectedPhotoId, setSelectedPhotoId] = useState(() => photos[0]?.documentId ?? null)
  const selectedPhoto = photos.find(photo => photo.documentId === selectedPhotoId) ?? photos[0]

  if (!selectedPhoto) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-[#e4e9f2] bg-gradient-to-br from-[#edf2fb] to-[#f7f9fc] text-sm text-gray-500 shadow-sm">
        Vehicle photos available on request
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-[#e4e9f2] bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedPhoto.src} alt={selectedPhoto.alt} className="h-[420px] w-full object-cover" />
      </div>

      {photos.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Vehicle photos">
          {photos.map(photo => {
            const isSelected = photo.documentId === selectedPhoto.documentId
            return (
              <button
                key={photo.documentId}
                type="button"
                onClick={() => setSelectedPhotoId(photo.documentId)}
                aria-label={`Show ${photo.alt}`}
                aria-pressed={isSelected}
                className={`shrink-0 overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#142b62] focus:ring-offset-2 ${isSelected ? 'border-[#142b62]' : 'border-[#e4e9f2] hover:border-[#7185b6]'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt="" className="h-24 w-52 object-cover" />
              </button>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
