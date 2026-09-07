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
  signedBy: string
  viewDetailsUrl?: string | null
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:8px 14px;border:1px solid #dce4f2;background:#f4f7fc;color:#142b62;font-weight:600;">${label}</td><td style="padding:8px 14px;border:1px solid #dce4f2;color:#263651;">${value || '—'}</td></tr>`

export function vehicleDetailsSubject(input: Pick<VehicleDetailsEmailInput, 'make' | 'model' | 'variant' | 'colour'>) {
  const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
  const vehicle = [input.make, input.model, input.variant].map(clean).filter(Boolean).join(' ')
  const colour = clean(input.colour)
  return ['Car Details', vehicle ? `for ${vehicle}` : '', colour ? `– ${colour}` : ''].filter(Boolean).join(' ')
}

export function vehicleDetailsEmail(input: VehicleDetailsEmailInput): { subject: string; html: string } {
  // legacy masked registration numbers to the first 5 characters in customer-facing emails
  const maskedReg = input.registrationNo ? input.registrationNo.trim().slice(0, 5) : ''
  const price = input.price ? `₹${Number(input.price).toLocaleString('en-IN')}` : ''
  const km = input.kmsDriven ? `${Number(input.kmsDriven).toLocaleString('en-IN')} km` : ''
  const ctaHtml = input.viewDetailsUrl
    ? `
      <div style="margin:24px 0;">
        <a href="${input.viewDetailsUrl}" style="display:inline-block;background:#142b62;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;">
          View Full Vehicle Details &rarr;
        </a>
      </div>
      <p style="font-size:12px;color:#6b7280;word-break:break-all;margin-top:8px;">
        If the button does not work, open this link:<br>
        <a href="${input.viewDetailsUrl}" style="color:#d7194a;text-decoration:underline;">${input.viewDetailsUrl}</a>
      </p>
    `
    : ''

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#263651;line-height:1.6;max-width:560px;">
      <p>Dear ${input.customerName},</p>
      <p>Thank you for choosing Excel Cars for buying your dream car.</p>
      <p>Below are the car details:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;">
        ${row('Make', input.make)}
        ${row('Model / Variant', [input.model, input.variant].filter(Boolean).join(' / '))}
        ${row('Year', input.year ? String(input.year) : '')}
        ${row('Colour', input.colour)}
        ${row('Fuel Type', input.fuelType)}
        ${row('No. of Owners', input.noOfOwners != null ? String(input.noOfOwners) : '')}
        ${row('Registration', maskedReg)}
        ${row('Kilometers', km)}
        ${row('Price', price)}
      </table>
      ${ctaHtml}
      <p>Hope you have a splendid buying experience with Excel Cars' wide range and easy financing options.</p>
      <p>For more information and personal assistance, walk in to our showroom at:<br>
      Gujral House, 167 CST Road, Opp. Central Bank Of India,<br>
      Off. BKC, Kalina, Santacruz East, Mumbai 400098.</p>
      <p>Happy buying with Excel Cars.</p>
      <p>Best Regards,<br>${input.signedBy}</p>
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
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#263651;line-height:1.6;max-width:560px;"><p>Hi ${name}, thank you for your enquiry with Excel Cars.</p><p>We have received your request and our team will get in touch with you shortly.</p><p>For any immediate assistance, you can contact us at 82923002.</p><p>We’ll be happy to assist you.</p></div>`,
  }
}
