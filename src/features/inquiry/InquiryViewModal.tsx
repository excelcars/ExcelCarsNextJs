'use client'
import type { ReactNode } from 'react'
import { Modal } from '@/components/ui'
export function InquiryViewModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) { return <Modal title={title} open={open} width="max-w-6xl" onClose={onClose}><div className="space-y-4">{children}</div></Modal> }
