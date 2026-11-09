import { randomUUID } from 'node:crypto';
import type { TripSite } from '@joj/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type DatabaseConnection, openDatabase } from '../../../core/database/database';
import { Booking } from '../domain/booking';
import { Trip } from '../domain/trip';
import { DrizzleTripRepository } from './drizzle-trip.repository';

let count = 0;
// restore() et non create() : un trajet déjà parti doit pouvoir être relu et listé.
const storedTrip = (site: TripSite, departureAt: string, seats = 38) => {
  count += 1;
  return Trip.restore({
    id: randomUUID(),
    managementCode: `CODE${String(count).padStart(4, '0')}`,
    vehicle: 'ndiaga-ndiaye',
    departurePlace: 'Pikine',
    site,
    departureAt: new Date(departureAt),
    seats,
    priceFcfa: 500,
    driverPhone: '77 123 45 67',
    passengerPhones: [],
    cancelledAt: null,
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

  it('001-AS5: lists a trip that has already departed first', async () => {
    // Une journée écoulée : le trajet de 8 h est passé par rapport à l'heure réelle.
    const departed = storedTrip('saly', '2025-11-10T08:00:00.000Z');
    const later = storedTrip('saly', '2025-11-10T18:00:00.000Z');
    expect(departed.departureAt.getTime()).toBeLessThan(Date.now());
    await repository.insert(later);
    await repository.insert(departed);

    const listed = await repository.listBySiteBetween(
      'saly',
      new Date('2025-11-10T00:00:00.000Z'),
      new Date('2025-11-11T00:00:00.000Z'),
    );
    expect(listed.map((trip) => trip.id)).toEqual([departed.id, later.id]);
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

describe('DrizzleTripRepository bookings (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleTripRepository;

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleTripRepository(connection.db);
  });

  afterAll(() => connection?.close());

  let bookingCount = 0;
  const booking = (tripId: string, passengerPhone: string) => {
    bookingCount += 1;
    return Booking.create({
      id: randomUUID(),
      bookingCode: `BOOK${String(bookingCount).padStart(4, '0')}`,
      tripId,
      passengerName: 'Supporter',
      passengerPhone,
      now: new Date('2026-11-09T09:00:00.000Z'),
    });
  };

  it('002-AS1: reads back the passenger and 37 remaining seats after a booking', async () => {
    const trip = storedTrip('diamniadio', '2026-12-10T08:00:00.000Z');
    await repository.insert(trip);
    await repository.addBooking(booking(trip.id, '78 555 66 77'));

    const found = await repository.findById(trip.id);
    expect(found?.passengerPhones).toEqual(['785556677']);
    expect(found?.remainingSeats).toBe(37);
    const [listed] = await repository.listBySiteBetween(
      'diamniadio',
      new Date('2026-12-10T00:00:00.000Z'),
      new Date('2026-12-11T00:00:00.000Z'),
    );
    expect(listed?.remainingSeats).toBe(37);
    expect(await repository.findById(randomUUID())).toBeNull();
  });

  it('002-AS3: accepts only one of two simultaneous bookings on the last seat', async () => {
    const trip = storedTrip('saly', '2026-12-10T08:00:00.000Z', 1);
    await repository.insert(trip);

    const results = await Promise.allSettled([
      repository.addBooking(booking(trip.id, '70 111 11 11')),
      repository.addBooking(booking(trip.id, '70 222 22 22')),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const [rejected] = results.filter((result) => result.status === 'rejected');
    expect(rejected?.reason).toMatchObject({ code: 'TRIP_FULL' });
    expect((await repository.findById(trip.id))?.remainingSeats).toBe(0);
  });

  it('002-AS4: refuses a second booking with the same phone through the unique index', async () => {
    const trip = storedTrip('dakar', '2026-12-10T08:00:00.000Z');
    await repository.insert(trip);
    await repository.addBooking(booking(trip.id, '78 555 66 77'));

    await expect(repository.addBooking(booking(trip.id, '785556677'))).rejects.toMatchObject({
      code: 'TRIP_ALREADY_BOOKED',
    });
    expect((await repository.findById(trip.id))?.remainingSeats).toBe(37);
  });
});

describe('DrizzleTripRepository cancellations (in-memory PGlite, migrations applied)', () => {
  let connection: DatabaseConnection;
  let repository: DrizzleTripRepository;
  const LATER = new Date('2026-11-09T18:00:00.000Z');
  const DAY = {
    from: new Date('2026-12-20T00:00:00.000Z'),
    to: new Date('2026-12-21T00:00:00.000Z'),
  };

  beforeAll(async () => {
    connection = openDatabase({ pgliteDataDir: 'memory://' });
    await connection.migrate();
    repository = new DrizzleTripRepository(connection.db);
  });

  afterAll(() => connection?.close());

  let count = 0;
  const booking = (tripId: string, passengerPhone: string) => {
    count += 1;
    return Booking.create({
      id: randomUUID(),
      bookingCode: `CANC${String(count).padStart(4, '0')}`,
      tripId,
      passengerName: 'Supporter',
      passengerPhone,
      now: new Date('2026-11-09T09:00:00.000Z'),
    });
  };

  async function tripWithBooking(site: TripSite) {
    const trip = storedTrip(site, '2026-12-20T08:00:00.000Z');
    await repository.insert(trip);
    const seat = booking(trip.id, '78 555 66 77');
    await repository.addBooking(seat);
    return { trip, seat };
  }

  it('003-AS1: frees the seat of a cancelled booking, which the same phone can take again', async () => {
    const { trip, seat } = await tripWithBooking('dakar');
    seat.cancel(LATER);
    await repository.saveBookingCancellation(seat);

    expect((await repository.findById(trip.id))?.remainingSeats).toBe(38);
    const found = await repository.findBookingByCode(seat.bookingCode);
    expect(found?.booking.cancelledAt).toEqual(LATER);
    await repository.addBooking(booking(trip.id, '785556677'));
    expect((await repository.findById(trip.id))?.remainingSeats).toBe(37);
  });

  it('003-AS3: refuses to save the cancellation of a booking twice', async () => {
    const { seat } = await tripWithBooking('saly');
    seat.cancel(LATER);
    await repository.saveBookingCancellation(seat);

    await expect(repository.saveBookingCancellation(seat)).rejects.toMatchObject({
      code: 'BOOKING_ALREADY_CANCELLED',
    });
  });

  it('003-AS4: no longer lists a cancelled trip, found again by its management code', async () => {
    const { trip } = await tripWithBooking('diamniadio');
    trip.cancel(LATER);
    await repository.saveTripCancellation(trip);

    expect(await repository.listBySiteBetween('diamniadio', DAY.from, DAY.to)).toEqual([]);
    expect((await repository.findByManagementCode(trip.managementCode))?.cancelledAt).toEqual(
      LATER,
    );
    await expect(repository.saveTripCancellation(trip)).rejects.toMatchObject({
      code: 'TRIP_ALREADY_CANCELLED',
    });
  });

  it('003-AS6: finds a booking and its trip by the booking code', async () => {
    const { trip, seat } = await tripWithBooking('dakar');
    const found = await repository.findBookingByCode(seat.bookingCode);
    expect(found?.booking.id).toBe(seat.id);
    expect(found?.trip.id).toBe(trip.id);
    expect(await repository.findBookingByCode('ZZZZ9999')).toBeNull();
    expect(await repository.findByManagementCode('ZZZZ9999')).toBeNull();
  });

  it('003-AS7: refuses a booking on a cancelled trip under lock', async () => {
    const trip = storedTrip('saly', '2026-12-20T09:00:00.000Z');
    await repository.insert(trip);
    trip.cancel(LATER);
    await repository.saveTripCancellation(trip);

    await expect(repository.addBooking(booking(trip.id, '70 111 11 11'))).rejects.toMatchObject({
      code: 'TRIP_CANCELLED',
    });
    expect((await repository.findById(trip.id))?.remainingSeats).toBe(38);
  });
});
