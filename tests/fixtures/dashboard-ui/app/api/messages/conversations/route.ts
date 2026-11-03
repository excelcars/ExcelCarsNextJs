import { chats } from '../data'
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const query = (params.get('search') || '').toLowerCase()
  const rows = chats.filter(chat => (!query || `${chat.senderName} ${chat.body}`.toLowerCase().includes(query)) && (params.get('unread') !== '1' || chat.unread > 0))
  return Response.json({ conversations: rows, total: rows.length })
}
