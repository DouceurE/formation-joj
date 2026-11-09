import { describe, expect, it } from 'vitest';
import { Trip, type TripProps } from '../domain/trip';
import { InMemoryTripRepository } from './testing/in-memory-trip.repository';
import { ListTrips } from './use-cases/list-trips';
import { PublishTrip } from './use-cases/publish-trip';

// Dans le futur, pour que PublishTrip (qui lit l'horloge) accepte le départ.
const FUTURE_DAY = '2030-11-10';
const ndiaga = {
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: `${FUTURE_DAY}T08:00:00.000Z`,
  seats: 38,
  priceFcfa: 500,
  driverPhone: '77 123 45 67',
} as const;

function setup() {
  const trips = new InMemoryTripRepository();
  return { trips, publishTrip: new PublishTrip(trips), listTrips: new ListTrips(trips) };
}

let count = 0;
function stored(site: TripProps['site'], departureAt: string): Trip {
  count += 1;
  return Trip.restore({
    id: `0199f5c2-0000-7000-8000-${String(count).padStart(12, '0')}`,
    managementCode: `CODE${String(count).padStart(4, '0')}`,
    vehicle: 'voiture',
    departurePlace: 'Parcelles',
    site,
    departureAt: new Date(departureAt),
    seats: 3,
    priceFcfa: 1000,
    driverPhone: '78 000 00 00',
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
  });
}

describe('trips (application layer)', () => {
  it('001-AS1: publishes a trip with a management code', async () => {
    const { publishTrip, listTrips } = setup();
    const trip = await publishTrip.execute(ndiaga);

    expect(trip.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(trip.managementCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(trip.remainingSeats).toBe(38);
    expect(await listTrips.execute({ site: 'diamniadio', date: FUTURE_DAY })).toEqual([trip]);
  });

  it('001-AS1: gives each trip its own management code', async () => {
    const { publishTrip } = setup();
    const first = await publishTrip.execute(ndiaga);
    const second = await publishTrip.execute(ndiaga);
    expect(first.managementCode).not.toBe(second.managementCode);
  });

  it('001-AS2: refuses a car with 5 seats and stores nothing', async () => {
    const { publishTrip, listTrips } = setup();
    await expect(
      publishTrip.execute({ ...ndiaga, vehicle: 'voiture', seats: 5 }),
    ).rejects.toMatchObject({ code: 'SEATS_OUT_OF_RANGE' });
    expect(await listTrips.execute({ site: 'diamniadio', date: FUTURE_DAY })).toEqual([]);
  });

  it('001-AS5: lists the trips of a site for a day by departure time', async () => {
    const { trips, listTrips } = setup();
    const at10 = stored('diamniadio', '2026-11-10T10:00:00.000Z');
    const at8 = stored('diamniadio', '2026-11-10T08:00:00.000Z');
    for (const trip of [
      at10,
      at8,
      stored('diamniadio', '2026-11-11T00:00:00.000Z'),
      stored('diamniadio', '2026-11-09T23:59:59.999Z'),
      stored('saly', '2026-11-10T09:00:00.000Z'),
    ]) {
      await trips.insert(trip);
    }

    const listed = await listTrips.execute({ site: 'diamniadio', date: '2026-11-10' });
    expect(listed.map((trip) => trip.id)).toEqual([at8.id, at10.id]);
  });

  it('001-AS5: lists a trip that has already departed first', async () => {
    const { trips, listTrips } = setup();
    // Une journée écoulée : le trajet de 8 h est passé par rapport à l'heure réelle.
    const departed = stored('diamniadio', '2025-11-10T08:00:00.000Z');
    const later = stored('diamniadio', '2025-11-10T18:00:00.000Z');
    expect(departed.departureAt.getTime()).toBeLessThan(Date.now());
    await trips.insert(later);
    await trips.insert(departed);

    const listed = await listTrips.execute({ site: 'diamniadio', date: '2025-11-10' });
    expect(listed.map((trip) => trip.id)).toEqual([departed.id, later.id]);
  });

  it('001-AS6: returns an empty list for a day without departure', async () => {
    const { listTrips } = setup();
    expect(await listTrips.execute({ site: 'saly', date: '2026-11-12' })).toEqual([]);
  });
});
