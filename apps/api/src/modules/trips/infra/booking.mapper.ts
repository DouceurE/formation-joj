import type { Booking } from '../domain/booking';
import type { BookingRow } from './trips.schema';

/** Entité → ligne de la table. */
export function toRow(booking: Booking): BookingRow {
  return booking.toProps();
}
