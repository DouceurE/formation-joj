import type { BookingStatus } from '@joj/shared';
import type { Booking } from './booking';
import type { Trip } from './trip';

/** Ce que voit le supporter : son annulation l'emporte sur celle du trajet. */
export function bookingStatus(booking: Booking, trip: Trip): BookingStatus {
  if (booking.cancelledAt) return 'annulee';
  if (trip.cancelledAt) return 'trajet-annule';
  return 'confirmee';
}
