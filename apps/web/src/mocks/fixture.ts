import type { OfficialLineResponse, TripResponse } from '@joj/shared';

/**
 * Les données de la fausse API, en mémoire. Les handlers les lisent et les modifient comme la
 * vraie base ; `resetFixture()` (appelé après chaque test par `mockControl.reset()`) les remet
 * dans cet état, pour qu'un test ne dépende jamais de ce qu'un autre a créé ou supprimé.
 * Chaque ressource de l'API y ajoute sa liste, avec ses valeurs de départ.
 */
export const ndiagaAt10: TripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000a10',
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-10T10:00:00.000Z',
  seats: 38,
  remainingSeats: 30,
  priceFcfa: 500,
  createdAt: '2026-11-08T09:00:00.000Z',
};

export const carAt8: TripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000a08',
  vehicle: 'voiture',
  departurePlace: 'Parcelles',
  site: 'diamniadio',
  departureAt: '2026-11-10T08:00:00.000Z',
  seats: 4,
  remainingSeats: 3,
  priceFcfa: 1500,
  createdAt: '2026-11-08T09:00:00.000Z',
};

export const taxiToSaly: TripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000a09',
  vehicle: 'taxi',
  departurePlace: 'Keur Massar',
  site: 'saly',
  departureAt: '2026-11-10T09:00:00.000Z',
  seats: 4,
  remainingSeats: 4,
  priceFcfa: 3000,
  createdAt: '2026-11-08T09:00:00.000Z',
};

/** Les mêmes lignes d'exemple que l'API (`domain/official-lines.ts`). */
export const OFFICIAL_LINES: readonly OfficialLineResponse[] = [
  {
    id: '0199f5c2-0000-7000-8000-0000000a0001',
    operator: 'navette-joj',
    name: 'Navette JOJ Dakar → Diamniadio (exemple)',
    departurePoint: 'Point de départ à confirmer (exemple)',
    site: 'diamniadio',
  },
  {
    id: '0199f5c2-0000-7000-8000-0000000a0002',
    operator: 'dakar-dem-dikk',
    name: 'Dakar Dem Dikk vers Diamniadio (exemple)',
    departurePoint: 'Point de départ à confirmer (exemple)',
    site: 'diamniadio',
  },
  {
    id: '0199f5c2-0000-7000-8000-0000000a0003',
    operator: 'navette-joj',
    name: 'Navette JOJ Dakar → Saly (exemple)',
    departurePoint: 'Point de départ à confirmer (exemple)',
    site: 'saly',
  },
];

/** L'horloge de la fausse API : sans elle, les trajets de 2026 « partiraient » avec le temps. */
export const MOCK_NOW = '2026-11-09T09:00:00.000Z';

/** Un taxi complet, un autre jour que les départs de TR6. */
export const fullTaxi: TripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000b01',
  vehicle: 'taxi',
  departurePlace: 'Keur Massar',
  site: 'diamniadio',
  departureAt: '2026-11-11T08:00:00.000Z',
  seats: 4,
  remainingSeats: 0,
  priceFcfa: 2000,
  createdAt: '2026-11-08T09:00:00.000Z',
};

/** Une voiture partie ce matin, avant MOCK_NOW. */
export const departedCar: TripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000b02',
  vehicle: 'voiture',
  departurePlace: 'Parcelles',
  site: 'diamniadio',
  departureAt: '2026-11-09T08:00:00.000Z',
  seats: 4,
  remainingSeats: 4,
  priceFcfa: 1000,
  createdAt: '2026-11-08T09:00:00.000Z',
};

/** Un trajet annulé par son conducteur : absent des listes, visible depuis sa réservation. */
export const cancelledTrip: TripResponse = {
  id: '0199f5c2-0000-7000-8000-000000000b03',
  vehicle: 'voiture',
  departurePlace: 'Pikine',
  site: 'dakar',
  departureAt: '2026-11-12T08:00:00.000Z',
  seats: 4,
  remainingSeats: 3,
  priceFcfa: 1000,
  createdAt: '2026-11-08T09:00:00.000Z',
};

/** Le téléphone des conducteurs : l'API ne le donne qu'au supporter qui réserve. */
export const DRIVER_PHONES: Readonly<Record<string, string>> = {
  [ndiagaAt10.id]: '77 123 45 67',
  [carAt8.id]: '76 222 33 44',
  [taxiToSaly.id]: '70 999 88 77',
  [fullTaxi.id]: '78 111 22 33',
  [departedCar.id]: '77 000 11 22',
  [cancelledTrip.id]: '76 555 44 33',
};

/** Une réservation enregistrée par la fausse API, comme dans la table `bookings`. */
export interface MockBooking {
  id: string;
  bookingCode: string;
  tripId: string;
  passengerName: string;
  /** Sans espaces, comme dans l'API. */
  passengerPhone: string;
  createdAt: string;
  cancelledAt: string | null;
}

/** Le code d'une réservation sur le trajet annulé par son conducteur. */
export const BOOKING_ON_CANCELLED_TRIP = 'ANNULE23';

const initial = (): {
  trips: TripResponse[];
  officialLines: OfficialLineResponse[];
  bookings: MockBooking[];
  cancelledTripIds: string[];
} => ({
  trips: [ndiagaAt10, carAt8, taxiToSaly, fullTaxi, departedCar, cancelledTrip].map((trip) => ({
    ...trip,
  })),
  officialLines: OFFICIAL_LINES.map((line) => ({ ...line })),
  bookings: [
    {
      id: '0199f5c2-0000-7000-8000-000000000c01',
      bookingCode: BOOKING_ON_CANCELLED_TRIP,
      tripId: cancelledTrip.id,
      passengerName: 'Awa',
      passengerPhone: '781234567',
      createdAt: '2026-11-08T10:00:00.000Z',
      cancelledAt: null,
    },
  ],
  cancelledTripIds: [cancelledTrip.id],
});

export const fixture = initial();

export function resetFixture(): void {
  Object.assign(fixture, initial());
}
