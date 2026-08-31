'use client'

import { useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Link, RemoveFormatting } from 'lucide-react'

export function RichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value
  }, [value])

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const addLink = () => {
    const url = window.prompt('Enter the link address (https://...)')?.trim()
    if (!url) return
    run('createLink', url)
  }

  const controls = [
    { label: 'Bold', icon: Bold, action: () => run('bold') },
    { label: 'Italic', icon: Italic, action: () => run('italic') },
    { label: 'Underline', icon: Underline, action: () => run('underline') },
    { label: 'Bulleted list', icon: List, action: () => run('insertUnorderedList') },
    { label: 'Numbered list', icon: ListOrdered, action: () => run('insertOrderedList') },
    { label: 'Add link', icon: Link, action: addLink },
    { label: 'Clear formatting', icon: RemoveFormatting, action: () => run('removeFormat') },
  ]

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">Body *</label>
      <div className="rounded-md border border-gray-200 overflow-hidden focus-within:ring-1" style={{ '--tw-ring-color': '#1B2A6B' } as Record<string, string>}>
        <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50 p-1.5">
          {controls.map(control => {
            const Icon = control.icon
            return <button key={control.label} type="button" title={control.label} aria-label={control.label} onMouseDown={event => event.preventDefault()} onClick={control.action} className="rounded p-1.5 text-gray-600 hover:bg-white hover:text-[#1B2A6B]"><Icon className="h-4 w-4" /></button>
          })}
        </div>
        <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" onInput={event => onChange(event.currentTarget.innerHTML)} onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); onChange(editorRef.current?.innerHTML ?? '') }} className="min-h-36 px-3 py-2 text-sm text-gray-800 outline-none" />
      </div>
      <p className="text-xs text-gray-500">Formatting is sent in the email. Pasted content is added as plain text.</p>
    </div>
  )
}
