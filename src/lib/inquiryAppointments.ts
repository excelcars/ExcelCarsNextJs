export const APPOINTMENT_FIXED_SUB_STATUSES = ['Appointment Fixed', 'Appt. Fixed']

export function isAppointmentFixedSubStatus(value: string) {
  return APPOINTMENT_FIXED_SUB_STATUSES.some(status => status.toLowerCase() === value.trim().toLowerCase())
}
