'use client'

import type { ReactNode } from 'react'
import { Modal } from '@/components/ui'

export function InquiryFormModal({ editing, open, onClose, children }: { editing: boolean; open: boolean; onClose: () => void; children: ReactNode }) {
  return <Modal title={editing ? 'Edit Inquiry' : 'New Inquiry'} open={open} width="max-w-6xl" onClose={onClose}>{children}</Modal>
}
