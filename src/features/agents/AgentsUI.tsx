'use client'

import { ChevronLeft, ChevronRight, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { Btn, Input, SearchBar, Table } from '@/components/ui'
import { FormDropdown } from '@/components/FormDropdown'
import type { AgentFormInput } from './adminActions'
import { AGENT_TYPES } from './constants'

export interface AgentRow {
  partnerId: number
  partnerType: string
  name: string
  mobile: string | null
  email: string | null
}

export function AgentsHeader({ total, onAdd }: { total: number; onAdd: () => void }) {
  return <header className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div><h1 className="text-xl font-bold text-gray-900">Agents</h1><p className="mt-0.5 text-sm text-gray-500">{total.toLocaleString('en-IN')} agents</p></div>
    <Btn size="sm" onClick={onAdd} className="min-h-11 w-full justify-center sm:w-auto"><Plus aria-hidden="true" className="h-4 w-4 shrink-0" />Add Agent</Btn>
  </header>
}

export function AgentsFilters({ search, type, onSearch, onType }: { search: string; type: string; onSearch: (value: string) => void; onType: (value: string) => void }) {
  return <section aria-label="Agent filters" className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
    <div className="min-w-0 lg:w-80 [&_input]:min-h-11 [&_input]:text-base sm:[&_input]:text-sm"><SearchBar value={search} onChange={onSearch} placeholder="Name, mobile, email..." /></div>
    <div role="group" aria-label="Agent type" className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {['All', ...AGENT_TYPES].map(agentType => <button key={agentType} type="button" aria-pressed={type === agentType} onClick={() => onType(agentType)}
        className={`min-h-11 min-w-0 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2A6B] ${agentType === 'All' ? 'col-span-2 sm:col-span-1' : ''} ${type === agentType ? 'border-[#1B2A6B] bg-[#1B2A6B] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{agentType}</button>)}
    </div>
  </section>
}

type AgentsListProps = { rows: AgentRow[]; onEdit: (row: AgentRow) => void; onDelete: (id: number) => void }

export function AgentsList({ rows, onEdit, onDelete }: AgentsListProps) {
  return <>
    <div className="grid min-w-0 gap-3 md:grid-cols-2 lg:hidden">
      {rows.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 md:col-span-2">No records found</div> : rows.map(row => <article key={row.partnerId} aria-labelledby={`agent-${row.partnerId}`} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
        <span className="inline-block max-w-full rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-[#1B2A6B]">{row.partnerType}</span>
        <h2 id={`agent-${row.partnerId}`} className="mt-2 text-lg font-semibold text-gray-900">{row.name}</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="flex items-center gap-2 text-xs text-gray-500"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />Mobile</dt><dd className="mt-1 font-mono text-gray-800">{row.mobile || '—'}</dd></div>
          <div><dt className="flex items-center gap-2 text-xs text-gray-500"><Mail aria-hidden="true" className="h-4 w-4 shrink-0" />Email</dt><dd className="mt-1 text-gray-800">{row.email || '—'}</dd></div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Btn variant="outline" onClick={() => onEdit(row)} className="min-h-11 min-w-0 justify-center"><Pencil aria-hidden="true" className="h-4 w-4 shrink-0" />Edit</Btn>
          <Btn variant="outline" onClick={() => onDelete(row.partnerId)} className="min-h-11 min-w-0 justify-center border-red-200 text-red-600 hover:bg-red-50"><Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" />Delete</Btn>
        </div>
      </article>)}
    </div>
    <div className="hidden lg:block">
      <Table headers={['Agent', 'Agent Type', 'Mobile', 'Email', 'Actions']} minWidthClass="min-w-[760px]" empty={rows.length === 0}>
        {rows.map(row => <tr key={row.partnerId} className="transition hover:bg-gray-50">
          <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
          <td className="px-4 py-3 text-sm text-gray-700">{row.partnerType}</td>
          <td className="px-4 py-3"><div className="flex items-center gap-2 font-mono text-sm text-gray-700"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />{row.mobile ?? '—'}</div></td>
          <td className="px-4 py-3"><div className="flex min-w-0 items-center gap-2 text-sm text-gray-600"><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span className="break-all">{row.email ?? '—'}</span></div></td>
          <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-1">
            <button type="button" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)} className="flex min-h-11 min-w-11 items-center justify-center rounded text-gray-500 transition hover:bg-blue-50 hover:text-[#1B2A6B]"><Pencil aria-hidden="true" className="h-4 w-4" /></button>
            <button type="button" aria-label={`Delete ${row.name}`} onClick={() => onDelete(row.partnerId)} className="flex min-h-11 min-w-11 items-center justify-center rounded text-gray-500 transition hover:bg-red-50 hover:text-red-600"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
          </div></td>
        </tr>)}
      </Table>
    </div>
  </>
}

export function AgentsPagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (value: number) => void }) {
  if (pageCount <= 1) return null
  return <nav aria-label="Agent pagination" className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div aria-live="polite" className="text-center text-sm text-gray-500">Page {page} of {pageCount}</div>
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Btn variant="outline" size="sm" className="min-h-11 justify-center" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Previous</Btn>
      <Btn variant="outline" size="sm" className="min-h-11 justify-center" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next<ChevronRight aria-hidden="true" className="h-4 w-4" /></Btn>
    </div>
  </nav>
}

export function AgentFormFields({ form, errors, onChange }: { form: AgentFormInput; errors: Partial<Record<keyof AgentFormInput, string>>; onChange: <K extends keyof AgentFormInput>(key: K, value: AgentFormInput[K]) => void }) {
  return <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:max-w-full [&_input]:text-base sm:[&_input]:text-sm [&_button]:min-h-11 [&_button]:text-base sm:[&_button]:text-sm">
    <FormDropdown label="Type" value={form.partnerType} options={AGENT_TYPES.map(value => ({ value, label: value }))} placeholder="Select type" onChange={value => onChange('partnerType', value)} />
    <Input label="Name *" value={form.name} onChange={e => onChange('name', e.target.value)} error={!!errors.name} errorMessage={errors.name} />
    <Input label="Mobile" type="tel" value={form.mobile} inputMode="numeric" maxLength={10} onChange={e => onChange('mobile', e.target.value.replace(/\D/g, ''))} error={!!errors.mobile} errorMessage={errors.mobile} />
    <Input label="Email" type="email" value={form.email} onChange={e => onChange('email', e.target.value)} error={!!errors.email} errorMessage={errors.email} />
  </div>
}
