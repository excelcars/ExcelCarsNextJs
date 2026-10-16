import { CarFront } from 'lucide-react'
import type { InquiryCarInput } from './actions'

export function InquiryCarTable({
  cars,
  makeNames,
  modelNames,
  variantNames,
  onMove,
  onEdit,
  onDelete,
}: {
  cars: InquiryCarInput[]
  makeNames: Record<number, string | null | undefined>
  modelNames: Record<number, string | null | undefined>
  variantNames: Record<number, string | null | undefined>
  onMove: (index: number, direction: -1 | 1) => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="w-12 border-b border-r border-gray-200 px-3 py-3">#</th><th className="border-b border-r border-gray-200 px-3 py-3">Make</th><th className="border-b border-r border-gray-200 px-3 py-3">Model</th><th className="border-b border-r border-gray-200 px-3 py-3">Variant</th><th className="border-b border-r border-gray-200 px-3 py-3">Sub Variant</th><th className="border-b border-r border-gray-200 px-3 py-3">Year</th><th className="border-b border-r border-gray-200 px-3 py-3">Owners</th><th className="border-b border-gray-200 px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cars.length === 0 ? (
            <tr><td colSpan={8} className="px-3 py-7"><div className="flex items-center justify-center gap-4 text-left"><div className="grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-[#1B2A6B]"><CarFront className="h-8 w-8" strokeWidth={1.4} /></div><div><div className="text-sm font-semibold text-gray-800">No vehicle rows added yet.</div><div className="mt-1 text-xs text-gray-500">Use the form above to add one or more vehicle interests.</div></div></div></td></tr>
          ) : cars.map((car, index) => (
            <tr key={car.inquiryCarDetailsId ?? `inquiry-car-${index}`} className="hover:bg-slate-50 [&>td]:border-b [&>td]:border-r [&>td]:border-gray-100">
              <td className="px-3 py-2 text-center text-gray-600">{index + 1}</td><td className="px-3 py-2 text-gray-700">{car.selectedMakeId ? makeNames[car.selectedMakeId] ?? '—' : '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.selectedModelId ? modelNames[car.selectedModelId] ?? '—' : '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.fkVariantId ? variantNames[car.fkVariantId] ?? '—' : '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.subVariant.trim() || '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.carYear ?? '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.noOfOwners ?? 'Any'}</td>
              <td className="!border-r-0 px-3 py-2"><div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Up</button>
                <button type="button" onClick={() => onMove(index, 1)} disabled={index === cars.length - 1} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Down</button>
                <button type="button" onClick={() => onEdit(index)} className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 transition hover:bg-blue-50">Edit</button>
                <button type="button" onClick={() => onDelete(index)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 transition hover:bg-red-50">Delete</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
