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
  },
  // Un code de gestion désigne un seul trajet : TR3 s'en servira pour annuler.
  (table) => [uniqueIndex(TRIPS_MANAGEMENT_CODE_KEY).on(table.managementCode)],
);

export type TripRow = typeof trips.$inferSelect;
