'use client'
import type { ReactNode } from 'react'
import { Modal } from '@/components/ui'
export function FollowupInquiryEditModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) { return <Modal title={title} open={open} onClose={onClose} width="max-w-6xl"><div className="min-w-0 break-words [overflow-wrap:anywhere] [&_input]:min-w-0 [&_input]:w-full [&_input]:min-h-11 [&_button]:min-h-11 [&_textarea]:min-w-0">{children}</div></Modal> }
