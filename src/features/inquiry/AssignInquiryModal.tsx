'use client'

import { Btn, Modal, Select } from '@/components/ui'

type User = { userId: number; userName: string | null; displayName: string | null }
type Row = { inquiryId: number; inquiryNo: string | null; customerNameLegacy: string | null; assignedToUser?: User | null; customer?: { custName: string } | null }

export function AssignInquiryModal({ row, users, value, error, pending, userLabel, onChange, onClose, onSave }: { row: Row | null; users: User[]; value: string; error: string; pending: boolean; userLabel: (user: User | null | undefined) => string; onChange: (value: string) => void; onClose: () => void; onSave: () => void }) {
  return <Modal title={row ? `Assign Inquiry — ${row.inquiryNo ?? `Inquiry #${row.inquiryId}`}` : 'Assign Inquiry'} open={!!row} onClose={onClose}>{row ? <div className="space-y-4"><div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"><div><span className="font-medium text-gray-900">Customer:</span> {row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div><span className="font-medium text-gray-900">Current Assignee:</span> {userLabel(row.assignedToUser)}</div></div><Select label="Assign To" value={value} onChange={e => onChange(e.target.value)} disabled={pending}><option value="">Unassigned</option>{users.map(user => <option key={user.userId} value={user.userId}>{userLabel(user)}</option>)}</Select>{users.length === 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No active InquiryAssistant users are available for assignment.</div> : null}{error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}<div className="flex justify-end gap-3"><Btn variant="outline" onClick={onClose} disabled={pending}>Cancel</Btn><Btn onClick={onSave} disabled={pending}>{pending ? 'Saving...' : 'Save Assignment'}</Btn></div></div> : null}</Modal>
}
