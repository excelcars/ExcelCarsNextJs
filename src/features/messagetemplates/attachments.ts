import path from 'path'

export const MESSAGE_ATTACHMENT_SCOPES = ['template', 'send'] as const
export type MessageAttachmentScope = typeof MESSAGE_ATTACHMENT_SCOPES[number]
export const MESSAGE_ATTACHMENT_ROOT = path.join(process.cwd(), 'storage', 'email-attachments')
export const MAX_MESSAGE_ATTACHMENT_SIZE = 10 * 1024 * 1024
export const ALLOWED_MESSAGE_ATTACHMENT_TYPES = new Map([
  ['application/pdf', '.pdf'], ['image/jpeg', '.jpg'], ['image/png', '.png'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
])

export function attachmentExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase()
  const expected = ALLOWED_MESSAGE_ATTACHMENT_TYPES.get(mimeType)
  return expected && extension === expected ? extension : expected ?? null
}

export function isSafeStoredAttachmentPath(storedPath: string) {
  const resolvedPath = path.resolve(storedPath)
  const resolvedRoot = path.resolve(MESSAGE_ATTACHMENT_ROOT)
  return resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)
}
