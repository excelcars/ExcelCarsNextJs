'use client'
import { Loader2 } from 'lucide-react'
export function EmailInventoryState({ type, message }: { type: 'error' | 'loading' | 'empty'; message: string }) { if (type === 'loading') return <div className="flex min-h-24 flex-col items-center justify-center gap-3 text-sm text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /><div>{message}</div></div>; return <div className={type === 'error' ? 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700' : 'rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500'}>{message}</div> }
