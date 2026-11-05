import { chats, entries } from '../../data'
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return Response.json({ entries: entries[id] || [{ key: `in-${id}`, messageId: Number(id), body: chats.find(chat => chat.id === Number(id))?.body, direction: 'incoming', sentAt: new Date().toISOString(), status: 'received', messageType: 'text', mediaId: null }], latestMessageId: Number(id), canReply: true, replyWindowClosesAt: new Date(Date.now() + 3600000).toISOString(), nextCursor: null })
}
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const chat = chats.find(chat => chat.id === Number(id))
  const markedRead = chat?.unread || 0
  if (chat) chat.unread = 0
  return Response.json({ markedRead })
}
