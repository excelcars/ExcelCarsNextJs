'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Btn, Input, Select, Modal, Table, PageHeader, SearchBar, ConfirmDialog } from '@/components/ui'
import { createMake, updateMake, deleteMake, createModel, createVariant } from './adminActions'

type Make = { pkMakeId: number; make: string | null }
type ModelSummary = { pkModelId: number; model: string | null; _count: { carVariantMaster: number }; carVariantMaster: { variant: string | null }[] }
type MakeSummary = Make & { _count: { carModelMaster: number; carVariantMaster: number }; carModelMaster: ModelSummary[] }
type ModelOption = { pkModelId: number; model: string | null; fkMakeId: number | null }
type VariantOption = { pkVariantId: number; variant: string | null }

export function CatalogClient({ initialData, total, page, pageCount, search, makes }: { initialData: MakeSummary[]; total: number; page: number; pageCount: number; search: string; makes: Make[] }) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(search)
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')
  const [selectedMakeId, setSelectedMakeId] = useState(0)
  const [selectedModelId, setSelectedModelId] = useState(0)
  const [models, setModels] = useState<ModelOption[]>([])
  const [variants, setVariants] = useState<VariantOption[]>([])
  const [newMake, setNewMake] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newVariant, setNewVariant] = useState('')
  const [addingMake, setAddingMake] = useState(false)
  const [addingModel, setAddingModel] = useState(false)
  const [addingVariant, setAddingVariant] = useState(false)
  const [editMakeId, setEditMakeId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushQuery = (nextSearch: string, nextPage: number) => {
    const params = new URLSearchParams()
    if (nextSearch) params.set('search', nextSearch)
    if (nextPage > 1) params.set('page', String(nextPage))
    router.push(`/config/catalog${params.toString() ? `?${params}` : ''}`)
  }
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchInput === search) return
    debounceRef.current = setTimeout(() => pushQuery(searchInput, 1), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])
  useEffect(() => {
    if (!selectedMakeId) { setModels([]); setVariants([]); return }
    fetch(`/api/catalog/models?makeId=${selectedMakeId}`).then(res => res.json()).then(data => setModels(Array.isArray(data) ? data : []))
  }, [selectedMakeId])
  useEffect(() => {
    if (!selectedModelId) { setVariants([]); return }
    fetch(`/api/catalog/variants?modelId=${selectedModelId}`).then(res => res.json()).then(data => setVariants(Array.isArray(data) ? data : []))
  }, [selectedModelId])

  const openAdd = () => { setEditMakeId(null); setName(''); setSelectedMakeId(0); setSelectedModelId(0); setNewMake(''); setNewModel(''); setNewVariant(''); setAddingMake(false); setAddingModel(false); setAddingVariant(false); setError(''); setModal(true) }
  const openEditMake = (row: MakeSummary) => { setEditMakeId(row.pkMakeId); setName(row.make ?? ''); setError(''); setModal(true) }
  const add = (kind: 'make' | 'model' | 'variant') => startTransition(async () => {
    const result = kind === 'make' ? await createMake(newMake) : kind === 'model' ? await createModel(newModel, selectedMakeId) : await createVariant(newVariant, selectedMakeId, selectedModelId)
    if (!result.success) { setError(result.error ?? 'Something went wrong.'); return }
    if (kind === 'make') { setNewMake(''); setAddingMake(false); if (result.id) setSelectedMakeId(result.id); setSelectedModelId(0) }
    if (kind === 'model') { setNewModel(''); setAddingModel(false); if (result.id) setSelectedModelId(result.id) }
    if (kind === 'variant') { setNewVariant(''); setAddingVariant(false) }
    router.refresh()
  })
  const saveMake = () => startTransition(async () => { const result = await updateMake(editMakeId!, name); if (!result.success) { setError(result.error ?? 'Something went wrong.'); return } setModal(false); router.refresh() })
  const del = () => { if (!deleteId) return; startTransition(async () => { const result = await deleteMake(deleteId); if (!result.success) setError(result.error ?? 'Could not delete this record.'); setDeleteId(null); router.refresh() }) }
  const addControl = (kind: 'make' | 'model' | 'variant', enabled = true) => <div className="mt-2">{!({ make: addingMake, model: addingModel, variant: addingVariant }[kind]) ? <button type="button" onClick={() => kind === 'make' ? setAddingMake(true) : kind === 'model' ? setAddingModel(true) : setAddingVariant(true)} disabled={!enabled} className="text-xs font-medium text-[#1B2A6B] disabled:text-gray-300">+ Add new {kind}</button> : <div className="flex gap-2"><Input label="" placeholder={`New ${kind} name`} value={kind === 'make' ? newMake : kind === 'model' ? newModel : newVariant} onChange={e => kind === 'make' ? setNewMake(e.target.value) : kind === 'model' ? setNewModel(e.target.value) : setNewVariant(e.target.value)} /><Btn size="sm" onClick={() => add(kind)} disabled={isPending}>Add</Btn></div>}</div>

  return <div><PageHeader title="Vehicle Masters" subtitle={`${total.toLocaleString('en-IN')} makes`} action={<Btn size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Add Vehicle Master</Btn>} />
    <div className="mb-4"><SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search make, model, variant..." /></div>
    <Table headers={['Make', 'Model', 'Variant', 'Actions']} empty={initialData.length === 0}>{initialData.map(row => <tr key={row.pkMakeId} className="hover:bg-gray-50 transition"><td className="px-4 py-3 font-medium text-gray-900 align-top">{row.make ?? '—'}</td><td className="px-4 py-3 text-sm text-gray-600 align-top">{row.carModelMaster.length ? <>{row.carModelMaster.map(model => model.model ?? '—').join(', ')}{row._count.carModelMaster > row.carModelMaster.length && <span className="font-medium text-[#1B2A6B]"> +{row._count.carModelMaster - row.carModelMaster.length}</span>}</> : '—'}</td><td className="px-4 py-3 text-sm text-gray-600 align-top">{row.carModelMaster.length ? row.carModelMaster.map(model => <div key={model.pkModelId}>{model.carVariantMaster.map(variant => variant.variant ?? '—').join(', ') || '—'}{model._count.carVariantMaster > model.carVariantMaster.length && <span className="font-medium text-[#1B2A6B]"> +{model._count.carVariantMaster - model.carVariantMaster.length}</span>}</div>) : '—'}</td><td className="px-4 py-3 align-top"><button onClick={() => openEditMake(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => setDeleteId(row.pkMakeId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</Table>
    {pageCount > 1 && <div className="flex items-center justify-between mt-4"><div className="text-xs text-gray-500">Page {page} of {pageCount}</div><div className="flex gap-1.5"><Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => pushQuery(search, page - 1)}><ChevronLeft className="w-3.5 h-3.5" />Prev</Btn><Btn variant="outline" size="sm" disabled={page >= pageCount} onClick={() => pushQuery(search, page + 1)}>Next<ChevronRight className="w-3.5 h-3.5" /></Btn></div></div>}
    <Modal title={editMakeId ? 'Edit Make' : 'Add Vehicle Master'} open={modal} onClose={() => setModal(false)}><div className="space-y-4">{editMakeId ? <Input label="Make *" value={name} onChange={e => setName(e.target.value)} /> : <><div><Select label="Make" value={selectedMakeId} onChange={e => { setSelectedMakeId(Number(e.target.value)); setSelectedModelId(0) }}><option value={0}>Select existing make</option>{makes.map(make => <option key={make.pkMakeId} value={make.pkMakeId}>{make.make}</option>)}</Select>{addControl('make')}</div>{selectedMakeId > 0 && <div><Select label="Model" value={selectedModelId} onChange={e => setSelectedModelId(Number(e.target.value))}><option value={0}>Select existing model</option>{models.map(model => <option key={model.pkModelId} value={model.pkModelId}>{model.model}</option>)}</Select>{addControl('model')}</div>}{selectedModelId > 0 && <div><Select label="Variant" value={0} onChange={() => undefined}><option value={0}>{variants.length ? 'Select existing variant' : 'No variants yet'}</option>{variants.map(variant => <option key={variant.pkVariantId} value={variant.pkVariantId}>{variant.variant}</option>)}</Select>{addControl('variant')}</div>}</>}{error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}<div className="flex gap-3 justify-end pt-2"><Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>{editMakeId && <Btn onClick={saveMake} disabled={isPending}>{isPending ? 'Saving...' : 'Save Make'}</Btn>}{!editMakeId && <Btn variant="outline" onClick={() => setModal(false)}>Done</Btn>}</div></div></Modal>
    <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del} message="Delete this make? This cannot be undone." />
  </div>
}
