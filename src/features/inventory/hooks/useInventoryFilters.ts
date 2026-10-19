import { useMemo } from 'react'
import type { InventoryFilterChip } from '../InventoryFilters'
import type { InventoryFilters } from '../inventoryTypes'

export function useInventoryFilters(filters: InventoryFilters) {
  const activeFilterChips = useMemo<InventoryFilterChip[]>(() => {
    const items: InventoryFilterChip[] = []
    const add = (key: keyof InventoryFilters, label: string, value: string) => {
      if (value && value !== 'All') items.push({ key, label: `${label}: ${value}` })
    }
    add('search', 'Search', filters.search)
    add('status', 'Status', filters.status)
    add('fuelType', 'Fuel', filters.fuelType)
    add('ownedType', 'Owner Type', filters.ownedType)
    add('priceMin', 'Budget From', filters.priceMin)
    add('priceMax', 'Budget To', filters.priceMax)
    return items
  }, [filters])

  return { activeFilterChips, hasActiveFilters: activeFilterChips.length > 0 }
}
