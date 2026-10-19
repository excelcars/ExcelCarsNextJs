import type { PrismaClient } from '@prisma/client'

export function queueDailyInsuranceReminders(prisma: PrismaClient): Promise<void>
export function retryInsuranceReminders(prisma: PrismaClient): Promise<void>
export function currentInsuranceReminderDay(): string
