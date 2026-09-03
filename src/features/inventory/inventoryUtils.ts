import type { InventoryFormInput } from './actions'
import type { CustomerOption, InventoryFilters } from './inventoryTypes'

export const formatPriceInput = (value: number | null) => value === null || !Number.isFinite(value)
  ? ''
  : value.toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const clean = (value: string | null | undefined) => {
  const result = value?.trim()
  if (!result) return ''
  return ['null', 'na', 'n/a'].includes(result.toLowerCase()) ? '' : result
}

export function emptyFilters(): InventoryFilters {
  return {
    search: '', status: 'All', make: '', model: '', fuelType: '', inventoryNumber: '', sku: '', registrationNo: '', variant: '', colour: '', year: '', month: '', noOfOwners: '', tax: '', isCarRegistered: '', kmsMin: '', kmsMax: '', insuranceType: '', priceMin: '', priceMax: '', ownedType: '', ownedBy: '', mobileNoOwnedBy: '', emailIdOwnedBy: '', customerName: '', linkedCustomer: '', internalComments: '', otherRemarks: '',
  }
}

export function emptyForm(): InventoryFormInput {
  return {
    registrationNo: '', fkVariantId: null, makeLegacy: '', modelLegacy: '', variantLegacy: '', colour: '', year: new Date().getFullYear(), month: '', fuelType: '', noOfOwners: 1, tax: '', isCarRegistered: null, kmsDriven: null, insuranceType: '', price: null, status: 'In Stock', ownedType: '', ownedBy: '', mobileNoOwnedBy: '', emailIdOwnedBy: '', customerId: null, customerName: '', internalComments: '', otherRemarks: '',
  }
}

export function buildDirtySnapshot(form: InventoryFormInput, selectedCustomer: CustomerOption | null) {
  return JSON.stringify({ ...form, selectedCustomerId: selectedCustomer?.custId ?? null })
}
