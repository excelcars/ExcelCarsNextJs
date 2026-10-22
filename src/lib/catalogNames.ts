const PLACEHOLDER_NAMES = new Set(['', 'null', 'na', 'n/a', '-', '—'])

export function cleanCatalogName(value: string | null | undefined) {
  const name = value?.trim() ?? ''
  return PLACEHOLDER_NAMES.has(name.toLowerCase()) ? '' : name
}

export function catalogDisplayName(value: string | null | undefined, kind: string, id: number) {
  return cleanCatalogName(value) || `Unnamed ${kind} (#${id})`
}

// Keep an existing legacy selection identifiable when editing, without offering
// incomplete records as new choices. Never change its stored ID or relationships.
export function catalogSelectOptions<T>(rows: T[], idFor: (row: T) => number, nameFor: (row: T) => string | null | undefined, selectedId?: number | null, kind = 'record') {
  return rows.flatMap(row => {
    const id = idFor(row)
    const name = cleanCatalogName(nameFor(row))
    if (!name && id !== selectedId) return []
    return [{ value: String(id), label: name || catalogDisplayName(null, kind, id) }]
  })
}

export function catalogTextOptions(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  return values.map(cleanCatalogName).filter(name => {
    const key = name.toLowerCase()
    if (!name || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
