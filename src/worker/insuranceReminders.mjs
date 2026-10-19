import nodemailer from 'nodemailer'

const REMINDER_DAYS = new Set([30, 15, 7, 1])
const MAX_RETRIES = 2
const TEMPLATE_SUBJECT = 'Insurance renewal reminder — policy expiry approaching'
const INDIA_TIME_ZONE = 'Asia/Kolkata'
const EXCEL_CARS_NAME = 'Excel Cars'
const EXCEL_CARS_PHONE = process.env.PUBLIC_EXCEL_CARS_CONTACT_PHONE?.trim() || '9820344002 / 9820344332'
const EXCEL_CARS_EMAIL = process.env.PUBLIC_EXCEL_CARS_EMAIL?.trim() || 'naziya@excelcarsmumbai.com'

function indiaDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: INDIA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value)
  const part = type => parts.find(entry => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

function dateFromKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function calendarDaysUntil(expiryDate, todayKey) {
  return Math.round((dateFromKey(indiaDateKey(expiryDate)) - dateFromKey(todayKey)) / 86_400_000)
}

function normalizeEmail(value) {
  const email = value?.trim().toLowerCase()
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizeWhatsAppRecipient(value) {
  const digits = (value ?? '').replace(/\D/g, '')
  const local = digits.length > 10 ? digits.slice(-10) : digits
  return local.length === 10 ? `91${local}` : null
}

function renderTemplate(template, variables) {
  return template.replace(/{{(customerName|registrationNo|expiryDate|agentName|agentMobile|excelCarsName|excelCarsPhone|excelCarsEmail)}}/g, (_, key) => variables[key] || '—')
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
}

function messageText(variables) {
  return `Your vehicle insurance for ${variables.registrationNo} expires on ${variables.expiryDate}. Please contact ${variables.excelCarsName} at ${variables.excelCarsPhone} or ${variables.excelCarsEmail} to renew your policy.`
}

function recipientsFor(insurance) {
  const customer = {
    type: 'Customer',
    name: insurance.customer?.custName || insurance.customerNameLegacy || 'Customer',
    email: insurance.customer?.custEmail || insurance.customerEmailLegacy,
    mobile: insurance.customer?.custMobile || insurance.customerMobileLegacy,
  }
  return [customer]
}

function excelCarsContactHtml() {
  return `<p>For assistance, please contact ${escapeHtml(EXCEL_CARS_NAME)} at ${escapeHtml(EXCEL_CARS_PHONE)} or <a href="mailto:${escapeHtml(EXCEL_CARS_EMAIL)}">${escapeHtml(EXCEL_CARS_EMAIL)}</a>.</p><p>Regards,<br>${escapeHtml(EXCEL_CARS_NAME)}</p>`
}

function configuredMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.EMAIL_FROM_ADDRESS) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
}

async function sendWhatsApp(to, customerName, message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v23.0'
  if (!phoneNumberId || !accessToken) throw new Error('WhatsApp is not configured yet.')
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: 'global_temp', language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: message }] }] } }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.message || `WhatsApp API request failed (${response.status}).`)
  return payload?.messages?.[0]?.id ?? null
}

async function recordAttempt(prisma, delivery, result) {
  const nextRetryCount = delivery.retryCount + 1
  const canRetry = !result.success && nextRetryCount < MAX_RETRIES
  const status = result.success ? 'Sent' : canRetry ? 'Retrying' : 'Failed'
  await prisma.$transaction([
    prisma.insuranceReminderAttempt.create({ data: { insuranceReminderDeliveryId: delivery.insuranceReminderDeliveryId, attemptNumber: nextRetryCount, status, errorMessage: result.error || null, providerMessageId: result.providerMessageId || null } }),
    prisma.insuranceReminderDelivery.update({ where: { insuranceReminderDeliveryId: delivery.insuranceReminderDeliveryId }, data: { status, errorMessage: result.error || null, providerMessageId: result.providerMessageId || null, retryCount: nextRetryCount, nextRetryAt: canRetry ? new Date(Date.now() + 5 * 60 * 1000) : null, attemptedAt: new Date() } }),
  ])
}

async function dispatchDelivery(prisma, delivery, mailer) {
  const policy = await prisma.insuranceMain.findUnique({ where: { insuranceMainId: delivery.insuranceMainId }, select: { policyStatus: true } })
  if (!policy || policy.policyStatus === 'Renewed') {
    await prisma.$transaction([
      prisma.insuranceReminderAttempt.create({ data: { insuranceReminderDeliveryId: delivery.insuranceReminderDeliveryId, attemptNumber: delivery.retryCount + 1, status: 'Cancelled', errorMessage: 'Policy is already renewed.' } }),
      prisma.insuranceReminderDelivery.update({ where: { insuranceReminderDeliveryId: delivery.insuranceReminderDeliveryId }, data: { status: 'Cancelled', nextRetryAt: null, attemptedAt: new Date() } }),
    ])
    return
  }
  try {
    if (delivery.channel === 'Email') {
      if (!mailer) throw new Error('Email is not configured yet.')
      await mailer.sendMail({ from: `${process.env.EMAIL_FROM_NAME || 'Excel Cars'} <${process.env.EMAIL_FROM_ADDRESS}>`, to: delivery.recipientAddress, subject: delivery.emailSubject, html: delivery.emailHtml })
      await recordAttempt(prisma, delivery, { success: true })
      return
    }
    const providerMessageId = await sendWhatsApp(delivery.recipientAddress, delivery.recipientName || 'Customer', delivery.whatsAppMessage || '')
    await recordAttempt(prisma, delivery, { success: true, providerMessageId })
  } catch (error) {
    await recordAttempt(prisma, delivery, { success: false, error: error instanceof Error ? error.message.slice(0, 1000) : 'Reminder delivery failed.' })
  }
}

