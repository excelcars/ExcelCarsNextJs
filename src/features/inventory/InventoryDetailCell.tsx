export function InventoryDetailCell({
  items,
}: {
  items: Array<[string, string | number | boolean | null | undefined]>
}) {
  return (
    <div className="space-y-0.5 text-sm leading-6 text-gray-600">
      {items.map(([label, value]) => {
        const displayValue = value === null || value === undefined || value === ''
          ? '—'
          : typeof value === 'boolean'
            ? value ? 'Yes' : 'No'
            : String(value)

        return (
          <div key={label}>
            <span className="font-semibold text-gray-700">{label}:</span>{' '}
            <span>{displayValue}</span>
          </div>
        )
      })}
    </div>
  )
}
