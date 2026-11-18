import { cleanCatalogName } from '../../lib/catalogNames.ts'

export type PartnerCatalogVariant = {
  pkVariantId: number
  variant: string | null
  carMakeMaster: { pkMakeId: number; make: string | null } | null
  carModelMaster: { pkModelId: number; fkMakeId: number | null; model: string | null } | null
}

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function partnerVehicleKey(value: string) {
  return words(value).replace(/ /g, '')
}

function makeNames(make: string) {
  if (['maruti', 'maruti suzuki', 'suzuki'].includes(words(make))) return ['Maruti', 'Maruti Suzuki', 'Suzuki']
  if (['mercedes', 'mercedes benz'].includes(words(make))) return ['Mercedes', 'Mercedes Benz']
  return [make]
}

export function partnerVehicleSelection(row: PartnerCatalogVariant) {
  const make = cleanCatalogName(row.carMakeMaster?.make)
  const model = cleanCatalogName(row.carModelMaster?.model)
  const variant = cleanCatalogName(row.variant)
  if (!make || !model || !variant || words(variant) === 'select' ||
    row.carModelMaster?.fkMakeId !== row.carMakeMaster?.pkMakeId) return null
  return { fkVariantId: row.pkVariantId, makeLegacy: make, modelLegacy: model, variantLegacy: variant }
}

/** Match a complete MMV, never a shorter variant or a guessed trim. */
export function matchPartnerVehicle(description: string, catalog: PartnerCatalogVariant[]) {
  const input = words(description)
  if (!input) return null
  const candidates = catalog.flatMap(row => {
    const selection = partnerVehicleSelection(row)
    return selection ? [{ row, selection, labels: makeNames(selection.makeLegacy).map(make => words(`${make} ${selection.modelLegacy} ${selection.variantLegacy}`)) }] : []
  })
  const exact = candidates.filter(({ labels }) => labels.includes(input))
  const matches = exact.length ? exact : candidates.filter(({ labels }) => labels.some(label => partnerVehicleKey(label) === partnerVehicleKey(input)))
  if (!matches.length) return null
  // Duplicate spelling/spacing rows are equivalent only within the same make/model IDs.
  const identities = new Set(matches.map(({ row }) => JSON.stringify([
    row.carMakeMaster!.pkMakeId, row.carModelMaster!.pkModelId, partnerVehicleKey(row.variant!),
  ])))
  if (identities.size !== 1) return null
  return matches.sort((a, b) => a.row.pkVariantId - b.row.pkVariantId)[0].selection
}
