import { Download } from 'lucide-react'
import { Btn } from '@/components/ui'

export function FollowupHeader({ subtitle, total, filtered, exporting, onExport }: { subtitle: string; total: number; filtered: boolean; exporting: boolean; onExport: () => void }) {
  return <header className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0"><h1 className="text-xl font-bold text-gray-900">Follow-up Queue</h1><p className="mt-0.5 break-words text-sm text-gray-500">{subtitle}</p></div>
    <Btn variant="outline" size="sm" className="min-h-11 shrink-0 justify-center" onClick={onExport} disabled={exporting || total === 0}><Download className="h-3.5 w-3.5 shrink-0" />{exporting ? 'Exporting...' : `${filtered ? 'Export Filtered' : 'Export All'} (${total})`}</Btn>
  </header>
}
