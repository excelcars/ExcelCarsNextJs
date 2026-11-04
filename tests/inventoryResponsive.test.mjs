import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import * as jsxRuntime from 'react/jsx-runtime'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../src/features/inventory/InventoryMobileCard.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const compiledModule = { exports: {} }
runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
  if (name === 'react/jsx-runtime') return jsxRuntime
  if (name === 'lucide-react') return Object.fromEntries(['Eye', 'Pencil', 'Images', 'Video', 'FileText', 'Link2', 'Mail', 'Trash2'].map(icon => [icon, icon]))
  throw new Error(`Unexpected import: ${name}`)
} })
const { InventoryMobileCard } = compiledModule.exports
function nodes(element) {
  if (!element || typeof element !== 'object') return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}
const row = {
  inventoryId: 42, inventoryNumber: 'INV/42', registrationNo: 'MH00AB1234',
  makeLegacy: 'Legacy make', modelLegacy: 'Legacy model', variantLegacy: 'Legacy variant',
  carVariantMaster: null, price: '1250000', kmsDriven: '0', noOfOwners: 0, isCarRegistered: true,
  _count: { inventoryPhotos: 12, inventoryVideos: 2, inventoryDocuments: 3 },
  ownedBy: 'Sample owner', emailIdOwnedBy: 'sample@example.test',
  customer: { custName: 'Linked customer', custMobile: '0000000000', custEmail: 'customer@example.test' },
  otherRemarks: 'Full public notes', internalComments: 'Full internal notes',
}
function setup(vehicle = row) {
  const calls = []
  const handlers = Object.fromEntries(['onView', 'onEdit', 'onInquirySync', 'onPhotos', 'onVideos', 'onDocuments', 'onEmail', 'onDelete', 'onSelectionChange'].map(name => [name, (...args) => calls.push({ name, args })]))
  return { calls, tree: InventoryMobileCard({ row: vehicle, position: 26, selectionMode: true, selectedInventoryIds: [42], ...handlers }) }
}

test('all mobile vehicle actions target the correct inventory record', () => {
  const { tree, calls } = setup()
  const buttons = nodes(tree).filter(node => node.type === 'button')
  assert.equal(buttons.length, 8)
  for (const button of buttons) button.props.onClick()
  assert.deepEqual(calls.map(call => call.name), ['onView', 'onEdit', 'onInquirySync', 'onPhotos', 'onVideos', 'onDocuments', 'onEmail', 'onDelete'])
  assert.ok(calls.slice(0, 7).every(call => call.args[0] === row))
  assert.equal(calls[7].args[0], 42)
  const checkbox = nodes(tree).find(node => node.type === 'input')
  assert.equal(checkbox.props.checked, true)
  checkbox.props.onChange({ target: { checked: false } })
  assert.deepEqual(calls.at(-1), { name: 'onSelectionChange', args: [42, false] })
})

test('mobile vehicle details retain contacts, zero values, full remarks, and media counts', () => {
  const { tree } = setup()
  const all = nodes(tree)
  const fields = all.filter(node => node.props?.items).flatMap(node => node.props.items)
  for (const [label, expected] of [['No. of owners', 0], ['KM driven', '0'], ['Owner email', 'sample@example.test'], ['Customer', 'Linked customer'], ['Remarks', 'Full public notes'], ['Internal remarks', 'Full internal notes']]) {
    assert.equal(fields.find(([key]) => key === label)?.[1], expected)
  }
  for (const label of ['Photos (12)', 'Videos (2)', 'Internal documents (3)']) {
    assert.ok(all.some(node => node.type === 'span' && node.props.children === label))
  }
  assert.ok(all.some(node => node.type === 'h2' && node.props.children === 'Legacy make Legacy model'))
})

test('catalog names take precedence while missing registration stays unknown', () => {
  const { tree } = setup({ ...row, registrationNo: null, isCarRegistered: null, carVariantMaster: { variant: 'Current variant', carMakeMaster: { make: 'Current make' }, carModelMaster: { model: 'Current model' } } })
  assert.ok(nodes(tree).some(node => node.type === 'h2' && node.props.children === 'Current make Current model'))
  assert.ok(!nodes(tree).some(node => node.props?.children === 'Not registered'))
})
