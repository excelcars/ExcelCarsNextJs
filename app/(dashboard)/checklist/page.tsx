import { listChecklists, getVehicles } from '@/features/checklist/queries'
import { ChecklistClient } from '@/features/checklist/ChecklistClient'

export default async function ChecklistPage() {
  const [checklists, vehicles] = await Promise.all([listChecklists(), getVehicles()])

  return <ChecklistClient initialData={checklists} vehicles={vehicles} />
}
