'use client'

import { Btn, Input, Modal, Select } from '@/components/ui'
import { CUSTOMER_TYPES } from './adminQueries'
import { CUSTOMER_FIELD_LIMITS, LEGACY_CUSTOMER_TYPES } from './validation'
import { CustomerDateInput } from './CustomerDateInput'
import type { CustomerFieldErrors, CustomerFormInput } from './types'

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null
}

export function CustomerFormModal({
  mode, form, errors, isPending, isUnchanged, onChange, onSave, onClose,
}: {
  mode: 'add' | 'edit' | null
  form: CustomerFormInput
  errors: CustomerFieldErrors
  isPending: boolean
  isUnchanged: boolean
  onChange: <K extends keyof CustomerFormInput>(key: K, value: CustomerFormInput[K]) => void
  onSave: () => void
  onClose: () => void
}) {
  const isEdit = mode === 'edit'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const latestDob = new Date(today)
  latestDob.setFullYear(latestDob.getFullYear() - 18)
  const dobMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(form.custDob)
  const selectedDob = dobMatch ? new Date(Number(dobMatch[3]), Number(dobMatch[2]) - 1, Number(dobMatch[1])) : undefined
  const types = [...CUSTOMER_TYPES, ...(isEdit && LEGACY_CUSTOMER_TYPES.includes(form.type as (typeof LEGACY_CUSTOMER_TYPES)[number]) ? LEGACY_CUSTOMER_TYPES : [])]
  const mobile = (key: 'custMobile' | 'mobile_2', value: string) => onChange(key, value.replace(/\D/g, ''))

  return (
    <Modal title={isEdit ? 'Edit Customer' : 'Add Customer'} open={mode !== null} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Select label="Type *" value={form.type} onChange={event => onChange('type', event.target.value)} error={!!errors.type} required>{types.map(type => <option key={type}>{type}</option>)}</Select><FieldError message={errors.type} /></div>
          <div><Input label="Name *" value={form.custName} maxLength={CUSTOMER_FIELD_LIMITS.name} onChange={event => onChange('custName', event.target.value)} error={!!errors.custName} required /><FieldError message={errors.custName} /></div>
          <div><Input label="Mobile" value={form.custMobile} inputMode="numeric" maxLength={10} onChange={event => mobile('custMobile', event.target.value)} error={!!errors.custMobile} /><FieldError message={errors.custMobile} /></div>
          <div><Input label="Mobile 2" value={form.mobile_2} inputMode="numeric" maxLength={10} onChange={event => mobile('mobile_2', event.target.value)} error={!!errors.mobile_2} /><FieldError message={errors.mobile_2} /></div>
          <div><Input label="Email" type="email" value={form.custEmail} maxLength={CUSTOMER_FIELD_LIMITS.email} onChange={event => onChange('custEmail', event.target.value)} error={!!errors.custEmail} /><FieldError message={errors.custEmail} /></div>
          <div><Input label="Company Name" value={form.companyName} maxLength={CUSTOMER_FIELD_LIMITS.companyName} onChange={event => onChange('companyName', event.target.value)} error={!!errors.companyName} /><FieldError message={errors.companyName} /></div>
          <CustomerDateInput label="Date of Birth" value={form.custDob} onChange={value => onChange('custDob', value)} error={errors.custDob} maxDate={latestDob} />
          <CustomerDateInput label="Anniversary Date" value={form.custAnniversaryDt} onChange={value => onChange('custAnniversaryDt', value)} error={errors.custAnniversaryDt} minDate={selectedDob} maxDate={today} />
        </div>
        <div><Input label="Address" value={form.custAddress} maxLength={CUSTOMER_FIELD_LIMITS.address} onChange={event => onChange('custAddress', event.target.value)} error={!!errors.custAddress} /><FieldError message={errors.custAddress} /></div>
        <div><Input label="Comments" value={form.comments} maxLength={CUSTOMER_FIELD_LIMITS.comments} onChange={event => onChange('comments', event.target.value)} error={!!errors.comments} /><FieldError message={errors.comments} /></div>
        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="outline" onClick={onClose} disabled={isPending}>Cancel</Btn>
          <Btn onClick={onSave} disabled={isPending || (isEdit && isUnchanged)}>{isPending ? 'Saving...' : 'Save Customer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}
