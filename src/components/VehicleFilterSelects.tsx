'use client'

import { FormDropdown } from '@/components/FormDropdown'

type Make = { pkMakeId: number; make: string | null }
type Model = { pkModelId: number; model: string | null }
type Variant = { pkVariantId: number; variant: string | null }

type VehicleFilterSelectsProps = {
  makeId: string
  modelId: string
  variantId: string
  makes: Make[]
  models: Model[]
  variants: Variant[]
  disabled: boolean
  labeled?: boolean
  className?: string
  onMakeChange: (value: string) => void
  onModelChange: (value: string) => void
  onVariantChange: (value: string) => void
}

export function VehicleFilterSelects({ makeId, modelId, variantId, makes, models, variants, disabled, labeled = false, className, onMakeChange, onModelChange, onVariantChange }: VehicleFilterSelectsProps) {
  return (
    <>
      <FormDropdown label={labeled ? 'Make' : undefined} value={makeId} options={makes.map(item => ({ value: String(item.pkMakeId), label: item.make ?? '—' }))} placeholder="All Makes" allowClear disabled={disabled} className={className} onChange={onMakeChange} />
      <FormDropdown label={labeled ? 'Model' : undefined} value={modelId} options={models.map(item => ({ value: String(item.pkModelId), label: item.model ?? '—' }))} placeholder="All Models" allowClear disabled={disabled || !makeId} className={className} onChange={onModelChange} />
      <FormDropdown label={labeled ? 'Variant' : undefined} value={variantId} options={variants.map(item => ({ value: String(item.pkVariantId), label: item.variant ?? '—' }))} placeholder="All Variants" allowClear disabled={disabled || !modelId} className={className} onChange={onVariantChange} />
    </>
  )
}
