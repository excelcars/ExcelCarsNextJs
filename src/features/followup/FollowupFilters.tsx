'use client'

import { Input, SearchBar, Select } from '@/components/ui'
import { VehicleFilterSelects } from '@/components/VehicleFilterSelects'
import { DateFilterInput } from '@/components/DateFilterInput'
import type { InquirySourceOption } from '@/features/inquiry/sourceMaster'

type UserOption = {
  userId: number
  userName: string | null
  displayName: string | null
  empId?: number | null
  employee?: {
    empId: number
    empFirstName: string | null
    empLastName: string | null
  } | null
}

type CarMakeMaster = { pkMakeId: number; make: string | null }
type CarModelMaster = { pkModelId: number; model: string | null }
type CarVariantMaster = { pkVariantId: number; variant: string | null }

type FollowupFiltersProps = {
  search: string
  status: string
  contactOutcome: string
  customerName: string
  subStatus: string
  website: string
  customerMobile: string
  userId: string
  makeId: string
  modelId: string
  variantId: string
  classification: string
  inquiryDateFrom: string
  inquiryDateTo: string
  followUpDateFrom: string
  followUpDateTo: string
  visitedDateFrom: string
  visitedDateTo: string
  restricted: boolean
  currentUserId: string
  isRoutePending: boolean
  statuses: readonly string[]
  classifications: readonly string[]
  contactOutcomes: readonly { value: string; title: string }[]
  sourceOptions: InquirySourceOption[]
  users: UserOption[]
  makes: CarMakeMaster[]
  models: CarModelMaster[]
  variants: CarVariantMaster[]
  userLabel: (user: UserOption) => string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onContactOutcomeChange: (value: string) => void
  onCustomerNameChange: (value: string) => void
  onSubStatusChange: (value: string) => void
  onWebsiteChange: (value: string) => void
  onCustomerMobileChange: (value: string) => void
  onUserIdChange: (value: string) => void
  onClassificationChange: (value: string) => void
  onMakeChange: (value: string) => void
  onModelChange: (value: string) => void
  onVariantChange: (value: string) => void
  onInquiryDateFromChange: (value: string) => void
  onInquiryDateToChange: (value: string) => void
  onFollowUpDateFromChange: (value: string) => void
  onFollowUpDateToChange: (value: string) => void
  onVisitedDateFromChange: (value: string) => void
  onVisitedDateToChange: (value: string) => void
}

export function FollowupFilters({
  search,
  status,
  contactOutcome,
  customerName,
  subStatus,
  website,
  customerMobile,
  userId,
  makeId,
  modelId,
  variantId,
  classification,
  inquiryDateFrom,
  inquiryDateTo,
  followUpDateFrom,
  followUpDateTo,
  visitedDateFrom,
  visitedDateTo,
  restricted,
  currentUserId,
  isRoutePending,
  statuses,
  classifications,
  contactOutcomes,
  sourceOptions,
  users,
  makes,
  models,
  variants,
  userLabel,
  onSearchChange,
  onStatusChange,
  onContactOutcomeChange,
  onCustomerNameChange,
  onSubStatusChange,
  onWebsiteChange,
  onCustomerMobileChange,
  onUserIdChange,
  onClassificationChange,
  onMakeChange,
  onModelChange,
  onVariantChange,
  onInquiryDateFromChange,
  onInquiryDateToChange,
  onFollowUpDateFromChange,
  onFollowUpDateToChange,
  onVisitedDateFromChange,
  onVisitedDateToChange,
}: FollowupFiltersProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Customer, mobile, source, vehicle..." disabled={isRoutePending} />
        <Select value={status} onChange={e => onStatusChange(e.target.value)} disabled={isRoutePending} className="min-w-[160px]">
          {statuses.map(option => <option key={option} value={option}>{option === 'FollowUp' ? 'Follow-up Only' : option}</option>)}
          <option value="All">All Status</option>
        </Select>
        <Select value={contactOutcome} onChange={e => onContactOutcomeChange(e.target.value)} disabled={isRoutePending} className="min-w-[210px]">
          <option value="">All reached outcomes</option>
          {contactOutcomes.map(option => <option key={option.value} value={option.value}>{option.title}</option>)}
        </Select>
        <Input value={customerName} onChange={e => onCustomerNameChange(e.target.value)} placeholder="Customer name..." disabled={isRoutePending} className="min-w-[220px]" />
        <Input value={subStatus} onChange={e => onSubStatusChange(e.target.value)} placeholder="Filter sub-status..." disabled={isRoutePending} className="min-w-[220px]" />
        <Select value={website} onChange={e => onWebsiteChange(e.target.value)} disabled={isRoutePending} className="min-w-[220px]">
          <option value="">All Sources</option>
          {sourceOptions.map(item => <option key={item.code} value={item.code}>{item.displayName}</option>)}
        </Select>
        <Input value={customerMobile} onChange={e => onCustomerMobileChange(e.target.value)} placeholder="Customer mobile..." disabled={isRoutePending} className="min-w-[200px]" />
        <Select value={restricted ? currentUserId : userId} onChange={e => onUserIdChange(e.target.value)} disabled={isRoutePending || restricted} className="min-w-[200px]">
          <option value="">{restricted ? 'My Inquiries Only' : 'All Users'}</option>
          {users.map(item => <option key={item.userId} value={String(item.userId)}>{userLabel(item)}</option>)}
        </Select>
        <VehicleFilterSelects makeId={makeId} modelId={modelId} variantId={variantId} makes={makes} models={models} variants={variants} disabled={isRoutePending} className="min-w-[180px]" onMakeChange={onMakeChange} onModelChange={onModelChange} onVariantChange={onVariantChange} />
        <div className="flex flex-wrap gap-1.5">
          {['All', ...classifications].map(value => (
            <button key={value} onClick={() => onClassificationChange(value)} disabled={isRoutePending}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${classification === value ? 'text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              style={classification === value ? { backgroundColor: '#C8102E' } : {}}>
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DateFilterInput label="Inquiry Date From" value={inquiryDateFrom} onChange={onInquiryDateFromChange} disabled={isRoutePending} />
        <DateFilterInput label="Inquiry Date To" value={inquiryDateTo} onChange={onInquiryDateToChange} disabled={isRoutePending} />
        <DateFilterInput label="Follow-up Date From" value={followUpDateFrom} onChange={onFollowUpDateFromChange} disabled={isRoutePending} />
        <DateFilterInput label="Follow-up Date To" value={followUpDateTo} onChange={onFollowUpDateToChange} disabled={isRoutePending} />
        <DateFilterInput label="Visited Date From" value={visitedDateFrom} onChange={onVisitedDateFromChange} disabled={isRoutePending} />
        <DateFilterInput label="Visited Date To" value={visitedDateTo} onChange={onVisitedDateToChange} disabled={isRoutePending} />
      </div>
    </>
  )
}
