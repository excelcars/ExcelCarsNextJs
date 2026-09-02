type VehicleTextFilters = {
  legacyMake: string
  legacyModel: string
  legacyVariant: string
}

type CarTextCondition = {
  OR: Array<Record<string, unknown>>
}

// Keeps old free-text vehicle records searchable while also matching normalized catalog links.
export function buildVehicleTextFilter(filters: VehicleTextFilters) {
  const make = filters.legacyMake.trim()
  const model = filters.legacyModel.trim()
  const variant = filters.legacyVariant.trim()
  const conditions: CarTextCondition[] = []

  if (make) {
    conditions.push({
      OR: [
        { makeLegacy: { contains: make, mode: 'insensitive' } },
        { carVariantMaster: { carMakeMaster: { make: { contains: make, mode: 'insensitive' } } } },
      ],
    })
  }

  if (model) {
    conditions.push({
      OR: [
        { modelLegacy: { contains: model, mode: 'insensitive' } },
        { carVariantMaster: { carModelMaster: { model: { contains: model, mode: 'insensitive' } } } },
      ],
    })
  }

  if (variant) {
    conditions.push({
      OR: [
        { variantLegacy: { contains: variant, mode: 'insensitive' } },
        { subVariant: { contains: variant, mode: 'insensitive' } },
        { carVariantMaster: { variant: { contains: variant, mode: 'insensitive' } } },
      ],
    })
  }

  if (conditions.length === 0) return null

  return {
    inquiryCarDetails: {
      some: { AND: conditions },
    },
  }
}
