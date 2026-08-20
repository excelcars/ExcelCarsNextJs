'use client'

import { useMemo, useState } from 'react'
import { Image as ImageIcon, Download } from 'lucide-react'
import { Badge, Btn, Table, PageHeader, SearchBar, Modal } from '@/components/ui'
import { INVENTORY_STATUSES } from '@/features/inventory/queries'

interface StockRow {
  inventoryId: number
  registrationNo: string | null
  sku: string | null
  colour: string | null
  year: number | null
  fuelType: string | null
  kmsDriven: string | null
  price: string | null
  status: string | null
  ownedBy: string | null
  mobileNoOwnedBy: string | null
  customerName: string | null
  carVariantMaster: {
    variant: string | null
    carMakeMaster: { make: string | null } | null
    carModelMaster: { model: string | null } | null
  } | null
  _count: { inventoryPhotos: number }
}

interface Photo { documentId: number; path: string | null }

const JUNK_VALUES = new Set(['null', 'na', 'n/a'])
const clean = (v: string | null | undefined) => (!v || JUNK_VALUES.has(v.trim().toLowerCase()) ? '' : v)
const fmtMoney = (n: string | number | null) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

function toCsv(rows: StockRow[]): string {
  const headers = ['SKU', 'Reg No', 'Make', 'Model', 'Variant', 'Year', 'Colour', 'Fuel', 'KM', 'Price', 'Status', 'Owner']
  const lines = [headers.join(',')]
  for (const r of rows) {
    const cells = [
      r.sku, r.registrationNo,
      clean(r.carVariantMaster?.carMakeMaster?.make), clean(r.carVariantMaster?.carModelMaster?.model), clean(r.carVariantMaster?.variant),
      r.year, r.colour, r.fuelType, r.kmsDriven, r.price, r.status, r.ownedBy,
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

function downloadCsv(rows: StockRow[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'stock-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function StockReportClient({ initialData }: { initialData: StockRow[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [photoRow, setPhotoRow] = useState<StockRow | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initialData.filter(r => {
      const make = r.carVariantMaster?.carMakeMaster?.make ?? ''
      const model = r.carVariantMaster?.carModelMaster?.model ?? ''
      const matches = !q
        || (r.registrationNo ?? '').toLowerCase().includes(q)
        || (r.sku ?? '').toLowerCase().includes(q)
        || make.toLowerCase().includes(q)
        || model.toLowerCase().includes(q)
        || (r.ownedBy ?? '').toLowerCase().includes(q)
      return matches && (filterStatus === 'All' || r.status === filterStatus)
    })
  }, [initialData, search, filterStatus])

  const openPhotos = async (r: StockRow) => {
    setPhotoRow(r)
    setPhotos([])
    setPhotosLoading(true)
    const res = await fetch(`/api/reports/photos?inventoryId=${r.inventoryId}`)
    setPhotos(await res.json())
    setPhotosLoading(false)
  }

  return (
    <div>
      <PageHeader
        title="Stock Report"
        subtitle={`${filtered.length} vehicles`}
        action={<Btn variant="outline" size="sm" onClick={() => downloadCsv(filtered)}><Download className="w-3.5 h-3.5" />Export</Btn>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Reg no, make, model, owner..." />
        <div className="flex flex-wrap gap-1.5">
          {['All', ...INVENTORY_STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === s ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={filterStatus === s ? { backgroundColor: '#1B2A6B' } : {}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Table headers={['SKU', 'Reg No', 'Vehicle', 'Year', 'Fuel', 'KM', 'Price', 'Status', 'Owner', 'Photos']} empty={filtered.length === 0}>
        {filtered.map(r => (
          <tr key={r.inventoryId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.sku ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">{r.registrationNo ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{clean(r.carVariantMaster?.carMakeMaster?.make)} {clean(r.carVariantMaster?.carModelMaster?.model)}</div>
              <div className="text-xs text-gray-500">{clean(r.carVariantMaster?.variant)} {r.colour ? `· ${r.colour}` : ''}</div>
            </td>
            <td className="px-4 py-3 text-gray-700">{r.year ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{r.fuelType ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{r.kmsDriven ? Number(r.kmsDriven).toLocaleString('en-IN') : '—'}</td>
            <td className="px-4 py-3 font-semibold text-gray-900">{fmtMoney(r.price)}</td>
            <td className="px-4 py-3">{r.status ? <Badge label={r.status} /> : '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-600">{r.ownedBy ?? '—'}</td>
            <td className="px-4 py-3">
              {r._count.inventoryPhotos > 0 ? (
                <button onClick={() => openPhotos(r)} className="flex items-center gap-1 text-xs text-[#1B2A6B] hover:underline">
                  <ImageIcon className="w-3.5 h-3.5" />{r._count.inventoryPhotos}
                </button>
              ) : '—'}
            </td>
          </tr>
        ))}
      </Table>

      <Modal title={`Photos — ${photoRow?.registrationNo ?? ''}`} open={!!photoRow} onClose={() => setPhotoRow(null)}>
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Image files from the legacy system were not migrated to this app's storage — filenames are shown for reference.</p>
          {photosLoading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : photos.length === 0 ? (
            <div className="text-sm text-gray-400">No photos on file.</div>
          ) : (
            <ul className="space-y-1">
              {photos.map(p => (
                <li key={p.documentId} className="text-xs font-mono text-gray-600 truncate">{p.path?.split('/').pop() ?? p.path}</li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  )
}
