import { Btn, Input, Modal } from '@/components/ui'
import type { DealerFormInput } from './actions'
import type { DealerFieldErrors } from './types'
import { DealerNameAutocomplete } from './DealerNameAutocomplete'
import { DealerMobileAutocomplete } from './DealerMobileAutocomplete'

export function DealerFormModal({ mode, form, errors, error, pending, hasChanges, onClose, onSave, onChange }: {
  mode: 'add' | 'edit' | null; form: DealerFormInput; errors: DealerFieldErrors; error: string
  pending: boolean; hasChanges: boolean; onClose: () => void; onSave: () => void
  onChange: <K extends keyof DealerFormInput>(key: K, value: DealerFormInput[K]) => void
}) {
  return <Modal title={mode === 'edit' ? 'Edit Dealer' : 'Add Dealer'} open={mode !== null} onClose={onClose}>
    <div className="space-y-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <div><DealerNameAutocomplete value={form.dealerName} onChange={value => onChange('dealerName', value)} error={!!errors.dealerName} />{errors.dealerName && <p className="mt-1 text-xs text-red-600">{errors.dealerName}</p>}</div>
        <div><DealerMobileAutocomplete value={form.dealerMobileNo} onChange={value => onChange('dealerMobileNo', value)} error={!!errors.dealerMobileNo} />{errors.dealerMobileNo && <p className="mt-1 text-xs text-red-600">{errors.dealerMobileNo}</p>}</div>
        <div><Input label="Mobile 2" value={form.dealerMobileNo_2} onChange={e => onChange('dealerMobileNo_2', e.target.value)} inputMode="numeric" maxLength={11} pattern="[0-9]{10,11}" error={!!errors.dealerMobileNo_2} />{errors.dealerMobileNo_2 && <p className="mt-1 text-xs text-red-600">{errors.dealerMobileNo_2}</p>}</div>
        <div><Input label="Email" type="text" inputMode="email" value={form.dealerEmail} onChange={e => onChange('dealerEmail', e.target.value)} error={!!errors.dealerEmail} />{errors.dealerEmail && <p className="mt-1 text-xs text-red-600">{errors.dealerEmail}</p>}</div>
        <Input label="Company Name" value={form.dealerCompanyName} onChange={e => onChange('dealerCompanyName', e.target.value)} />
        <div><Input label="Website" value={form.dealerWebsite} onChange={e => onChange('dealerWebsite', e.target.value)} error={!!errors.dealerWebsite} />{errors.dealerWebsite && <p className="mt-1 text-xs text-red-600">{errors.dealerWebsite}</p>}</div>
      </div>
      <Input label="Address" value={form.dealerAddress} onChange={e => onChange('dealerAddress', e.target.value)} />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap justify-end gap-3 pt-2 [&>button]:min-h-11">
        <Btn variant="outline" onClick={onClose} disabled={pending}>Cancel</Btn>
        <Btn onClick={onSave} disabled={pending || !hasChanges}>{pending ? 'Saving...' : mode === 'edit' && !hasChanges ? 'No changes to save' : 'Save Dealer'}</Btn>
      </div>
    </div>
  </Modal>
}
