import type { Booking } from '../domain/booking';
import type { BookingRow } from './trips.schema';

/** Entité → ligne de la table. */
export function toRow(booking: Booking): BookingRow {
  // La colonne cancelled_at arrive avec la tâche T04 de la spec 003.
  const { cancelledAt: _cancelledAt, ...row } = booking.toProps();
  return row;
}
