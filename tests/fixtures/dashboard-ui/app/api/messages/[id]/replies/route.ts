import { entries } from '../../data'
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const input = await request.json()
  const reply = { id: input.requestId, body: input.body, status: 'accepted', createdAt: new Date().toISOString(), errorMessage: null }
  entries[id] ??= []
  if (!entries[id].some(entry => entry.key === `out-${reply.id}`)) entries[id].push({ key: `out-${reply.id}`, messageId: Number(id), body: reply.body, direction: 'outgoing', sentAt: reply.createdAt, status: reply.status, messageType: 'text', mediaId: null, errorMessage: null })
  return Response.json({ reply })
}
