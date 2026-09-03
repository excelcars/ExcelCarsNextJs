import { Btn } from '@/components/ui'
import type { CarMakeMaster, CarModelMaster, CarVariantMaster } from './inventoryTypes'

export function InventoryFormFooter({
  error,
  isPending,
  makes,
  models,
  variants,
  onCancel,
  onSave,
}: {
  error: string
  isPending: boolean
  makes: CarMakeMaster[]
  models: CarModelMaster[]
  variants: CarVariantMaster[]
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex gap-3 justify-end pt-2"><Btn variant="outline" onClick={onCancel}>Cancel</Btn><Btn onClick={onSave} disabled={isPending}>{isPending ? 'Saving...' : 'Save Vehicle'}</Btn></div>
      <datalist id="inventory-makes">{makes.map(make => <option key={make.pkMakeId} value={make.make ?? ''} />)}</datalist>
      <datalist id="inventory-models">{models.map(model => <option key={model.pkModelId} value={model.model ?? ''} />)}</datalist>
      <datalist id="inventory-variants">{variants.map(variant => <option key={variant.pkVariantId} value={variant.variant ?? ''} />)}</datalist>
    </>
  )
}