async function queueDelivery(prisma, data, mailer) {
  try {
    const delivery = await prisma.insuranceReminderDelivery.create({ data })
    await dispatchDelivery(prisma, delivery, mailer)
  } catch (error) {
    // A unique schedule record means this recipient/channel already received (or is retrying) this reminder.
    if (error?.code !== 'P2002') throw error
  }
}

export async function retryInsuranceReminders(prisma) {
  if (process.env.INSURANCE_REMINDER_ENABLED !== 'true') return
  const mailer = configuredMailer()
  const due = await prisma.insuranceReminderDelivery.findMany({
    where: { status: 'Retrying', nextRetryAt: { lte: new Date() } },
    include: { insuranceMain: { select: { policyStatus: true } } },
    take: 50,
  })
  for (const delivery of due) {
    if (delivery.insuranceMain.policyStatus === 'Renewed') {
      await prisma.$transaction([
        prisma.insuranceReminderAttempt.create({ data: { insuranceReminderDeliveryId: delivery.insuranceReminderDeliveryId, attemptNumber: delivery.retryCount + 1, status: 'Cancelled', errorMessage: 'Policy is already renewed.' } }),
        prisma.insuranceReminderDelivery.update({ where: { insuranceReminderDeliveryId: delivery.insuranceReminderDeliveryId }, data: { status: 'Cancelled', nextRetryAt: null, attemptedAt: new Date() } }),
      ])
      continue
    }
    await dispatchDelivery(prisma, delivery, mailer)
  }
}

export async function queueDailyInsuranceReminders(prisma) {
  if (process.env.INSURANCE_REMINDER_ENABLED !== 'true') return
  const todayKey = indiaDateKey()
  const lower = dateFromKey(todayKey)
  const upper = new Date(lower.getTime() + 30 * 86_400_000)
  const [template, policies] = await Promise.all([
    prisma.messageTemplate.findFirst({ where: { messageSubject: TEMPLATE_SUBJECT } }),
    prisma.insuranceMain.findMany({
      where: { expiryDate: { gte: lower, lte: upper }, OR: [{ policyStatus: null }, { policyStatus: { notIn: ['Renewed'] } }] },
      include: {
        customer: true,
      },
    }),
  ])
  if (!template?.messageBody) throw new Error(`Insurance email template is missing: ${TEMPLATE_SUBJECT}`)
  const mailer = configuredMailer()
  for (const policy of policies) {
    if (!policy.expiryDate) continue
    const daysBeforeExpiry = calendarDaysUntil(policy.expiryDate, todayKey)
    if (!REMINDER_DAYS.has(daysBeforeExpiry)) continue
    const variables = {
      customerName: policy.customer?.custName || policy.customerNameLegacy || 'Customer',
      registrationNo: policy.carRegistrationNo || 'your vehicle',
      expiryDate: indiaDateKey(policy.expiryDate),
      // Keep legacy template placeholders customer-safe: old agent fields now
      // resolve to the company contact rather than an individual agent.
      agentName: EXCEL_CARS_NAME,
      agentMobile: EXCEL_CARS_PHONE,
      excelCarsName: EXCEL_CARS_NAME,
      excelCarsPhone: EXCEL_CARS_PHONE,
      excelCarsEmail: EXCEL_CARS_EMAIL,
    }
    const customerEmailHtml = `${renderTemplate(template.messageBody, Object.fromEntries(Object.entries(variables).map(([key, value]) => [key, escapeHtml(value)])))}${excelCarsContactHtml()}`
    const customerWhatsAppMessage = messageText(variables)
    for (const recipient of recipientsFor(policy)) {
      const emailHtml = customerEmailHtml
      const whatsAppMessage = customerWhatsAppMessage
      const email = normalizeEmail(recipient.email)
      if (email) await queueDelivery(prisma, { insuranceMainId: policy.insuranceMainId, recipientType: recipient.type, recipientName: recipient.name, recipientKey: `email:${email}`, recipientAddress: email, channel: 'Email', daysBeforeExpiry, status: 'Queued', emailSubject: template.messageSubject || TEMPLATE_SUBJECT, emailHtml, whatsAppMessage: null }, mailer)
      const whatsApp = normalizeWhatsAppRecipient(recipient.mobile)
      if (whatsApp) await queueDelivery(prisma, { insuranceMainId: policy.insuranceMainId, recipientType: recipient.type, recipientName: recipient.name, recipientKey: `whatsapp:${whatsApp}`, recipientAddress: whatsApp, channel: 'WhatsApp', daysBeforeExpiry, status: 'Queued', emailSubject: null, emailHtml: null, whatsAppMessage }, mailer)
    }
  }
}

export function currentInsuranceReminderDay() {
  return indiaDateKey()
}
