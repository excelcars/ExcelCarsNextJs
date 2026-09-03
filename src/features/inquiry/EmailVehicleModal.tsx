'use client'
import type { ReactNode } from 'react'
import { Modal } from '@/components/ui'
export function EmailVehicleModal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) { return <Modal title={title} open={open} width="max-w-6xl" onClose={onClose}>{children}</Modal> }
