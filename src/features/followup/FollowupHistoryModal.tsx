'use client'
import type { ReactNode } from 'react'
import { Modal } from '@/components/ui'
export function FollowupHistoryModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) { return <Modal title={title} open={open} width="max-w-6xl" onClose={onClose}><div className="min-w-0 break-words [overflow-wrap:anywhere] [&_button]:min-h-11">{children}</div></Modal> }
