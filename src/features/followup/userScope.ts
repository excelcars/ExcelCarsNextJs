type OwnershipScope = { userId: number | null; restrictToUserId: number | null }

// An explicit "all" survives URL updates; a missing selection defaults to my work.
export function resolveFollowupUserId(requested: string | null | undefined, scope: OwnershipScope, excludeUserId?: string | null) {
  if (scope.restrictToUserId) return String(scope.restrictToUserId)
  if (requested === 'all') return 'all'
  if (Number.isInteger(Number(requested)) && Number(requested) > 0) return String(Number(requested))
  if (Number(excludeUserId) > 0) return 'all'
  return scope.userId ? String(scope.userId) : ''
}
