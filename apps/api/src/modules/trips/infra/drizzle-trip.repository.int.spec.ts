import { randomUUID } from 'node:crypto';
import type { TripSite } from '@joj/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Trip } from '../domain/trip';
import { DrizzleTripRepository } from './drizzle-trip.repository';

let count = 0;
// restore() et non create() : un trajet déjà parti doit pouvoir être relu et listé.
const storedTrip = (site: TripSite, departureAt: string) => {
  count += 1;
  return Trip.restore({
    id: randomUUID(),
    managementCode: `CODE${String(count).padStart(4, '0')}`,
    vehicle: 'ndiaga-ndiaye',
    departurePlace: 'Pikine',
    site,
    departureAt: new Date(departureAt),
    seats: 38,
    priceFcfa: 500,
    driverPhone: '77 123 45 67',
    createdAt: new Date('2026-11-09T09:00:00.123Z'),
  });
};

const DAY_START = new Date('2026-11-10T00:00:00.000Z');
const DAY_END = new Date('2026-11-11T00:00:00.000Z');

describe('DrizzleTripRepository (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleTripRepository;

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleTripRepository(connection.db);
  });

  afterAll(() => connection?.close());

  it('001-AS1: reads back exactly what it wrote', async () => {
    const trip = storedTrip('dakar', '2026-11-10T07:30:00.456Z');
    await repository.insert(trip);

    expect(await repository.listBySiteBetween('dakar', DAY_START, DAY_END)).toEqual([trip]);
  });

  it('001-AS5: keeps the trips of the day for the site, ordered by departure', async () => {
    const at10 = storedTrip('diamniadio', '2026-11-10T10:00:00.000Z');
    const midnight = storedTrip('diamniadio', '2026-11-10T00:00:00.000Z');
    const at8 = storedTrip('diamniadio', '2026-11-10T08:00:00.000Z');
    for (const trip of [
      at10,
      midnight,
      at8,
      storedTrip('diamniadio', '2026-11-11T00:00:00.000Z'),
      storedTrip('diamniadio', '2026-11-09T23:59:59.999Z'),
      storedTrip('saly', '2026-11-10T09:00:00.000Z'),
    ]) {
      await repository.insert(trip);
    }

    const listed = await repository.listBySiteBetween('diamniadio', DAY_START, DAY_END);
    expect(listed.map((trip) => trip.id)).toEqual([midnight.id, at8.id, at10.id]);
  });

  it('001-AS6: returns an empty list when the site has no trip that day', async () => {
    expect(
      await repository.listBySiteBetween(
        'saly',
        new Date('2026-11-12T00:00:00.000Z'),
        new Date('2026-11-13T00:00:00.000Z'),
      ),
    ).toEqual([]);
  });
});
