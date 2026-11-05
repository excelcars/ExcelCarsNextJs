export const chats = [
  { id: 1, phoneNumberId: 'test-business', senderName: 'Aarav Shah', senderMobile: '910000000001', body: 'Can we schedule a test drive tomorrow?', messageType: 'text', receivedAt: '2026-11-03T09:52:00Z', unread: 2 },
  { id: 2, phoneNumberId: 'test-business', senderName: 'Meera Patel', senderMobile: '910000000002', body: 'Thank you for sharing the details!', messageType: 'text', receivedAt: '2026-11-03T09:30:00Z', unread: 0 },
  { id: 3, phoneNumberId: 'test-business', senderName: 'Rohan Desai', senderMobile: '910000000003', body: 'Video attachment', messageType: 'video', receivedAt: '2026-11-03T08:50:00Z', unread: 1 },
]
export const entries: Record<string, { key: string; messageId: number | null; body: string; direction: string; sentAt: string; status: string; messageType: string; mediaId: string | null; errorMessage: string | null; templateName?: string; templateLanguage?: string; buttonUrlSuffix?: string }[]> = {
  '1': [
    { key: 'sent-demo', messageId: null, body: 'Customer: Aarav Shah\nVehicle: BMW 3 Series 320d', direction: 'outgoing', sentAt: '2026-11-03T09:35:00Z', status: 'delivered', messageType: 'template', mediaId: null, errorMessage: null, templateName: 'enquiry_temp', templateLanguage: 'en', buttonUrlSuffix: 'vehicle/demo-bmw?t=preview-only' },
    { key: 'in-1', messageId: 1, body: 'Hi! I saw your listing for the BMW 3 Series. Is it still available?', direction: 'incoming', sentAt: '2026-11-03T09:40:00Z', status: 'received', messageType: 'text', mediaId: null, errorMessage: null },
    { key: 'out-demo1', messageId: 1, body: 'Hello Aarav! Yes, it is available. It’s a 2022 model with 28,000 km. Would you like to visit our showroom?', direction: 'outgoing', sentAt: '2026-11-03T09:42:00Z', status: 'accepted', messageType: 'text', mediaId: null, errorMessage: null },
    { key: 'in-2', messageId: 1, body: 'That sounds great. Could you share a few photos of the interior?', direction: 'incoming', sentAt: '2026-11-03T09:45:00Z', status: 'received', messageType: 'text', mediaId: null, errorMessage: null },
    { key: 'out-demo2', messageId: 1, body: 'Of course. The car has a beige leather interior and a panoramic sunroof. I’ll arrange a viewing for you.', direction: 'outgoing', sentAt: '2026-11-03T09:47:00Z', status: 'accepted', messageType: 'text', mediaId: null, errorMessage: null },
    { key: 'in-3', messageId: 1, body: 'Can we schedule a test drive tomorrow?', direction: 'incoming', sentAt: '2026-11-03T09:52:00Z', status: 'received', messageType: 'text', mediaId: null, errorMessage: null },
  ],
}
