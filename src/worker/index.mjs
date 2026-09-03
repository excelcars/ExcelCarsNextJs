import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()
const MAX_RETRIES = 2

async function retryPendingEmails() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.EMAIL_FROM_ADDRESS) return
  const rows = await prisma.emailDeliveryLog.findMany({ where: { status: 'Retrying', nextRetryAt: { lte: new Date() } }, take: 20 })
  const mailer = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
  for (const row of rows) {
    try {
      await mailer.sendMail({ from: `${process.env.EMAIL_FROM_NAME || 'Excel Cars'} <${process.env.EMAIL_FROM_ADDRESS}>`, to: row.recipientEmail, subject: row.emailSubject, html: row.emailHtml, ...(row.attachmentJson ? { attachments: JSON.parse(row.attachmentJson) } : {}) })
      await prisma.emailDeliveryLog.update({ where: { deliveryLogId: row.deliveryLogId }, data: { status: 'Sent', errorMessage: null, nextRetryAt: null, retryCount: row.retryCount + 1 } })
    } catch (error) {
      const retryCount = row.retryCount + 1
      await prisma.emailDeliveryLog.update({ where: { deliveryLogId: row.deliveryLogId }, data: { retryCount, status: retryCount >= MAX_RETRIES ? 'Failed' : 'Retrying', nextRetryAt: retryCount >= MAX_RETRIES ? null : new Date(Date.now() + 5 * 60 * 1000), errorMessage: error instanceof Error ? error.message.slice(0, 1000) : 'Retry failed.' } })
    }
  }
}

console.log('ExcelCars email retry worker started')
retryPendingEmails().catch(console.error)
setInterval(() => retryPendingEmails().catch(console.error), 60 * 1000)
