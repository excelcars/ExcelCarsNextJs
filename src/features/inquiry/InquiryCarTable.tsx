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
    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2">Make</th><th className="px-3 py-2">Model</th><th className="px-3 py-2">Variant</th><th className="px-3 py-2">Sub Variant</th><th className="px-3 py-2">Year</th><th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {cars.length === 0 ? (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No vehicle rows added yet.</td></tr>
          ) : cars.map((car, index) => (
            <tr key={car.inquiryCarDetailsId ?? `inquiry-car-${index}`}>
              <td className="px-3 py-2 text-gray-700">{car.selectedMakeId ? makeNames[car.selectedMakeId] ?? '—' : '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.selectedModelId ? modelNames[car.selectedModelId] ?? '—' : '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.fkVariantId ? variantNames[car.fkVariantId] ?? '—' : '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.subVariant.trim() || '—'}</td>
              <td className="px-3 py-2 text-gray-700">{car.carYear ?? '—'}</td>
              <td className="px-3 py-2"><div className="flex flex-wrap items-center gap-1.5">
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
