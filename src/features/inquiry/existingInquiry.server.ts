import { Prisma } from '@prisma/client'

export function normalizeInquiryMobile(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '').slice(-10)
}

/** Shared contact lookup for the previous-inquiry UI and integration leads. */
export async function findContactInquiries(client: Pick<Prisma.TransactionClient, '$queryRaw'>, input: {
  mobile: string
  customerId?: number | null
  excludeInquiryId?: number | null
  preferActive?: boolean
  limit?: number
}) {
  const mobile = normalizeInquiryMobile(input.mobile)
  const matches: Prisma.Sql[] = []
  if (mobile) matches.push(Prisma.sql`(
    RIGHT(regexp_replace(COALESCE(i.mobileno, ''), '[^0-9]', '', 'g'), 10) = ${mobile}
    OR RIGHT(regexp_replace(COALESCE(c.cust_mobile, ''), '[^0-9]', '', 'g'), 10) = ${mobile}
  )`)
  if (input.customerId) matches.push(Prisma.sql`i.customer_id = ${input.customerId}`)
  if (!matches.length) return []
  return client.$queryRaw<Array<{ inquiry_id: number }>>(Prisma.sql`
    SELECT i.inquiry_id FROM inquiry i
    LEFT JOIN customer c ON c.cust_id = i.customer_id
    WHERE (${Prisma.join(matches, ' OR ')})
      ${input.excludeInquiryId ? Prisma.sql`AND i.inquiry_id <> ${input.excludeInquiryId}` : Prisma.empty}
    ORDER BY ${input.preferActive ? Prisma.sql`CASE WHEN lower(trim(COALESCE(i.status, ''))) IN ('closed', 'converted') THEN 1 ELSE 0 END,` : Prisma.empty}
      i.inquiry_id DESC
    LIMIT ${input.limit ?? 20}
  `)
}
