import { Btn } from '@/components/ui'
import { catalogTextOptions } from '@/lib/catalogNames'
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
      <div className="grid grid-cols-2 gap-3 pt-2 sm:flex sm:justify-end [&_button]:min-h-11 [&_button]:justify-center"><Btn variant="outline" onClick={onCancel}>Cancel</Btn><Btn onClick={onSave} disabled={isPending}>{isPending ? 'Saving...' : 'Save Vehicle'}</Btn></div>
      <datalist id="inventory-makes">{catalogTextOptions(makes.map(make => make.make)).map(name => <option key={name} value={name} />)}</datalist>
      <datalist id="inventory-models">{catalogTextOptions(models.map(model => model.model)).map(name => <option key={name} value={name} />)}</datalist>
      <datalist id="inventory-variants">{catalogTextOptions(variants.map(variant => variant.variant)).map(name => <option key={name} value={name} />)}</datalist>
    </>
  )
}
