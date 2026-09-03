'use client'

import { Input } from '@/components/ui'

export function DateFilterInput({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <Input label={label} type="date" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} />
}
