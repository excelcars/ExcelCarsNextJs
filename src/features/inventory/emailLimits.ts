export interface InventoryBulkEmailLimits {
  maxVehicles: number
  maxRecipients: number
  maxMessages: number
}

function positiveEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/** Server-side limits for the temporary inventory bulk-email workflow. */
export function getInventoryBulkEmailLimits(): InventoryBulkEmailLimits {
  return {
    maxVehicles: positiveEnvNumber('INVENTORY_BULK_EMAIL_MAX_VEHICLES', 5),
    maxRecipients: positiveEnvNumber('INVENTORY_BULK_EMAIL_MAX_RECIPIENTS', 5),
    maxMessages: positiveEnvNumber('INVENTORY_BULK_EMAIL_MAX_MESSAGES', 25),
  }
}
