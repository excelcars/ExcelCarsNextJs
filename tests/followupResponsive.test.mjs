import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as jsxRuntime from 'react/jsx-runtime'

function load(name, imports = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../src/features/followup/${name}.tsx`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const dependencies = { 'react/jsx-runtime': jsxRuntime, ...imports }
  const compiledModule = { exports: {} }
  runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
    assert.ok(name in dependencies, `Unexpected import: ${name}`)
    return dependencies[name]
  } })
  return compiledModule.exports[name]
}
function nodes(element) {
  if (!element || typeof element !== 'object') return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}
const formatters = { formatListDate: value => value || '', formatListMoney: value => `₹${value}` }
const CardList = load('FollowupMobileCards', { '@/components/ui': { Badge: 'Badge' }, '@/lib/listFormatters': formatters })
const row = { inquiryId: 42, inquiryNo: 'INQ/42', customerNameLegacy: 'Legacy customer', customer: { custName: 'Linked customer', custMobile: '0000000000', custEmail: 'linked@example.test' }, classification: 'Hot', status: 'FollowUp', subStatus: 'Negotiation', followUpDate: '2000-01-01', remark: 'Full remark', inquiryCarDetails: [{ carVariantMaster: null, makeLegacy: 'Legacy make', modelLegacy: 'Legacy model', variantLegacy: 'Legacy variant', year: 2024 }], followupInquiry: [{ contactOutcome: 'no_answer' }] }

test('mobile follow-up actions target the same row and inquiry as desktop', () => {
  const calls = []
  const tree = CardList({ rows: [row], page: 2, pageSize: 25, onLogFollowup: value => calls.push(value), onViewFollowup: value => calls.push(value), onEditInquiry: value => calls.push(value) })
  const all = nodes(tree)
  assert.ok(all.some(node => node.type === 'h2' && node.props.children === 'Linked customer'))
  assert.ok(all.some(node => node.type === 'p' && node.props.children === '0000000000'))
  assert.ok(all.some(node => node.type === 'p' && node.props.children === 'Legacy make · Legacy model · Legacy variant · 2024'))
  assert.ok(all.some(node => node.type === 'dd' && node.props.children === 'No answer'))
  for (const button of all.filter(node => node.type === 'button')) button.props.onClick()
  assert.deepEqual(calls, [row, 42, 42])
})

test('active mobile cards retain the supplied inline editor and save/cancel callbacks', () => {
  const calls = []
  const inline = { classification: jsxRuntime.jsx('select', { 'aria-label': 'Classification' }), followup: jsxRuntime.jsx('input', { type: 'date' }), remark: jsxRuntime.jsx('textarea', {}), actions: [jsxRuntime.jsx('button', { onClick: () => calls.push('save'), children: 'Save' }), jsxRuntime.jsx('button', { onClick: () => calls.push('cancel'), children: 'Cancel' })] }
  const tree = CardList({ rows: [row], page: 1, pageSize: 25, renderInlineCells: value => { assert.equal(value, row); return inline }, onLogFollowup: () => assert.fail('Editor is already active'), onViewFollowup() {}, onEditInquiry() {} })
  const all = nodes(tree)
  for (const element of [inline.classification, inline.followup, inline.remark, ...inline.actions]) assert.ok(all.includes(element))
  assert.ok(!all.some(node => node.type === 'button' && node.props.children === 'Update follow-up'))
  for (const button of inline.actions) button.props.onClick()
  assert.deepEqual(calls, ['save', 'cancel'])
})

test('mobile history preserves entry dates, scheduled dates, friendly status, and full notes', () => {
  const History = load('FollowupHistoryList')
  const comment = 'Full note with a long customer request. '.repeat(10)
  const tree = History({ history: [{ pkFollowupId: 1, createdDt: '2026-10-01', followupDate: '2026-11-01', followupStatus: 'FollowUp', followupSubStatus: 'Negotiation', comments: comment }], formatDate: value => value, formatStatus: (status, subStatus) => `${status}: ${subStatus}`, cleanRemark: value => value })
  const card = nodes(tree).find(node => node.type === 'article')
  assert.deepEqual(nodes(card).filter(node => node.type === 'dd').map(node => node.props.children), ['2026-10-01', '2026-11-01', comment])
  assert.ok(nodes(card).some(node => node.type === 'h3' && node.props.children.includes('FollowUp: Negotiation')))
  assert.ok(nodes(History({ history: [] })).some(node => node.props?.children === 'No follow-up history recorded yet.'))
})

test('restricted user filters keep their current-user scope and busy controls stay disabled', () => {
  const Filters = load('FollowupFilters', { '@/components/ui': { Input: 'Input', SearchBar: 'SearchBar' }, '@/components/FormDropdown': { FormDropdown: 'Dropdown' }, '@/components/VehicleFilterSelects': { VehicleFilterSelects: 'VehicleFilters' }, '@/components/DateFilterInput': { DateFilterInput: 'DateFilter' }, '@/lib/listFormatters': { formatIndianNumberInput: value => value, normalizeIntegerInput: value => value } })
  const tree = Filters({ restricted: true, currentUserId: '42', userId: '7', isRoutePending: true, statuses: ['Open', 'FollowUp', 'Closed'], classifications: ['Hot', 'Warm', 'Cold'], classification: 'Hot', status: 'FollowUp', users: [], sourceOptions: [], contactOutcomes: [], userLabel: () => '' })
  const userFilter = nodes(tree).find(node => node.props?.placeholder === 'My Inquiries Only')
  assert.equal(userFilter.props.value, '42')
  assert.equal(userFilter.props.disabled, true)
  assert.ok(nodes(tree).filter(node => node.type === 'button').every(node => node.props.disabled))
  assert.equal(nodes(tree).find(node => node.type === 'button' && node.props.children === 'Hot').props['aria-pressed'], true)
})
