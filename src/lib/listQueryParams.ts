export function buildListQueryString(base: Record<string, string>, updates: Record<string, string>, removeAll = false) {
  const params = new URLSearchParams({ ...base, ...updates })
  for (const [key, value] of [...params.entries()]) {
    if (!value || (removeAll && value === 'All')) params.delete(key)
  }
  return params.toString()
}
