// Email HTML is authored in a rich-text editor. Keep presentation markup but strip executable and active content.
export function sanitizeEmailHtml(value: string) {
  return value
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|base|link)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|base|link)\b[^>]*\/?\s*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '')
}
