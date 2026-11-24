export type PartnerDetailField = { label: string; value: string }

const fields: Record<string, Array<[string, string]>> = {
  WEBSITE: [['lead_id', 'Lead ID'], ['lead_type', 'Lead type'], ['name', 'Customer'], ['mobile', 'Mobile'], ['email', 'Email'], ['vehicle_requested', 'Vehicle requested'], ['remarks', 'Remarks']],
  CARDEKHO: [['lead_id', 'Lead ID'], ['buyer_name', 'Customer'], ['buyer_mobile', 'Mobile'], ['mmv', 'Vehicle requested'], ['mfg_year', 'Manufacturing year'], ['reg_no', 'Registration'], ['km_driven', 'Kilometres driven'], ['no_of_owners', 'Owners']],
  JUSTDIAL: [['leadid', 'Lead ID'], ['name', 'Customer'], ['mobile', 'Mobile'], ['email', 'Email'], ['leadtype', 'Lead type'], ['category', 'Category'], ['company', 'Company'], ['city', 'City'], ['area', 'Area'], ['pincode', 'PIN code'], ['date', 'Lead date'], ['time', 'Lead time']],
}

/** Display approved business fields; never expose arbitrary payload keys or tokens. */
export function readablePartnerPayload(partner: string, payload: unknown): PartnerDetailField[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return []
  const data = payload as Record<string, unknown>
  return (fields[partner] ?? []).flatMap(([key, label]) => {
    const value = data[key]
    if (typeof value !== 'string' && typeof value !== 'number') return []
    const text = String(value).trim().slice(0, partner === 'WEBSITE' && key === 'remarks' ? 1000 : 500)
    return text ? [{ label, value: text }] : []
  })
}
