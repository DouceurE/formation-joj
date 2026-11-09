import { Booking } from '../domain/booking';
import type { BookingRow } from './trips.schema';

/** Ligne de la table → entité. */
export function toDomain(row: BookingRow): Booking {
  return Booking.restore(row);
}

/** Entité → ligne de la table. */
export function toRow(booking: Booking): BookingRow {
  return booking.toProps();
}
