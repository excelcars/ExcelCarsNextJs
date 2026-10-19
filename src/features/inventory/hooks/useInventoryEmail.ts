import { useState } from 'react'
import type { Dealer, CustomerOption, EmailProgressItem, EmailRecipient, InventoryRow } from '../inventoryTypes'

export function useInventoryEmail() {
  const [emailRow, setEmailRow] = useState<InventoryRow | null>(null)
  const [emailRows, setEmailRows] = useState<InventoryRow[]>([])
  const [recipientType, setRecipientType] = useState<'dealer' | 'customer'>('customer')
  const [dealerQuery, setDealerQuery] = useState('')
  const [dealerOpen, setDealerOpen] = useState(false)
  const [emailSelectedDealer, setEmailSelectedDealer] = useState<Dealer | null>(null)
  const [emailSelectedCustomer, setEmailSelectedCustomer] = useState<CustomerOption | null>(null)
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([])
  const [editingRecipientEmailKey, setEditingRecipientEmailKey] = useState<string | null>(null)
  const [recipientEmailDraft, setRecipientEmailDraft] = useState('')
  const [recipientEmailError, setRecipientEmailError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSentMessage, setEmailSentMessage] = useState<string | null>(null)
  const [emailProgress, setEmailProgress] = useState<EmailProgressItem[]>([])
  const [isEmailSending, setIsEmailSending] = useState(false)

  return {
    emailRow, setEmailRow, emailRows, setEmailRows, recipientType, setRecipientType,
    dealerQuery, setDealerQuery, dealerOpen, setDealerOpen, emailSelectedDealer,
    setEmailSelectedDealer, emailSelectedCustomer, setEmailSelectedCustomer,
    emailRecipients, setEmailRecipients, editingRecipientEmailKey,
    setEditingRecipientEmailKey, recipientEmailDraft, setRecipientEmailDraft,
    recipientEmailError, setRecipientEmailError, emailError, setEmailError,
    emailSentMessage, setEmailSentMessage, emailProgress, setEmailProgress,
    isEmailSending, setIsEmailSending,
  }
}
