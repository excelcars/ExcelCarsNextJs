'use client'

import { Loader2 } from 'lucide-react'

export function ListLoadingOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/35 text-sm text-gray-600 backdrop-blur-[1px]">
      <Loader2 className="h-5 w-5 animate-spin" />
      <div>{message}</div>
    </div>
  )
}
