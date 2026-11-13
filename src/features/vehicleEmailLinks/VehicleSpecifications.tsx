import { CalendarDays, CarFront, FileText, Fuel, Gauge, Palette, ReceiptText, ShieldCheck, Wrench, type LucideIcon, UsersRound } from 'lucide-react'

type Specification = [label: string, value: string]

type SpecificationGroup = 'highlights' | 'ownership' | 'performance'

const iconByLabel: Record<string, LucideIcon> = {
  Registration: FileText,
  'No. of Owners': UsersRound,
  Colour: Palette,
  Status: ShieldCheck,
  'Insurance Type': ShieldCheck,
  'Road Tax': ReceiptText,
  'Month of Manufacture': CalendarDays,
  'Service History': Wrench,
  'Fuel Type': Fuel,
  'KM Driven': Gauge,
  'Year of Manufacture': CalendarDays,
  'Model / Variant': CarFront,
}

export function VehicleSpecifications({ highlights, ownership, performance }: Record<SpecificationGroup, Specification[]>) {
  const specifications = [...highlights, ...ownership, ...performance]

  return (
    <section className="rounded-2xl border border-[#e4e9f2] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <h2 className="text-xl font-bold tracking-tight text-[#101b38]">Vehicle Specifications</h2>
      <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {specifications.map(([label, value]) => {
          const Icon = iconByLabel[label] ?? CarFront
          return (
            <div key={label} className="flex min-w-0 items-start gap-3 rounded-xl border border-[#edf0f5] bg-[#f7f8fc] p-3 sm:p-4">
              <Icon className="mt-0.5 hidden h-5 w-5 shrink-0 text-[#d7194a] sm:block" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-medium leading-5 text-gray-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold leading-5 text-gray-900">{value || '—'}</dd>
              </div>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
