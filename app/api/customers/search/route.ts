import { NextRequest, NextResponse } from 'next/server'
import { searchCustomers } from '@/features/customers/queries'
import { auth } from '../../../../auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const customers = await searchCustomers(q)
  return NextResponse.json(customers)
}
