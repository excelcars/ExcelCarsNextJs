export function parseTodayUserId(value: string | undefined | null) {
  const normalized = value?.trim() ?? ''
  if (!/^[1-9]\d*$/.test(normalized)) return null

  const userId = Number(normalized)
  return Number.isSafeInteger(userId) ? userId : null
}
