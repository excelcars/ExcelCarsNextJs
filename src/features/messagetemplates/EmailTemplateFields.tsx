import { Input, Select } from '@/components/ui'
import { RichTextEditor } from './RichTextEditor'
import type { TemplateFormInput } from './actions'

export function EmailTemplateFields({ form, messageTypes, errors, onChange }: {
  form: TemplateFormInput
  messageTypes: readonly string[]
  errors: Record<string, string>
  onChange: <K extends keyof TemplateFormInput>(field: K, value: TemplateFormInput[K]) => void
}) {
  return <div className="min-w-0 space-y-4 [&_input]:min-h-11 [&_input]:min-w-0 [&_select]:min-h-11 [&_select]:min-w-0">
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [&>div]:min-w-0">
      <Select aria-label="Template type" label="Type" value={form.messageType} onChange={event => onChange('messageType', event.target.value)}>{messageTypes.map(type => <option key={type}>{type}</option>)}</Select>
      <Input aria-label="Template subject" label="Subject *" value={form.messageSubject} onChange={event => onChange('messageSubject', event.target.value)} error={!!errors.messageSubject} errorMessage={errors.messageSubject} />
    </div>
    <RichTextEditor value={form.messageBody} onChange={value => onChange('messageBody', value)} errorMessage={errors.messageBody} />
  </div>
}
