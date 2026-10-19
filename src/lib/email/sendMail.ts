import nodemailer from 'nodemailer'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  cc?: string
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType: string }>
}

export interface SendEmailResult {
  success: boolean
  error?: string
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_USER
    && process.env.SMTP_PASSWORD
    && process.env.EMAIL_FROM_ADDRESS,
  )
}

function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
  return transporter
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD
  const fromAddress = process.env.EMAIL_FROM_ADDRESS
  const fromName = process.env.EMAIL_FROM_NAME || 'Excel Cars'

  if (!isEmailConfigured() || !smtpHost || !smtpUser || !smtpPassword || !fromAddress) {
    return { success: false, error: 'Email is not configured yet — add SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM_ADDRESS to the environment.' }
  }

  const cc = input.cc || process.env.STAFF_CC_EMAIL || undefined

  try {
    await getTransporter().sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
    html: input.html,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      ...(cc ? { cc } : {}),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email.' }
  }
}
