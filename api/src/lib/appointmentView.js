// Représentation publique d'un rendez-vous (côté patient).
export function toPublicAppointment(appointment) {
  return {
    id: appointment.id,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    status: appointment.status,
    reason: appointment.reason ?? null,
  };
}
