import { useEffect, useRef, useState } from 'react'
import type { InquiryOption, InventoryRow } from '../inventoryTypes'

export function useInventoryInquiry() {
  const [inquiryRow, setInquiryRow] = useState<InventoryRow | null>(null)
  const [inquiryQuery, setInquiryQuery] = useState('')
  const [inquiryMatches, setInquiryMatches] = useState<InquiryOption[]>([])
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryOption | null>(null)
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const inquiryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inquiryRequestRef = useRef(0)

  useEffect(() => {
    if (!inquiryRow) return
    if (inquiryDebounceRef.current) clearTimeout(inquiryDebounceRef.current)
    inquiryDebounceRef.current = setTimeout(async () => {
      const requestId = ++inquiryRequestRef.current
      setInquiryLoading(true)
      setInquiryError('')
      try {
        const res = await fetch(`/api/inventory/inquiries?q=${encodeURIComponent(inquiryQuery)}`)
        const payload = await res.json()
        if (inquiryRequestRef.current !== requestId) return
        if (!res.ok) {
          setInquiryMatches([])
          setInquiryError(payload.error ?? 'Could not load inquiries.')
          return
        }
        setInquiryMatches(payload)
      } catch {
        if (inquiryRequestRef.current !== requestId) return
        setInquiryMatches([])
        setInquiryError('Could not load inquiries.')
      } finally {
        if (inquiryRequestRef.current === requestId) setInquiryLoading(false)
      }
    }, inquiryQuery.trim() ? 250 : 0)
    return () => {
      if (inquiryDebounceRef.current) clearTimeout(inquiryDebounceRef.current)
    }
  }, [inquiryQuery, inquiryRow])

  return {
    state: { inquiryRow, inquiryQuery, inquiryMatches, selectedInquiry, inquiryLoading, inquiryError },
    actions: { setInquiryRow, setInquiryQuery, setInquiryMatches, setSelectedInquiry, setInquiryError },
    invalidateRequests: () => { inquiryRequestRef.current += 1 },
  }
}
