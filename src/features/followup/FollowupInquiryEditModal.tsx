'use client'
import type { ReactNode } from 'react'
import { Modal } from '@/components/ui'
export function FollowupInquiryEditModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) { return <Modal title={title} open={open} onClose={onClose}>{children}</Modal> }
