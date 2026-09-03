import { useState } from 'react'
import type { InventoryFormInput } from '../actions'
import type { CarMakeMaster, Dealer } from '../inventoryTypes'
import { useInventoryEmail } from './useInventoryEmail'
import { useInventoryForm } from './useInventoryForm'
import { useInventoryInquiry } from './useInventoryInquiry'

export function useInventoryController(initialForm: InventoryFormInput, options: { makes: CarMakeMaster[]; dealers: Dealer[] }) {
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'view'>(null)
  const form = useInventoryForm(initialForm, options)
  const email = useInventoryEmail()
  const inquiry = useInventoryInquiry()

  return { modal: { modal, setModal }, form, email, inquiry }
}
