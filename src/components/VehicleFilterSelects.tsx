'use client'

import { Select } from '@/components/ui'

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
      <Select label={labeled ? 'Make' : undefined} value={makeId} onChange={e => onMakeChange(e.target.value)} disabled={disabled} className={className}>
        <option value="">All Makes</option>
        {makes.map(item => <option key={item.pkMakeId} value={String(item.pkMakeId)}>{item.make ?? '—'}</option>)}
      </Select>
      <Select label={labeled ? 'Model' : undefined} value={modelId} onChange={e => onModelChange(e.target.value)} disabled={disabled || !makeId} className={className}>
        <option value="">All Models</option>
        {models.map(item => <option key={item.pkModelId} value={String(item.pkModelId)}>{item.model ?? '—'}</option>)}
      </Select>
      <Select label={labeled ? 'Variant' : undefined} value={variantId} onChange={e => onVariantChange(e.target.value)} disabled={disabled || !modelId} className={className}>
        <option value="">All Variants</option>
        {variants.map(item => <option key={item.pkVariantId} value={String(item.pkVariantId)}>{item.variant ?? '—'}</option>)}
      </Select>
    </>
  )
}
