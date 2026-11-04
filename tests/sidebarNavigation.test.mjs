import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as jsxRuntime from 'react/jsx-runtime'

const source = ts.transpileModule(readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function nodes(element) {
  if (!element || typeof element !== 'object') return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  return [element, ...nodes(element.props?.children)]
}

function harness(pathname = '/dashboard', search = '', accessibleRoutes = ['/inventory'], initialState = {}) {
  let state = 0
  const updates = []
  const pushes = []
  const imports = {
    'react/jsx-runtime': jsxRuntime,
    react: { useEffect() {}, useRef: () => ({ current: null }), useTransition: () => [false, fn => fn()],
      useState: initial => { const index = state++; return [index in initialState ? initialState[index] : initial, value => updates.push({ index, value })] } },
    'next/link': { default: 'Link', __esModule: true },
    'next/navigation': { usePathname: () => pathname, useRouter: () => ({ push: href => pushes.push(href) }) },
    'next-auth/react': { useSession: () => ({ data: null }), signOut() {} },
    'lucide-react': Object.fromEntries(['LayoutDashboard', 'ChevronDown', 'ChevronRight', 'Menu', 'LogOut', 'Package', 'BarChart3', 'Wrench', 'UserRound', 'LockKeyhole', 'ChevronUp', 'X'].map(name => [name, name])),
    '@/features/notifications/NotificationBell': { NotificationBell: 'NotificationBell' },
  }
  const compiledModule = { exports: {} }
  runInNewContext(source, { module: compiledModule, exports: compiledModule.exports,
    window: { location: { pathname, search, hash: '' } }, require: name => {
      assert.ok(name in imports, `Unexpected import: ${name}`)
      return imports[name]
    } })
  const tree = compiledModule.exports.Layout({ children: 'Test', accessibleRoutes })
  const dashboard = nodes(tree).find(node => node.type === 'Link' && node.props.href === '/dashboard')
  return { tree, updates, pushes, click: event => dashboard.props.onClick(event) }
}

test('Meta Message Logs highlights its own navigation entry without highlighting the inbox', () => {
  const check = harness('/messages/logs', '', ['/messages', '/messages/logs'])
  const links = nodes(check.tree).filter(node => node.type === 'Link')
  const logs = links.filter(node => node.props.href === '/messages/logs')
  const inbox = links.filter(node => node.props.href === '/messages')
  assert.ok(logs.length)
  assert.ok(inbox.length)
  assert.ok(logs.every(node => node.props.className.includes('text-white font-medium')))
  assert.ok(inbox.every(node => !node.props.className.includes('text-white font-medium')))
})

function event(overrides = {}) {
  return { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    currentTarget: { pathname: '/dashboard', search: '', hash: '' },
    preventDefault() { this.defaultPrevented = true }, ...overrides }
}

test('mobile menu opens without changing the desktop sidebar state', () => {
  const check = harness()
  const trigger = nodes(check.tree).find(node => node.props?.['aria-label'] === 'Open navigation')
  trigger.props.onClick()
  assert.deepEqual(check.updates, [{ index: 1, value: true }])
})

test('mobile drawer keeps labels and child links when desktop navigation is collapsed', () => {
  const check = harness('/dashboard', '', ['/inventory'], { 0: false, 1: true })
  const dialog = nodes(check.tree).find(node => node.type === 'dialog')
  assert.equal(dialog.props['aria-label'], 'Navigation')
  const mobileNodes = nodes(dialog)
  assert.ok(mobileNodes.some(node => node.type === 'span' && node.props.children === 'Dashboard'))
  assert.ok(mobileNodes.some(node => node.type === 'Link' && node.props.href === '/inventory'))
  const close = mobileNodes.find(node => node.props?.['aria-label'] === 'Close navigation')
  close.props.onClick()
  assert.deepEqual(check.updates, [{ index: 1, value: false }])
})

test('mobile drawer dismisses on Escape or backdrop, but stays open on content clicks', () => {
  const check = harness('/dashboard', '', ['/inventory'], { 1: true })
  const dialog = nodes(check.tree).find(node => node.type === 'dialog')
  dialog.props.onClick({ target: {}, currentTarget: dialog })
  assert.deepEqual(check.updates, [])
  dialog.props.onClick({ target: dialog, currentTarget: dialog })
  dialog.props.onCancel()
  assert.deepEqual(check.updates, [{ index: 1, value: false }, { index: 1, value: false }])
})

for (const pathname of ['/dashboard', '/inventory']) {
  test(`Dashboard click closes desktop and mobile sidebar from ${pathname}`, () => {
    const check = harness(pathname)
    const click = event()
    check.click(click)
    assert.equal(click.defaultPrevented, true)
    assert.deepEqual(check.updates.filter(update => update.index < 2), [{ index: 0, value: false }, { index: 1, value: false }])
    assert.deepEqual(check.pushes, pathname === '/dashboard' ? [] : ['/dashboard'])
  })
}

test('Dashboard click clears workspace query without a stuck pathname-change loading state', () => {
  const check = harness('/dashboard', '?workspace=rto')
  check.click(event())
  assert.deepEqual(check.pushes, ['/dashboard'])
  assert.equal(check.updates.length, 2)
})

for (const overrides of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
  test(`modified/prevented Dashboard click does not change current sidebar: ${JSON.stringify(overrides)}`, () => {
    const check = harness()
    check.click(event(overrides))
    assert.deepEqual(check.updates, [])
    assert.deepEqual(check.pushes, [])
  })
}
