import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as jsxRuntime from 'react/jsx-runtime'

function load(name, imports = {}, extension = 'tsx') {
  const compiled = ts.transpileModule(readFileSync(new URL(`../src/features/messagetemplates/${name}.${extension}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const compiledModule = { exports: {} }
  const dependencies = { 'react/jsx-runtime': jsxRuntime, ...imports }
  runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => { assert.ok(name in dependencies, `Unexpected import: ${name}`); return dependencies[name] } })
  return compiledModule.exports
}
function nodes(element) {
  if (!element || typeof element !== 'object') return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}
const presentation = load('templatePresentation', {}, 'ts')

test('template summaries show readable text while keeping the stored HTML intact', () => {
  const html = '<p>Hello&nbsp;<strong>customer</strong> &amp; team</p><ul><li>Test drive</li></ul>'
  assert.equal(presentation.emailBodyToText(html), 'Hello customer & team • Test drive')
  assert.equal(presentation.emailBodyToText(null), '—')
})

test('template actions target the selected template and only email rows offer Send', () => {
  const { TemplateActions } = load('EmailTemplatesList', { 'lucide-react': { Pencil: 'Pencil', Trash2: 'Trash2', Send: 'Send', Paperclip: 'Paperclip', History: 'History' }, '@/components/ui': { Badge: 'Badge', Table: 'Table' }, './templatePresentation': presentation })
  const row = { typeId: 42, messageType: 'Email', messageSubject: 'Subject', messageBody: '<b>Body</b>' }
  const calls = []
  const actions = { onSend: value => calls.push(['send', value]), onEdit: value => calls.push(['edit', value]), onAttachments: value => calls.push(['attachments', value]), onHistory: value => calls.push(['history', value]), onDelete: value => calls.push(['delete', value]) }
  const tree = TemplateActions({ row, mobile: true, ...actions })
  for (const button of nodes(tree).filter(node => node.type === 'button')) button.props.onClick()
  assert.deepEqual(calls, [['send', row], ['edit', row], ['attachments', row], ['history', row], ['delete', 42]])
  assert.ok(!nodes(TemplateActions({ row: { ...row, messageType: 'SMS' }, ...actions })).some(node => node.props?.['aria-label'] === 'Send email'))
})

test('template fields preserve HTML and forward subject and body changes', () => {
  const { EmailTemplateFields } = load('EmailTemplateFields', { '@/components/ui': { Input: 'Input', Select: 'Select' }, './RichTextEditor': { RichTextEditor: 'Editor' } })
  const html = '<table style="width:900px"><tr><td>Original content</td></tr></table>'
  const calls = []
  const tree = EmailTemplateFields({ form: { messageType: 'Email', messageSubject: 'Subject', messageBody: html }, messageTypes: ['Email'], errors: {}, onChange: (field, value) => calls.push([field, value]) })
  const editor = nodes(tree).find(node => node.type === 'Editor')
  assert.equal(editor.props.value, html)
  nodes(tree).find(node => node.type === 'Input').props.onChange({ target: { value: 'New subject' } })
  editor.props.onChange('<p>New body</p>')
  assert.deepEqual(calls, [['messageSubject', 'New subject'], ['messageBody', '<p>New body</p>']])
})

test('recipient selection distinguishes groups sharing the same ID', () => {
  const { TemplateRecipients } = load('TemplateRecipients', { 'lucide-react': { X: 'X' }, '@/components/ui': { Input: 'Input', Select: 'Select' } })
  const customer = { group: 'Customers', id: 1, name: 'Customer', email: 'customer@example.test' }
  const dealer = { group: 'Dealers', id: 1, name: 'Dealer', email: 'dealer@example.test' }
  const toggles = []
  const tree = TemplateRecipients({ groups: ['Customers', 'Dealers'], group: 'Dealers', query: '', rows: [customer, dealer], selected: [customer], searching: false, error: '', onToggle: value => toggles.push(value) })
  const inputs = nodes(tree).filter(node => node.type === 'input')
  assert.deepEqual(inputs.map(node => node.props.checked), [true, false])
  inputs[1].props.onChange()
  nodes(tree).find(node => node.props?.['aria-label'] === 'Remove Customer').props.onClick()
  assert.deepEqual(toggles, [dealer, customer])
})

test('email preview retains its sandbox and original body and attachment metadata', () => {
  const { EmailPreview } = load('EmailPreview')
  const html = '<p style="color:red">Original preview</p>'
  const tree = EmailPreview({ subject: 'Subject', body: html, recipientCount: 2, hasSelectedRecipients: true, attachmentNames: ['long-file-name.pdf'] })
  const iframe = nodes(tree).find(node => node.type === 'iframe')
  assert.equal(iframe.props.sandbox, '')
  assert.equal(iframe.props.srcDoc, html)
  assert.ok(nodes(tree).some(node => node.props?.children?.includes?.('long-file-name.pdf')))
})

test('attachment removal and delivery history retain full filenames, addresses, and errors', () => {
  const { TemplateAttachmentFiles } = load('TemplateAttachmentFiles')
  const calls = []
  const filename = 'full-vehicle-service-history-and-specifications.pdf'
  const files = TemplateAttachmentFiles({ files: [{ uploadId: '42', originalName: filename, byteSize: 2048 }], onRemove: value => calls.push(value) })
  nodes(files).find(node => node.type === 'button').props.onClick()
  assert.deepEqual(calls, ['42'])
  const { EmailDeliveryHistory } = load('EmailDeliveryHistory')
  const history = EmailDeliveryHistory({ rows: [{ deliveryLogId: 1, recipientEmail: 'long-recipient-address@example.test', status: 'Failed', errorMessage: 'Full error details', attachmentCount: 1, attemptedAt: '2026-11-04T08:00:00Z' }], error: '' })
  assert.ok(nodes(history).some(node => node.props?.children === 'long-recipient-address@example.test'))
  assert.ok(nodes(history).some(node => node.props?.children === 'Full error details'))
})
