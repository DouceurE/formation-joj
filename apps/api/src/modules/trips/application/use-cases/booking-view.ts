import type { BookingStatus } from '@joj/shared';
import type { Booking } from '../../domain/booking';
import type { Trip } from '../../domain/trip';

/** Une réservation consultée : la réservation, son trajet et le statut calculé par le domaine. */
export interface BookingView {
  booking: Booking;
  trip: Trip;
  status: BookingStatus;
}
