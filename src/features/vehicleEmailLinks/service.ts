import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import {
  getInventoryPhotoPublicUrl,
  classifyVehicleEmailVisit,
  getPublicVehicleContactEmail,
  getPublicVehiclePhoneNumber,
  getPublicVehicleWhatsAppNumber,
  hashVehicleEmailToken,
  maskRegistrationNumber,
} from '@/lib/vehicleEmailLinks'

export interface VehicleRequestContext {
  userAgent?: string | null
  referrer?: string | null
  ipAddress?: string | null
}

export async function resolveTrackedVehicleByToken(rawToken: string) {
  const tokenHash = hashVehicleEmailToken(rawToken)
  const link = await prisma.vehicleEmailLink.findUnique({
    where: { tokenHash },
    include: {
      inventoryManagement: {
        include: {
          carVariantMaster: {
            include: { carMakeMaster: true, carModelMaster: true },
          },
          inventoryPhotos: {
            orderBy: { documentId: 'desc' },
          },
        },
      },
    },
  })

  if (!link || !link.isActive) return null
  if (link.expiresAt && link.expiresAt < new Date()) return null
  if (!link.inventoryManagement) return null

  return link
}

export async function recordTrackedVehicleVisit(vehicleEmailLinkId: number, requestContext: VehicleRequestContext = {}) {
  const userAgent = requestContext.userAgent ?? null
  const referrer = requestContext.referrer ?? null
  const ipAddress = requestContext.ipAddress ?? null
  const visitKind = classifyVehicleEmailVisit(userAgent)
  const now = new Date()
  const isHuman = visitKind === 'human'

  await prisma.$transaction([
    prisma.vehicleEmailLinkVisit.create({
      data: {
        vehicleEmailLink: { connect: { vehicleEmailLinkId } },
        visitedAt: now,
        visitKind,
        userAgent: userAgent ?? null,
        ipAddress,
        referrer,
      },
    }),
    prisma.$executeRaw`
      UPDATE "vehicle_email_links"
      SET
        "request_count" = "request_count" + 1,
        "last_requested_at" = ${now},
        "first_requested_at" = COALESCE("first_requested_at", ${now}),
        "human_view_count" = "human_view_count" + CASE WHEN ${isHuman} THEN 1 ELSE 0 END,
        "first_human_view_at" = CASE
          WHEN ${isHuman} THEN COALESCE("first_human_view_at", ${now})
          ELSE "first_human_view_at"
        END
      WHERE "vehicle_email_link_id" = ${vehicleEmailLinkId}
    `,
  ])

  return { visitKind }
}

export async function recordTrackedVehicleInteraction(
  rawToken: string,
  interactionType: string,
  interactionLabel?: string | null,
  requestContext: VehicleRequestContext = {},
) {
  const tokenHash = hashVehicleEmailToken(rawToken)
  const userAgent = requestContext.userAgent ?? null
  const referrer = requestContext.referrer ?? null
  const ipAddress = requestContext.ipAddress ?? null

  const link = await prisma.vehicleEmailLink.findUnique({
    where: { tokenHash },
    select: { vehicleEmailLinkId: true, isActive: true, expiresAt: true },
  })

  if (!link || !link.isActive) return { ok: false as const, reason: 'inactive' }
  if (link.expiresAt && link.expiresAt < new Date()) return { ok: false as const, reason: 'expired' }

  await prisma.vehicleEmailLinkInteraction.create({
    data: {
      vehicleEmailLink: { connect: { vehicleEmailLinkId: link.vehicleEmailLinkId } },
      interactionType,
      interactionLabel: interactionLabel ?? null,
      userAgent: userAgent ?? null,
      ipAddress,
      referrer,
    },
  })

  return { ok: true as const }
}

export function buildPublicVehicleViewModel(
  trackedLink: NonNullable<Awaited<ReturnType<typeof resolveTrackedVehicleByToken>>>,
) {
  const vehicle = trackedLink.inventoryManagement
  const make = vehicle.carVariantMaster?.carMakeMaster?.make ?? vehicle.makeLegacy ?? ''
  const model = vehicle.carVariantMaster?.carModelMaster?.model ?? vehicle.modelLegacy ?? ''
  const variant = vehicle.carVariantMaster?.variant ?? vehicle.variantLegacy ?? ''
  const gallery = vehicle.inventoryPhotos
    .map(photo => {
      const src = getInventoryPhotoPublicUrl(photo.path)
      if (!src) return null
      return {
      documentId: photo.documentId,
      src,
      alt: `${make} ${model} ${variant}`.trim() || 'Vehicle photo',
      }
    })
    .filter((photo): photo is { documentId: number; src: string; alt: string } => Boolean(photo))

  return {
    make,
    model,
    variant,
    heading: [vehicle.year ? String(vehicle.year) : '', make, model].filter(Boolean).join(' ').trim(),
    subheading: variant || [make, model].filter(Boolean).join(' '),
    status: vehicle.status ?? 'Available',
    price: vehicle.price ? Number(vehicle.price).toLocaleString('en-IN') : null,
    kmsDriven: vehicle.kmsDriven ? Number(vehicle.kmsDriven).toLocaleString('en-IN') : null,
    fuelType: vehicle.fuelType ?? '—',
    noOfOwners: vehicle.noOfOwners,
    colour: vehicle.colour ?? '—',
    year: vehicle.year,
    month: vehicle.month ?? '—',
    insuranceType: vehicle.insuranceType ?? '—',
    tax: vehicle.tax ?? '—',
    maskedRegistrationNo: maskRegistrationNumber(vehicle.registrationNo),
    gallery,
    hasGallery: gallery.length > 0,
    phoneNumber: getPublicVehiclePhoneNumber(),
    whatsappNumber: getPublicVehicleWhatsAppNumber(),
    contactEmail: getPublicVehicleContactEmail(),
    inventoryNumber: vehicle.inventoryNumber ?? null,
    canEnquire: !trackedLink.inquiryId,
  }
}

export function getTrackedVehicleEmailSummarySelect() {
  return {
    vehicleEmailLinkId: true,
    recipientEmail: true,
    recipientName: true,
    emailSentAt: true,
    firstRequestedAt: true,
    firstHumanViewAt: true,
    lastRequestedAt: true,
    requestCount: true,
    humanViewCount: true,
    isActive: true,
  } satisfies Prisma.VehicleEmailLinkSelect
}

export function summarizeVehicleEmailInteractions(
  interactions: Array<{
    interactionType: string
    interactionAt: Date | string
  }>,
) {
  const summary = {
    callClickCount: 0,
    whatsappClickCount: 0,
    emailClickCount: 0,
    firstInteractionAt: null as Date | string | null,
    lastInteractionAt: null as Date | string | null,
  }

  for (const interaction of interactions) {
    if (!summary.firstInteractionAt || new Date(interaction.interactionAt) < new Date(summary.firstInteractionAt)) {
      summary.firstInteractionAt = interaction.interactionAt
    }
    if (!summary.lastInteractionAt || new Date(interaction.interactionAt) > new Date(summary.lastInteractionAt)) {
      summary.lastInteractionAt = interaction.interactionAt
    }

    if (interaction.interactionType === 'call_click') summary.callClickCount += 1
    if (interaction.interactionType === 'whatsapp_click') summary.whatsappClickCount += 1
    if (interaction.interactionType === 'email_click') summary.emailClickCount += 1
  }

  return summary
}
