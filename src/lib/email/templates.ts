interface VehicleDetailsEmailInput {
  customerName: string
  make: string
  model: string
  variant: string
  year: number | null
  colour: string
  fuelType: string
  noOfOwners: number | null
  registrationNo: string
  kmsDriven: string | number | null
  price: string | number | null
  remarks: string
  signedBy: string
  viewDetailsUrl?: string | null
}

export function vehicleDetailsSubject(input: Pick<VehicleDetailsEmailInput, 'make' | 'model' | 'variant' | 'colour'>) {
  const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
  const vehicle = [input.make, input.model, input.variant].map(clean).filter(Boolean).join(' ')
  const colour = clean(input.colour)
  return ['Car Details', vehicle ? `for ${vehicle}` : '', colour ? `– ${colour}` : ''].filter(Boolean).join(' ')
}

export function vehicleDetailsEmail(input: VehicleDetailsEmailInput): { subject: string; html: string } {
  const name = escapeHtml(input.customerName || 'Customer')
  const makeAndModel = [input.make, input.model, input.variant].filter(Boolean).join(' ')
  const price = input.price != null && input.price !== '' ? `₹${Number(input.price).toLocaleString('en-IN')}` : ''
  const km = input.kmsDriven != null && input.kmsDriven !== '' ? `${Number(input.kmsDriven).toLocaleString('en-IN')} km` : ''
  const viewDetailsUrl = input.viewDetailsUrl?.trim()
  const ctaHtml = viewDetailsUrl
    ? `
      <p style="margin:20px 0;">
        <a href="${escapeHtml(viewDetailsUrl ?? '')}" style="color:#d7194a;text-decoration:underline;font-weight:700;">View the car</a>
      </p>
    `
    : ''

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#263651;line-height:1.6;max-width:560px;">
      <p>Dear ${name},</p>
      <p>Thank you for your interest in Excel Cars. The vehicle you enquired for is detailed below.</p>
      <p style="margin-bottom:8px;font-weight:700;color:#142b62;">YOUR SELECTED VEHICLE</p>
      <ul style="margin-top:0;padding-left:22px;">
        <li><strong>Make &amp; Model:</strong> ${escapeHtml(makeAndModel) || '—'}</li>
        <li><strong>Year:</strong> ${escapeHtml(input.year != null ? String(input.year) : '') || '—'}</li>
        <li><strong>Fuel Type:</strong> ${escapeHtml(input.fuelType) || '—'}</li>
        <li><strong>Kms Driven:</strong> ${escapeHtml(km) || '—'}</li>
        <li><strong>Price:</strong> ${escapeHtml(price) || '—'}</li>
      </ul>
      ${ctaHtml}
      <p>To know more or arrange a showroom visit, call 9820344332 / 9820344002 or email <a href="mailto:naziya@excelcarsmumbai.com" style="color:#d7194a;text-decoration:underline;">naziya@excelcarsmumbai.com</a>.</p>
      <p>Warm regards,<br>Team Excel Cars<br>Your Trusted Car Buying Partner</p>
    </div>
  `

  return { subject: vehicleDetailsSubject(input), html }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] as string))
}

export function noInventoryEnquiryEmail(customerName: string): { subject: string; html: string } {
  const name = escapeHtml(customerName || 'Customer')
  return {
    subject: 'We received your enquiry — Excel Cars',
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#263651;line-height:1.6;max-width:560px;"><p>Hi ${name}, thank you for your enquiry with Excel Cars.</p><p>We have received your request and our team will get in touch with you shortly.</p><p>For any immediate assistance, call us at 9820344002 or 9820344332, or email <a href="mailto:naziya@excelcarsmumbai.com">naziya@excelcarsmumbai.com</a>.</p><p>We’ll be happy to assist you.</p></div>`,
  }
}
