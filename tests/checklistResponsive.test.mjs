import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as jsxRuntime from 'react/jsx-runtime'

function load(name, imports = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(`../src/features/checklist/${name}.tsx`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const compiledModule = { exports: {} }
  const dependencies = { 'react/jsx-runtime': jsxRuntime, ...imports }
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

test('document editor updates and removes the intended row, with distinct control names', () => {
  const Editor = load('ChecklistDocumentsEditor', { 'lucide-react': { Trash2: 'Trash2' }, '@/components/ui': { Input: 'Input' }, './ChecklistYesNoToggle': { ChecklistYesNoToggle: 'YesNo' }, './ChecklistDocumentTypeToggle': { ChecklistDocumentTypeToggle: 'DocType' } })
  const changes = []
  const removals = []
  const tree = Editor({ docs: [0, 1].map(index => ({ documentName: `Document ${index}`, applicable: 'Yes', received: 'No', originalCopy: 'Original' })), suggestions: [], onChange: (index, values) => changes.push([index, values]), onRemove: index => removals.push(index) })
  const rows = nodes(tree).filter(node => node.type === 'fieldset')
  const second = nodes(rows[1])
  second.find(node => node.type === 'Input').props.onChange({ target: { value: 'Insurance' } })
  const switches = second.filter(node => node.type === 'YesNo')
  switches[0].props.onChange('No')
  switches[1].props.onChange('Yes')
  second.find(node => node.type === 'DocType').props.onChange('Copy')
  second.find(node => node.type === 'button').props.onClick()
  assert.equal(JSON.stringify(changes), JSON.stringify([[1, { documentName: 'Insurance' }], [1, { applicable: 'No' }], [1, { received: 'Yes' }], [1, { originalCopy: 'Copy' }]]))
  assert.deepEqual(removals, [1])
  assert.deepEqual(switches.map(node => node.props.ariaLabel), ['Document 2 applicable', 'Document 2 received'])
})

test('legacy applicability is shown as enabled and toggles off in one tap', () => {
  const Toggle = load('ChecklistYesNoToggle')
  const changes = []
  const tree = Toggle({ value: 'Applicable', ariaLabel: 'RC applicable', onChange: value => changes.push(value) })
  const button = nodes(tree).find(node => node.type === 'button')
  assert.equal(button.props['aria-checked'], true)
  assert.equal(button.props['aria-label'], 'RC applicable')
  button.props.onClick()
  assert.deepEqual(changes, ['No'])
})

test('mobile checklist status uses applicable documents and keeps each action on its record', () => {
  const Cards = load('ChecklistMobileCards', { 'lucide-react': { Eye: 'Eye', Pencil: 'Pencil', Trash2: 'Trash2' } })
  for (const [applicable, received, status] of [[0, 0, 'Partial'], [3, 2, 'Partial'], [3, 3, 'Complete']]) {
    const row = { documentId: 42, registrationNo: 'MH00AB1234', applicableCount: applicable, receivedApplicableCount: received, receivedCount: 4, documentCount: 5 }
    const calls = []
    const tree = Cards({ data: [row], pending: false, onView: value => calls.push(value), onEdit: value => calls.push(value), onDelete: value => calls.push(value) })
    assert.ok(nodes(tree).some(node => node.type === 'span' && node.props.children === status))
    for (const button of nodes(tree).filter(node => node.type === 'button')) button.props.onClick()
    assert.deepEqual(calls, [row, row, 42])
  }
})

test('read-only document cards retain the complete name and all document states', () => {
  const List = load('ChecklistDocumentsList')
  const name = 'Authorised Signatory Letter on Company Letter Head (In case of Company Vehicle)'
  const tree = List({ documents: [{ checklistDetailsId: 1, documentName: name, applicable: 'Applicable', received: 'Yes', originalCopy: 'Copy' }] })
  const card = nodes(tree).find(node => node.type === 'article')
  assert.ok(nodes(card).some(node => node.type === 'h4' && node.props.children === name))
  assert.deepEqual(nodes(card).filter(node => node.type === 'dd').map(node => node.props.children), ['Applicable', 'Yes', 'Copy'])
  assert.ok(nodes(List({ documents: [] })).some(node => node.props?.children === 'No documents found.'))
})
