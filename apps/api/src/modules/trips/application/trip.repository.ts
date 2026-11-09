import type { TripSite } from '@joj/shared';
import type { Booking } from '../domain/booking';
import type { Trip } from '../domain/trip';

/** Une réservation et son trajet, retrouvés par le code de réservation. */
export interface BookingWithTrip {
  booking: Booking;
  trip: Trip;
}

/**
 * Port de persistance : ce dont les cas d'usage ont besoin, rien de plus.
 * Implémenté par DrizzleTripRepository (infra) et InMemoryTripRepository (tests).
 */
export abstract class TripRepository {
  /** Le trajet avec les téléphones de ses réservations actives, ou null. */
  abstract findById(id: string): Promise<Trip | null>;
  abstract findByManagementCode(code: string): Promise<Trip | null>;
  abstract findBookingByCode(code: string): Promise<BookingWithTrip | null>;
  abstract insert(trip: Trip): Promise<void>;
  /** Lève TRIP_CANCELLED, TRIP_FULL ou TRIP_ALREADY_BOOKED si la règle est enfreinte à l'écriture. */
  abstract addBooking(booking: Booking): Promise<void>;
  /** Lève TRIP_ALREADY_CANCELLED si le trajet l'était déjà (deux annulations simultanées). */
  abstract saveTripCancellation(trip: Trip): Promise<void>;
  /** Lève BOOKING_ALREADY_CANCELLED si la réservation l'était déjà (deux annulations simultanées). */
  abstract saveBookingCancellation(booking: Booking): Promise<void>;
  /** Les trajets non annulés du site dont le départ est dans [from, to[, triés par heure de départ. */
  abstract listBySiteBetween(site: TripSite, from: Date, to: Date): Promise<Trip[]>;
}
