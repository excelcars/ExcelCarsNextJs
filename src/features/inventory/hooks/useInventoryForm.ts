import { useState } from 'react'
import type { InventoryFormInput } from '../actions'
import type { CarMakeMaster, CarModelMaster, CarVariantMaster, CustomerOption, Dealer } from '../inventoryTypes'
import { getInventorySku } from '../actions'
import { createMake, createModel, createVariant } from '@/features/catalog/adminActions'

export function useInventoryForm(initialForm: InventoryFormInput, options: { makes: CarMakeMaster[]; dealers: Dealer[] }) {
  const [form, setForm] = useState<InventoryFormInput>(initialForm)
  const [editId, setEditId] = useState<number | null>(null)
  const [originalStatus, setOriginalStatus] = useState<string | null>(null)
  const [currentInventoryNumber, setCurrentInventoryNumber] = useState<string | null>(null)
  const [currentSku, setCurrentSku] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [catalogMakeText, setCatalogMakeText] = useState('')
  const [catalogModelText, setCatalogModelText] = useState('')
  const [catalogVariantText, setCatalogVariantText] = useState('')
  const [catalogAddType, setCatalogAddType] = useState<'make' | 'model' | 'variant' | null>(null)
  const [catalogAddValue, setCatalogAddValue] = useState('')
  const [catalogAddError, setCatalogAddError] = useState('')
  const [catalogAddPending, setCatalogAddPending] = useState(false)
  const [models, setModels] = useState<CarModelMaster[]>([])
  const [variants, setVariants] = useState<CarVariantMaster[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)

  const fieldChange = <K extends keyof InventoryFormInput>(key: K, value: InventoryFormInput[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'colour') {
      const make = options.makes.find(item => item.pkMakeId === selectedMakeId)?.make ?? form.makeLegacy
      const model = models.find(item => item.pkModelId === selectedModelId)?.model ?? form.modelLegacy
      void getInventorySku(make ?? '', model ?? '', String(value)).then(sku => setCurrentSku(sku || null))
    }
  }
  const onOwnerTypeChange = (value: string) => {
    fieldChange('ownedType', value)
    if (value === 'Excel Cars') fieldChange('ownedBy', 'Excel Cars')
    else { fieldChange('ownedBy', ''); fieldChange('mobileNoOwnedBy', ''); fieldChange('emailIdOwnedBy', '') }
  }
  const onDealerChange = (value: string) => {
    const dealer = options.dealers.find(item => item.dealerName?.trim().toLowerCase() === value.trim().toLowerCase())
    fieldChange('ownedBy', value); fieldChange('mobileNoOwnedBy', dealer?.dealerMobileNo ?? ''); fieldChange('emailIdOwnedBy', dealer?.dealerEmail ?? '')
  }
  const onCatalogMakeChange = async (value: string) => {
    setCatalogMakeText(value); setCatalogModelText(''); setCatalogVariantText(''); setSelectedModelId(null); setVariants([]); setForm(prev => ({ ...prev, fkVariantId: null }))
    const match = options.makes.find(item => item.make?.trim().toLowerCase() === value.trim().toLowerCase())
    setSelectedMakeId(match?.pkMakeId ?? null)
    if (match) setModels(await (await fetch(`/api/catalog/models?makeId=${match.pkMakeId}`)).json()); else setModels([])
  }
  const onCatalogModelChange = async (value: string) => {
    setCatalogModelText(value); setCatalogVariantText(''); setForm(prev => ({ ...prev, fkVariantId: null }))
    const match = models.find(item => item.model?.trim().toLowerCase() === value.trim().toLowerCase())
    setSelectedModelId(match?.pkModelId ?? null)
    if (match) setVariants(await (await fetch(`/api/catalog/variants?modelId=${match.pkModelId}`)).json()); else setVariants([])
  }
  const onCustomerChange = (customer: CustomerOption | null) => {
    setSelectedCustomer(customer)
    setForm(prev => ({ ...prev, customerId: customer?.custId ?? null, customerName: customer?.custName ?? '' }))
  }

  const addCatalogValue = async () => {
    if (!catalogAddType || !catalogAddValue.trim()) return
    setCatalogAddPending(true)
    setCatalogAddError('')
    try {
      if (catalogAddType === 'make') {
        const result = await createMake(catalogAddValue)
        if (!result.success || !result.id) throw new Error(result.error ?? 'Could not add make.')
        setCatalogMakeText(catalogAddValue.trim()); setSelectedMakeId(result.id); setCatalogModelText(''); setCatalogVariantText(''); setSelectedModelId(null); setVariants([]); setForm(prev => ({ ...prev, fkVariantId: null }))
        setModels(await (await fetch(`/api/catalog/models?makeId=${result.id}`)).json())
      } else if (catalogAddType === 'model') {
        if (!selectedMakeId) throw new Error('Add or select a Make first.')
        const result = await createModel(catalogAddValue, selectedMakeId)
        if (!result.success || !result.id) throw new Error(result.error ?? 'Could not add model.')
        setCatalogModelText(catalogAddValue.trim()); setSelectedModelId(result.id); setCatalogVariantText(''); setVariants([]); setForm(prev => ({ ...prev, fkVariantId: null }))
        setVariants(await (await fetch(`/api/catalog/variants?modelId=${result.id}`)).json())
      } else {
        if (!selectedMakeId || !selectedModelId) throw new Error('Add or select a Make and Model first.')
        const result = await createVariant(catalogAddValue, selectedMakeId, selectedModelId)
        const variantId = result.id
        if (!result.success || !variantId) throw new Error(result.error ?? 'Could not add variant.')
        setCatalogVariantText(catalogAddValue.trim()); setForm(prev => ({ ...prev, fkVariantId: variantId })); setVariants(prev => [...prev, { pkVariantId: variantId, variant: catalogAddValue.trim() }])
      }
      setCatalogAddType(null)
    } catch (err) {
      setCatalogAddError(err instanceof Error ? err.message : 'Could not add catalog value.')
    } finally {
      setCatalogAddPending(false)
    }
  }

  return {
    formState: {
      form, editId, originalStatus, currentInventoryNumber, currentSku,
      error, errors, selectedCustomer,
    },
    catalogState: {
      selectedMakeId, selectedModelId, catalogMakeText, catalogModelText,
      catalogVariantText, catalogAddType, catalogAddValue, catalogAddError,
      catalogAddPending, models, variants,
    },
    actions: {
      setForm, setEditId, setOriginalStatus, setCurrentInventoryNumber, setCurrentSku,
      setError, setErrors, setSelectedCustomer, setSelectedMakeId, setSelectedModelId,
      setCatalogMakeText, setCatalogModelText, setCatalogVariantText, setCatalogAddType,
      setCatalogAddValue, setCatalogAddError, setCatalogAddPending, setModels, setVariants,
      fieldChange, onOwnerTypeChange, onDealerChange, onCatalogMakeChange, onCatalogModelChange, onCustomerChange, addCatalogValue,
    },
  }
}
