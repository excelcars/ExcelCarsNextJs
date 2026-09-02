import type { ChangeEvent } from 'react'
import { Btn, Input, Select, Textarea, Modal } from '@/components/ui'
import { CustomerPicker } from '@/components/CustomerPicker'
import { CatalogTextPicker } from '@/components/CatalogTextPicker'
import type { InventoryFormInput } from './actions'
import type { CarMakeMaster, CarModelMaster, CarVariantMaster, CustomerOption, Dealer } from './inventoryTypes'
import { InventoryFormFooter } from './InventoryFormFooter'
import { normalizeRegistrationNo } from '@/lib/validation'
import { INVENTORY_STATUSES } from './queries'

type FieldChange = <K extends keyof InventoryFormInput>(field: K, value: InventoryFormInput[K]) => void

interface InventoryFormModalProps {
  open: boolean
  isEditing: boolean
  title: string
  detailLoading: boolean
  detailError: string
  form: InventoryFormInput
  errors: Record<string, boolean>
  error: string
  isPending: boolean
  currentInventoryNumber: string | null
  currentSku: string | null
  catalogMakeText: string
  catalogModelText: string
  catalogVariantText: string
  selectedMakeId: number | null
  selectedModelId: number | null
  selectedCustomer: CustomerOption | null
  makes: CarMakeMaster[]
  models: CarModelMaster[]
  variants: CarVariantMaster[]
  dealers: Dealer[]
  inventoryColours: string[]
  fuelTypes: string[]
  onClose: () => void
  onFieldChange: FieldChange
  onMakeChange: (value: string) => void | Promise<void>
  onModelChange: (value: string) => void | Promise<void>
  onVariantChange: (value: string) => void
  onOwnerTypeChange: (value: string) => void
  onDealerChange: (value: string) => void
  onCustomerChange: (value: CustomerOption | null) => void
  onSave: () => void
  formatPriceInput: (value: number | null) => string
}

