import { PageHeader } from '@/components/ui'
import { Construction } from 'lucide-react'

export function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <Construction className="w-8 h-8 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">This module isn&apos;t wired up yet</p>
        <p className="text-xs text-gray-400 mt-1">Navigation and layout are ready — the real data screen comes next.</p>
      </div>
    </div>
  )
}
