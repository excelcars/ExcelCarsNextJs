import { listInventory, getMakes, getDealers } from '@/features/inventory/queries'
import { InventoryClient } from '@/features/inventory/InventoryClient'
import { isEmailConfigured } from '@/lib/email/sendMail'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    status?: string
    make?: string
    model?: string
    fuelType?: string
    inventoryNumber?: string
    sku?: string
    registrationNo?: string
    variant?: string
    colour?: string
    year?: string
    month?: string
    noOfOwners?: string
    tax?: string
    isCarRegistered?: string
    kmsMin?: string
    kmsMax?: string
    insuranceType?: string
    priceMin?: string
    priceMax?: string
    ownedType?: string
    ownedBy?: string
    mobileNoOwnedBy?: string
    emailIdOwnedBy?: string
    customerName?: string
    linkedCustomer?: string
    internalComments?: string
    otherRemarks?: string
    page?: string
    pageSize?: string
  }>
}) {
  const sp = await searchParams
  const search = sp.search ?? ''
  const status = sp.status ?? 'All'
  const make = sp.make ?? ''
  const model = sp.model ?? ''
  const fuelType = sp.fuelType ?? ''
  const inventoryNumber = sp.inventoryNumber ?? ''
  const sku = sp.sku ?? ''
  const registrationNo = sp.registrationNo ?? ''
  const variant = sp.variant ?? ''
  const colour = sp.colour ?? ''
  const year = sp.year ?? ''
  const month = sp.month ?? ''
  const noOfOwners = sp.noOfOwners ?? ''
  const tax = sp.tax ?? ''
  const isCarRegistered = sp.isCarRegistered ?? ''
  const kmsMin = sp.kmsMin ?? ''
  const kmsMax = sp.kmsMax ?? ''
  const insuranceType = sp.insuranceType ?? ''
  const priceMin = sp.priceMin ?? ''
  const priceMax = sp.priceMax ?? ''
  const ownedType = sp.ownedType ?? ''
  const ownedBy = sp.ownedBy ?? ''
  const mobileNoOwnedBy = sp.mobileNoOwnedBy ?? ''
  const emailIdOwnedBy = sp.emailIdOwnedBy ?? ''
  const customerName = sp.customerName ?? ''
  const linkedCustomer = sp.linkedCustomer ?? ''
  const internalComments = sp.internalComments ?? ''
  const otherRemarks = sp.otherRemarks ?? ''
  const page = Number(sp.page) || 1
  const pageSize = Number(sp.pageSize) || 25

  const [{ rows, total, pageCount }, makes, dealers] = await Promise.all([
    listInventory({
      search,
      status,
      make,
      model,
      fuelType,
      inventoryNumber,
      sku,
      registrationNo,
      variant,
      colour,
      year,
      month,
      noOfOwners,
      tax,
      isCarRegistered,
      kmsMin,
      kmsMax,
      insuranceType,
      priceMin,
      priceMax,
      ownedType,
      ownedBy,
      mobileNoOwnedBy,
      emailIdOwnedBy,
      customerName,
      linkedCustomer,
      internalComments,
      otherRemarks,
      page,
      pageSize,
    }),
    getMakes(),
    getDealers(),
  ])

  const data = rows.map((r) => ({
    ...r,
    kmsDriven: r.kmsDriven ? r.kmsDriven.toString() : null,
    price: r.price ? r.price.toString() : null,
  }))

  return (
    <InventoryClient
      initialData={data}
      makes={makes}
      dealers={dealers}
      emailConfigured={isEmailConfigured()}
      initialSearch={search}
      initialStatus={status}
      initialMake={make}
      initialModel={model}
      initialFuelType={fuelType}
      initialInventoryNumber={inventoryNumber}
      initialSku={sku}
      initialRegistrationNo={registrationNo}
      initialVariant={variant}
      initialColour={colour}
      initialYear={year}
      initialMonth={month}
      initialNoOfOwners={noOfOwners}
      initialTax={tax}
      initialIsCarRegistered={isCarRegistered}
      initialKmsMin={kmsMin}
      initialKmsMax={kmsMax}
      initialInsuranceType={insuranceType}
      initialPriceMin={priceMin}
      initialPriceMax={priceMax}
      initialOwnedType={ownedType}
      initialOwnedBy={ownedBy}
      initialMobileNoOwnedBy={mobileNoOwnedBy}
      initialEmailIdOwnedBy={emailIdOwnedBy}
      initialCustomerName={customerName}
      initialLinkedCustomer={linkedCustomer}
      initialInternalComments={internalComments}
      initialOtherRemarks={otherRemarks}
      total={total}
      page={page}
      pageCount={pageCount}
      pageSize={pageSize}
    />
  )
}
