export interface TemplateRow {
  typeId: number
  messageType: string | null
  messageSubject: string | null
  messageBody: string | null
}

// Show readable text in the list while retaining the original HTML for editing.
export function emailBodyToText(html: string | null) {
  if (!html) return '—'
  return html
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() || '—'
}