export function InventoryFormModal({
  open, isEditing, title, detailLoading, detailError, form, errors, error, isPending,
  currentInventoryNumber, currentSku, catalogMakeText, catalogModelText,
  catalogVariantText, selectedMakeId, selectedModelId, selectedCustomer,
  makes, models, variants, dealers, inventoryColours, fuelTypes, onClose,
  onFieldChange, onMakeChange, onModelChange, onVariantChange, onOwnerTypeChange,
  onDealerChange, onCustomerChange, onSave, formatPriceInput,
}: InventoryFormModalProps) {
  const f = onFieldChange
  const numberInput = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/,/g, '').replace(/[^\d.]/g, '')
    const parts = raw.split('.')
    return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw
  }

  return (
    <Modal title={title} open={open} onClose={onClose} width="max-w-5xl">
      {detailLoading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          <div>Loading vehicle details...</div>
        </div>
      ) : detailError ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detailError}</div>
          <div className="flex justify-end"><Btn variant="outline" onClick={onClose}>Close</Btn></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Inventory No" value={currentInventoryNumber ?? 'Auto-generated on save'} readOnly disabled className={isEditing ? 'border-dashed bg-gray-100 text-gray-400 opacity-65 cursor-not-allowed' : ''} />
            <Input label="SKU" value={currentSku ?? 'Enter make, model, and colour'} readOnly disabled className={isEditing ? 'border-dashed bg-gray-100 text-gray-400 opacity-65 cursor-not-allowed' : ''} />
            <Input label="Registration No *" value={form.registrationNo} onChange={e => f('registrationNo', normalizeRegistrationNo(e.target.value))} placeholder="Any registration value" error={errors.registrationNo} />
            <Select label="Status" value={form.status} onChange={e => f('status', e.target.value)}>
              {INVENTORY_STATUSES.map(status => <option key={status}>{status}</option>)}
            </Select>
            <CatalogTextPicker label="Make *" value={catalogMakeText} onChange={value => void onMakeChange(value)} placeholder="Search make..." options={makes.map(make => make.make ?? '').filter(Boolean)} error={errors.fkVariantId} />
            <CatalogTextPicker label="Model *" value={catalogModelText} onChange={value => void onModelChange(value)} placeholder={selectedMakeId ? 'Search model...' : 'Select make first'} options={models.map(model => model.model ?? '').filter(Boolean)} error={errors.fkVariantId} />
            <CatalogTextPicker label="Variant *" value={catalogVariantText} onChange={onVariantChange} placeholder={selectedModelId ? 'Search variant...' : 'Select model first'} options={variants.map(variant => variant.variant ?? '').filter(Boolean)} error={errors.fkVariantId} />
            <Input label="Year *" type="number" value={form.year ?? ''} onChange={e => f('year', e.target.value ? +e.target.value : null)} error={errors.year} />
            <Input label="Month" value={form.month} onChange={e => f('month', e.target.value)} placeholder="Jan / Feb / Mar" />
            <CatalogTextPicker label="Colour *" value={form.colour} onChange={value => f('colour', value)} placeholder="Search or enter colour..." options={inventoryColours} error={errors.colour} />
            <Select label="Fuel Type *" value={form.fuelType} onChange={e => f('fuelType', e.target.value)} error={errors.fuelType}>
              <option value="">Select Fuel Type</option>
              {form.fuelType && !fuelTypes.includes(form.fuelType) ? <option value={form.fuelType}>{form.fuelType}</option> : null}
              {fuelTypes.map(fuelType => <option key={fuelType} value={fuelType}>{fuelType}</option>)}
            </Select>
            <Input label="No. of Owners *" type="number" min={1} step={1} value={form.noOfOwners ?? ''} onChange={e => f('noOfOwners', e.target.value ? +e.target.value : null)} error={errors.noOfOwners} />
            <Select label={`Tax${form.isCarRegistered === true ? ' *' : ''}`} value={form.tax} onChange={e => f('tax', e.target.value)} error={errors.tax}>
              <option value="">Select Tax Type</option><option value="Individual">Individual</option><option value="Corporate">Corporate</option>
            </Select>
            <Select label="Car Registered" value={form.isCarRegistered === null ? '' : form.isCarRegistered ? 'yes' : 'no'} onChange={e => f('isCarRegistered', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}>
              <option value="">Select</option><option value="yes">Yes</option><option value="no">No</option>
            </Select>
            <Input label={`KM Driven${form.isCarRegistered === true ? ' *' : ''}`} type="text" inputMode="decimal" value={formatPriceInput(form.kmsDriven)} onChange={e => { const value = numberInput(e); f('kmsDriven', value ? Number(value) : null) }} error={errors.kmsDriven} />
            <Input label={`Insurance Type${form.isCarRegistered === true ? ' *' : ''}`} value={form.insuranceType} onChange={e => f('insuranceType', e.target.value)} placeholder="Comprehensive / Expired" error={errors.insuranceType} />
            <Input label="Price (₹) *" type="text" inputMode="decimal" value={formatPriceInput(form.price)} onChange={e => { const value = numberInput(e); f('price', value ? Number(value) : null) }} error={errors.price} />
            <Select label="Owner Type *" value={form.ownedType} onChange={e => onOwnerTypeChange(e.target.value)} error={errors.ownedType}>
              <option value="">Select Owner Type</option><option value="Excel Cars">Excel Cars</option><option value="Dealer">Dealer</option><option value="Individual">Individual</option>
            </Select>
            {form.ownedType === 'Dealer' ? <CatalogTextPicker label="Name of Owner *" value={form.ownedBy} onChange={onDealerChange} placeholder="Search dealer..." options={dealers.map(dealer => dealer.dealerName ?? '').filter(Boolean)} error={errors.ownedBy} /> : <Input label="Name of Owner *" value={form.ownedBy} autoComplete="new-password" onChange={e => f('ownedBy', e.target.value)} error={errors.ownedBy} />}
            <Input label="Owner Mobile" value={form.mobileNoOwnedBy} onChange={e => f('mobileNoOwnedBy', e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" maxLength={11} error={errors.mobileNoOwnedBy} />
            <Input label="Owner Email" type="email" value={form.emailIdOwnedBy} onChange={e => f('emailIdOwnedBy', e.target.value)} error={errors.emailIdOwnedBy} />
          </div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-medium text-gray-600">Customer</label><CustomerPicker value={selectedCustomer} onChange={onCustomerChange} /></div></div>
          <div className="grid grid-cols-2 gap-4"><Textarea label="Internal Comments" value={form.internalComments} onChange={e => f('internalComments', e.target.value)} /><Textarea label="Remarks" value={form.otherRemarks} onChange={e => f('otherRemarks', e.target.value)} /></div>
          <InventoryFormFooter error={error} isPending={isPending} makes={makes} models={models} variants={variants} onCancel={onClose} onSave={onSave} />
        </div>
      )}
    </Modal>
  )
}
