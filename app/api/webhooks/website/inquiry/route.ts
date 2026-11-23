
import { NextRequest, NextResponse } from 'next/server'
import {
  isPartnerWebhookAuthorized,
  receivePartnerInquiry,
} from '@/features/inquiry/partnerWebhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (
    !isPartnerWebhookAuthorized(
      request.headers,
      process.env.WEBSITE_WEBHOOK_SECRET,
    )
  ) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401 },
    )
  }

  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .includes('application/json')
  ) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json.' },
      { status: 415 },
    )
  }

  try {
    const payload: unknown = await request.json()

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      return NextResponse.json(
        { error: 'JSON object expected.' },
        { status: 422 },
      )
    }

    const result = await receivePartnerInquiry(
      'WEBSITE',
      payload as Record<string, unknown>,
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SUCCESS',
      inquiryId: result.inquiryId,
      duplicate: result.duplicate,
    })
  } catch (error) {
    console.error('Website webhook failed:', error)

    return NextResponse.json(
      { error: 'Could not process Website enquiry.' },
      { status: 500 },
    )
  }
}
