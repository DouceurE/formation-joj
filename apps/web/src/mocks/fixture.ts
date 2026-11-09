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

const initial = (): { trips: TripResponse[]; officialLines: OfficialLineResponse[] } => ({
  trips: [{ ...ndiagaAt10 }, { ...carAt8 }, { ...taxiToSaly }],
  officialLines: OFFICIAL_LINES.map((line) => ({ ...line })),
});

export const fixture = initial();

export function resetFixture(): void {
  Object.assign(fixture, initial());
}
