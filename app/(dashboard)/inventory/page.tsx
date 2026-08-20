import { listInventory, getMakes, getDealers } from '@/features/inventory/queries'
import { InventoryClient } from '@/features/inventory/InventoryClient'

export default async function InventoryPage() {
  const [rows, makes, dealers] = await Promise.all([
    listInventory('', 'All'),
    getMakes(),
    getDealers(),
  ])

  const data = rows.map((r) => ({
    ...r,
    kmsDriven: r.kmsDriven ? r.kmsDriven.toString() : null,
    price: r.price ? r.price.toString() : null,
  }))

  return <InventoryClient initialData={data} makes={makes} dealers={dealers} />
}
