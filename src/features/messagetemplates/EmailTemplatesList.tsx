import { Pencil, Trash2, Send, Paperclip, History } from 'lucide-react'
import { Badge, Table } from '@/components/ui'
import { emailBodyToText, type TemplateRow } from './templatePresentation'

type Props = {
  rows: TemplateRow[]
  onSend: (row: TemplateRow) => void
  onEdit: (row: TemplateRow) => void
  onAttachments: (row: TemplateRow) => void
  onHistory: (row: TemplateRow) => void
  onDelete: (id: number) => void
}

export function TemplateActions({ row, mobile = false, onSend, onEdit, onAttachments, onHistory, onDelete }: Omit<Props, 'rows'> & { row: TemplateRow; mobile?: boolean }) {
  const actions = [
    ...(row.messageType === 'Email' ? [{ label: 'Send email', icon: Send, click: () => onSend(row), primary: true, danger: false }] : []),
    { label: 'Edit template', icon: Pencil, click: () => onEdit(row), primary: false, danger: false },
    { label: 'Attachments', icon: Paperclip, click: () => onAttachments(row), primary: false, danger: false },
    { label: 'Delivery history', icon: History, click: () => onHistory(row), primary: false, danger: false },
    { label: 'Delete template', icon: Trash2, click: () => onDelete(row.typeId), primary: false, danger: true },
  ]
  return <div className={`grid gap-2 ${mobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
    {actions.map(({ label, icon: Icon, click, primary, danger }) => <button key={label} type="button" title={label} aria-label={label} onClick={click} className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[14px] font-medium transition ${danger ? 'border border-red-200 text-red-600 hover:bg-red-50' : mobile && primary ? 'bg-[#1B2A6B] text-white hover:bg-[#12204f]' : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-[#1B2A6B]'}`}><Icon className="h-4 w-4 shrink-0" />{mobile && <span className="min-w-0 break-words">{label}</span>}</button>)}
  </div>
}

export function EmailTemplatesList({ rows, ...actions }: Props) {
  return <>
    <div aria-label="Email templates" className="grid min-w-0 gap-3 lg:grid-cols-2 xl:hidden">
      {rows.length === 0 ? <p className="col-span-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No records found</p> : rows.map(row => <article key={row.typeId} aria-labelledby={`email-template-${row.typeId}`} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {row.messageType && <Badge label={row.messageType} />}
        <h2 id={`email-template-${row.typeId}`} className="mt-3 break-words [overflow-wrap:anywhere] text-base font-bold text-gray-900">{row.messageSubject || '—'}</h2>
        <p className="mb-4 mt-2 line-clamp-3 break-words [overflow-wrap:anywhere] text-sm leading-6 text-gray-600">{emailBodyToText(row.messageBody)}</p>
        <TemplateActions row={row} mobile {...actions} />
      </article>)}
    </div>
    <div className="hidden xl:block"><Table headers={['Type', 'Subject', 'Body', 'Actions']} empty={rows.length === 0} minWidthClass="min-w-[900px]" columnWidths={['10%', '26%', '44%', '20%']}>
      {rows.map(row => <tr key={row.typeId} className="transition hover:bg-gray-50">
        <td className="px-4 py-3">{row.messageType ? <Badge label={row.messageType} /> : '—'}</td>
        <td className="break-words px-4 py-3 font-medium text-gray-900">{row.messageSubject || '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600"><p className="max-h-12 overflow-hidden leading-5" title={emailBodyToText(row.messageBody)}>{emailBodyToText(row.messageBody)}</p></td>
        <td className="px-4 py-3"><TemplateActions row={row} {...actions} /></td>
      </tr>)}
    </Table></div>
  </>
}
