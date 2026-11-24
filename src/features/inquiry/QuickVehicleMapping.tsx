'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getQuickVehicleMappingOptions, saveQuickVehicleMapping } from './quickVehicleMapping.actions'
import { createMake, createModel, createVariant } from '@/features/catalog/adminActions'

type MappingData = Extract<Awaited<ReturnType<typeof getQuickVehicleMappingOptions>>, { options: unknown }>

export function QuickVehicleMapping({ inquiryId, vehicleDescription }: { inquiryId: number; vehicleDescription?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<MappingData | null>(null)
  const [makeId, setMakeId] = useState('')
  const [modelId, setModelId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [newNames, setNewNames] = useState({ make: '', model: '', variant: '' })
  const [applyToExisting, setApplyToExisting] = useState(true)
  const [success, setSuccess] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const router = useRouter()
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  const load = async () => {
    setOpen(true); setLoading(true); setError(''); setData(null); setSuccess(''); setApplyToExisting(true)
    setMakeId(''); setModelId(''); setVariantId('')
    setNewNames({ make: '', model: '', variant: '' })
    try {
      const result = await getQuickVehicleMappingOptions(inquiryId, vehicleDescription)
      if ('options' in result && result.options) setData(result as MappingData)
      else setError(result.error || 'Could not load vehicle choices.')
    } catch { setError('Could not load vehicle choices. Close and try again.') }
    finally { setLoading(false) }
  }
  const save = async () => {
    setSaving(true); setError('')
    try {
      const result = await saveQuickVehicleMapping(inquiryId, Number(variantId), { description: data?.description, applyToExisting: applyToExisting && Boolean(data?.olderInquiryCount) })
      if (!result.success) { setError(result.error || 'Could not save mapping.'); return }
      setSuccess(`Vehicle mapped and remembered.${result.updatedOlderCount ? ` Also updated ${result.updatedOlderCount} older matching ${result.updatedOlderCount === 1 ? 'inquiry' : 'inquiries'}.` : ''}`)
    } catch { setError('Could not save mapping. Check your connection and try again.') }
    finally { setSaving(false) }
  }
  const options = data?.options ?? []
  const makes = data?.makes ?? []
  const models = (data?.models ?? []).filter(item => String(item.makeId) === makeId)
  const variants = options.filter(item => String(item.makeId) === makeId && String(item.modelId) === modelId)
  const selected = variants.find(item => String(item.variantId) === variantId)
  const selectClass = 'mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100'
  const close = () => { if (saving) return; setOpen(false); if (success) router.refresh() }
  const addCatalog = async (kind: 'make' | 'model' | 'variant') => {
    setSaving(true); setError('')
    try {
      const name = newNames[kind].trim()
      if (!name) { setError(`Enter the ${kind} name.`); return }
      const result = kind === 'make' ? await createMake(name) : kind === 'model' ? await createModel(name, Number(makeId)) : await createVariant(name, Number(makeId), Number(modelId))
      if (!result.success || !result.id) { setError(result.error || `Could not add ${kind}.`); return }
      const refreshed = await getQuickVehicleMappingOptions(inquiryId, vehicleDescription)
      if (!('options' in refreshed) || !refreshed.options) { setError(refreshed.error || 'Added to catalog. Close and reopen to reload choices.'); return }
      setData(refreshed as MappingData)
      if (kind === 'make') { setMakeId(String(result.id)); setModelId(''); setVariantId('') }
      if (kind === 'model') { setModelId(String(result.id)); setVariantId('') }
      if (kind === 'variant') setVariantId(String(result.id))
      setNewNames(names => ({ ...names, [kind]: '' }))
    } catch { setError('Could not add catalog entry. Try again.') }
    finally { setSaving(false) }
  }
  const newEntry = (kind: 'make' | 'model' | 'variant') => <div className="flex flex-wrap items-end gap-2 rounded-lg bg-blue-50 p-3">
    <label htmlFor={`${id}-new-${kind}`} className="min-w-0 flex-1 text-sm font-medium">New {kind} name<input id={`${id}-new-${kind}`} maxLength={200} value={newNames[kind]} disabled={saving} onChange={event => setNewNames(names => ({ ...names, [kind]: event.target.value }))} className={selectClass} /></label>
    <button type="button" disabled={saving || !newNames[kind].trim()} onClick={() => addCatalog(kind)} className="min-h-11 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-40">Add {kind}</button>
  </div>
  return <div className="mt-2">
    <span className="block text-xs font-medium text-amber-800">Needs vehicle mapping</span>
    <button type="button" onClick={load} aria-haspopup="dialog" className="mt-1 min-h-10 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">Map vehicle</button>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); close() }} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }} onClick={event => { if (event.target === event.currentTarget) close() }} className="m-auto max-h-[85vh] w-[92vw] max-w-lg overflow-y-auto rounded-xl border-0 bg-white p-5 text-left text-gray-900 shadow-2xl backdrop:bg-black/40">
      <h2 id={`${id}-title`} className="text-lg font-semibold">Map CarDekho vehicle</h2>
      {success ? <p role="status" className="my-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">{success}</p> : loading ? <p role="status" className="py-6">Loading vehicle choices…</p> : data ? <>
        <div className="my-4 rounded-lg bg-blue-50 p-3 text-sm"><span className="block text-xs text-gray-500">Saved CarDekho vehicle description</span><strong>{data.description}</strong></div>
        <div className="space-y-3">
          <label htmlFor={`${id}-make`} className="block text-sm font-medium">Make<select id={`${id}-make`} value={makeId} disabled={saving} onChange={event => { setMakeId(event.target.value); setModelId(''); setVariantId('') }} className={selectClass}><option value="">Select make</option>{makes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}{data.canCreateCatalog ? <option value="__new__">+ Add a missing make</option> : null}</select></label>
          {makeId === '__new__' ? newEntry('make') : null}
          <label htmlFor={`${id}-model`} className="block text-sm font-medium">Model<select id={`${id}-model`} value={modelId} disabled={!makeId || makeId === '__new__' || saving} onChange={event => { setModelId(event.target.value); setVariantId('') }} className={selectClass}><option value="">Select model</option>{models.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}{data.canCreateCatalog ? <option value="__new__">+ Add a missing model</option> : null}</select></label>
          {modelId === '__new__' ? newEntry('model') : null}
          <label htmlFor={`${id}-variant`} className="block text-sm font-medium">Variant<select id={`${id}-variant`} value={variantId} disabled={!modelId || modelId === '__new__' || saving} onChange={event => setVariantId(event.target.value)} className={selectClass}><option value="">Select variant</option>{variants.map(item => <option key={item.variantId} value={item.variantId}>{item.variant}</option>)}{data.canCreateCatalog ? <option value="__new__">+ Add a missing variant</option> : null}</select></label>
          {variantId === '__new__' ? newEntry('variant') : null}
          {!data.canCreateCatalog ? <p className="text-xs text-gray-500">Missing a catalog entry? A user with Vehicle Masters access can add it here.</p> : null}
        </div>
        {selected ? <p className="mt-3 text-sm font-semibold text-blue-900">{selected.make} · {selected.model} · {selected.variant}</p> : null}
        <p className="mt-4 text-sm leading-6 text-gray-600">Save once to update this inquiry and automatically map future CarDekho leads with the same vehicle description. The original text is preserved.</p>
        {data.olderInquiryCount > 0 ? <label className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm"><input type="checkbox" checked={applyToExisting} disabled={saving} onChange={event => setApplyToExisting(event.target.checked)} className="mt-1" /><span>Also update {data.olderInquiryCount} older matching {data.olderInquiryCount === 1 ? 'inquiry' : 'inquiries'}.<span className="block text-xs text-gray-600">Only unmapped vehicles you can access. Existing mappings are kept.</span></span></label> : null}
      </> : null}
      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-lg border px-4 py-2 text-sm">{success ? 'Done' : 'Cancel'}</button>{!success ? <button type="button" onClick={save} disabled={!selected || saving || loading} className="min-h-11 rounded-lg bg-[#1B2A6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save & remember mapping'}</button> : null}</div>
    </dialog>
  </div>
}
