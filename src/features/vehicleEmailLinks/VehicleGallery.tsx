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
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[#e4e9f2] bg-gradient-to-br from-[#edf2fb] to-[#f7f9fc] px-6 text-center text-sm text-gray-500 shadow-sm sm:h-[420px] sm:rounded-3xl">
        Vehicle photos available on request
      </div>
    )
  }

  return (
    <>
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#e4e9f2] bg-white shadow-sm sm:aspect-[16/10] sm:rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selectedPhoto.src} alt={selectedPhoto.alt} className="h-full w-full object-cover" />
      </div>

      {photos.length > 1 ? (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:gap-3" aria-label="Vehicle photos">
          {photos.map(photo => {
            const isSelected = photo.documentId === selectedPhoto.documentId
            return (
              <button
                key={photo.documentId}
                type="button"
                onClick={() => setSelectedPhotoId(photo.documentId)}
                aria-label={`Show ${photo.alt}`}
                aria-pressed={isSelected}
                className={`shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#142b62] focus:ring-offset-2 sm:rounded-2xl ${isSelected ? 'border-[#142b62]' : 'border-[#e4e9f2] hover:border-[#7185b6]'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt="" className="h-16 w-24 object-cover sm:h-24 sm:w-52" />
              </button>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
