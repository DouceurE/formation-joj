import { z } from 'zod';

/** Liste fermée des sites d'arrivée des JOJ. */
export const TRIP_SITES = ['dakar', 'diamniadio', 'saly'] as const;
export const tripSiteSchema = z.enum(TRIP_SITES);
export type TripSite = z.infer<typeof tripSiteSchema>;

/** Liste fermée des véhicules : un nouveau véhicule s'ajoute ici et dans VEHICLE_MAX_SEATS. */
export const TRIP_VEHICLES = ['voiture', 'taxi', 'ndiaga-ndiaye'] as const;
export const tripVehicleSchema = z.enum(TRIP_VEHICLES);
export type TripVehicle = z.infer<typeof tripVehicleSchema>;

/** Places maximum par véhicule. Vérifiées par le domaine, pour que le refus garde son code. */
export const VEHICLE_MAX_SEATS: Readonly<Record<TripVehicle, number>> = {
  voiture: 4,
  taxi: 4,
  'ndiaga-ndiaye': 38,
};

export const TRIP_DEPARTURE_PLACE_MAX_LENGTH = 100;
export const TRIP_PHONE_MAX_LENGTH = 20;
export const TRIP_MANAGEMENT_CODE_LENGTH = 8;

/** Corps de `POST /api/trips`. Le départ dans le passé est refusé par le domaine (il dépend de l'heure). */
export const publishTripSchema = z.object({
  vehicle: tripVehicleSchema,
  departurePlace: z.string().trim().min(1).max(TRIP_DEPARTURE_PLACE_MAX_LENGTH),
  site: tripSiteSchema,
  departureAt: z.iso.datetime(),
  seats: z.int(),
  /** Entier de FCFA ; 0 veut dire gratuit. */
  priceFcfa: z.int().min(0),
  driverPhone: z.string().trim().min(1).max(TRIP_PHONE_MAX_LENGTH),
});
export type PublishTripInput = z.infer<typeof publishTripSchema>;

/** Paramètres de `GET /api/trips` : un site et une date du calendrier à Dakar (GMT). */
export const listTripsQuerySchema = z.object({
  site: tripSiteSchema,
  date: z.iso.date(),
});
export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;

/** Un trajet de la liste : sans le téléphone du conducteur ni le code de gestion. */
export const tripSchema = z.object({
  id: z.uuid(),
  vehicle: tripVehicleSchema,
  departurePlace: z.string(),
  site: tripSiteSchema,
  departureAt: z.iso.datetime(),
  seats: z.int(),
  remainingSeats: z.int(),
  priceFcfa: z.int(),
  createdAt: z.iso.datetime(),
});
export type TripResponse = z.infer<typeof tripSchema>;

export const tripListSchema = z.array(tripSchema);

/** La réponse à la publication : le trajet et son code de gestion, remis au seul conducteur. */
export const publishedTripSchema = tripSchema.extend({
  managementCode: z.string().length(TRIP_MANAGEMENT_CODE_LENGTH),
});
export type PublishedTripResponse = z.infer<typeof publishedTripSchema>;

export const TRIP_NAME_MAX_LENGTH = 100;
export const BOOKING_CODE_LENGTH = 8;

/** Corps de `POST /api/trips/:id/bookings`. Le téléphone identifie le supporter. */
export const bookSeatSchema = z.object({
  passengerName: z.string().trim().min(1).max(TRIP_NAME_MAX_LENGTH),
  passengerPhone: z.string().trim().min(1).max(TRIP_PHONE_MAX_LENGTH),
});
export type BookSeatInput = z.infer<typeof bookSeatSchema>;

/** Paramètre `:id` des routes d'un trajet. */
export const tripIdParamsSchema = z.object({ id: z.uuid() });

/** La confirmation d'une réservation : son code, où et quand partir, et qui appeler. */
export const bookingConfirmationSchema = z.object({
  id: z.uuid(),
  bookingCode: z.string().length(BOOKING_CODE_LENGTH),
  tripId: z.uuid(),
  passengerName: z.string(),
  departurePlace: z.string(),
  departureAt: z.iso.datetime(),
  driverPhone: z.string(),
  createdAt: z.iso.datetime(),
});
export type BookingConfirmationResponse = z.infer<typeof bookingConfirmationSchema>;
