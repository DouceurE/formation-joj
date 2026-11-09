// Lu par drizzle-kit pour générer les migrations : ce fichier n'importe que drizzle-orm.
import {
  bigint,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const TRIPS_MANAGEMENT_CODE_KEY = 'trips_management_code_key';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey(),
    // Véhicule, site, limites de places et prix sont vérifiés par le domaine.
    vehicle: varchar('vehicle', { length: 20 }).notNull(),
    departurePlace: varchar('departure_place', { length: 100 }).notNull(),
    site: varchar('site', { length: 20 }).notNull(),
    // Précision milliseconde = celle de Date en JavaScript.
    departureAt: timestamp('departure_at', { withTimezone: true, precision: 3 }).notNull(),
    seats: integer('seats').notNull(),
    // bigint : le prix n'a pas de plafond métier, il doit tenir tout entier accepté par zod.
    priceFcfa: bigint('price_fcfa', { mode: 'number' }).notNull(),
    driverPhone: varchar('driver_phone', { length: 20 }).notNull(),
    managementCode: varchar('management_code', { length: 8 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull(),
    // Nul tant que le conducteur n'a pas annulé : le trajet n'est jamais supprimé (AS6).
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, precision: 3 }),
  },
  // Un code de gestion désigne un seul trajet : TR3 s'en servira pour annuler.
  (table) => [uniqueIndex(TRIPS_MANAGEMENT_CODE_KEY).on(table.managementCode)],
);

export type TripRow = typeof trips.$inferSelect;

export const BOOKINGS_TRIP_PASSENGER_KEY = 'bookings_trip_passenger_key';
export const BOOKINGS_BOOKING_CODE_KEY = 'bookings_booking_code_key';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey(),
    // On ne réserve que sur un trajet qui existe.
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id),
    bookingCode: varchar('booking_code', { length: 8 }).notNull(),
    passengerName: varchar('passenger_name', { length: 100 }).notNull(),
    // Sans espaces : c'est lui qui identifie le supporter.
    passengerPhone: varchar('passenger_phone', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 }).notNull(),
    // Nul tant que la place est prise : la réservation n'est jamais supprimée.
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, precision: 3 }),
  },
  (table) => [
    // Un même téléphone ne réserve pas deux fois le même trajet, même au même instant ;
    // limité aux réservations actives, pour qu'un supporter qui a annulé puisse revenir.
    uniqueIndex(BOOKINGS_TRIP_PASSENGER_KEY)
      .on(table.tripId, table.passengerPhone)
      .where(sql`${table.cancelledAt} is null`),
    // Un code désigne une seule réservation : TR3 s'en servira pour annuler.
    uniqueIndex(BOOKINGS_BOOKING_CODE_KEY).on(table.bookingCode),
  ],
);

export type BookingRow = typeof bookings.$inferSelect;
