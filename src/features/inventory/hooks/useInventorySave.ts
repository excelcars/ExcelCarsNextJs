import type { TransitionStartFunction } from 'react'
import { createInventory, updateInventory, type InventoryFormInput } from '../actions'
import { isValidEmail, isValidInventoryOwnerMobile, isValidYear } from '@/lib/validation'

interface SaveResult {
  success: boolean
  error?: string
  inventoryId?: number
  inventoryNumber?: string | null
}

interface UseInventorySaveParams {
  form: InventoryFormInput
  editId: number | null
  catalogMakeText: string
  catalogModelText: string
  catalogVariantText: string
  setErrors: (errors: Record<string, boolean>) => void
  setError: (error: string) => void
  startTransition: TransitionStartFunction
  onSaved: (result: SaveResult, saveForm: InventoryFormInput, editId: number | null) => void
  onSaveError: (message: string) => void
}

export function useInventorySave({ form, editId, catalogMakeText, catalogModelText, catalogVariantText, setErrors, setError, startTransition, onSaved, onSaveError }: UseInventorySaveParams) {
  const save = () => {
    setError('')
    const newErrors: Record<string, boolean> = {}
    if (form.isCarRegistered === true && !form.registrationNo?.trim()) newErrors.registrationNo = true
    if (!catalogMakeText.trim() || !catalogModelText.trim() || !form.fkVariantId || !catalogVariantText.trim()) newErrors.fkVariantId = true
    if (form.year === null || form.year === undefined || !isValidYear(form.year)) newErrors.year = true
    if (form.isCarRegistered === true && !form.tax.trim()) newErrors.tax = true
    if (form.isCarRegistered === true && form.kmsDriven === null) newErrors.kmsDriven = true
    if (!form.colour.trim()) newErrors.colour = true
    if (form.isCarRegistered === true && !form.fuelType.trim()) newErrors.fuelType = true
    if (form.kmsDriven !== null && Number(form.kmsDriven) < 0) newErrors.kmsDriven = true
    if (form.isCarRegistered === true && (form.noOfOwners === null || form.noOfOwners === undefined || !Number.isInteger(form.noOfOwners) || form.noOfOwners < 1)) newErrors.noOfOwners = true
    if (form.isCarRegistered !== true && form.noOfOwners !== null && form.noOfOwners !== undefined && (!Number.isInteger(form.noOfOwners) || form.noOfOwners < 0)) newErrors.noOfOwners = true
    if (!form.status.trim()) newErrors.status = true
    if (form.price === null || !Number.isFinite(form.price) || form.price <= 0) newErrors.price = true
    if (!['Excel Cars', 'Dealer', 'Individual'].includes(form.ownedType)) newErrors.ownedType = true
    if (!form.ownedBy.trim()) newErrors.ownedBy = true
    if (form.isCarRegistered === true && !form.insuranceType.trim()) newErrors.insuranceType = true
    if (form.mobileNoOwnedBy && !isValidInventoryOwnerMobile(form.mobileNoOwnedBy)) newErrors.mobileNoOwnedBy = true
    if (form.emailIdOwnedBy && !isValidEmail(form.emailIdOwnedBy)) newErrors.emailIdOwnedBy = true
    if (form.status.trim().toLowerCase() === 'sold' && !form.customerId) newErrors.customerId = true
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    const saveForm = { ...form, makeLegacy: form.makeLegacy.trim() || catalogMakeText.trim(), modelLegacy: form.modelLegacy.trim() || catalogModelText.trim(), variantLegacy: form.variantLegacy.trim() || catalogVariantText.trim() }
    startTransition(async () => {
      const result = editId ? await updateInventory(editId, saveForm) : await createInventory(saveForm)
      if (!result.success) {
        const normalizedError = result.error?.toLowerCase() ?? ''
        if (normalizedError.includes('registration number') && (normalizedError.includes('already exists') || normalizedError.includes('already active'))) {
          setErrors({ registrationDuplicate: true })
          setError('')
          onSaveError(result.error ?? 'This registration number is already active on another vehicle in stock.')
          return
        }
        const message = result.error ?? 'Could not save this vehicle.'
        setError(message)
        onSaveError(message)
        return
      }
      onSaved(result, saveForm, editId)
    })
  }

  return { save }
}
