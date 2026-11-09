import { describe, expect, it } from 'vitest';
import { OFFICIAL_LINES } from '../domain/official-lines';
import { Trip, type TripProps } from '../domain/trip';
import { InMemoryTripRepository } from './testing/in-memory-trip.repository';
import { BookSeat } from './use-cases/book-seat';
import { CancelBooking } from './use-cases/cancel-booking';
import { CancelTrip } from './use-cases/cancel-trip';
import { GetBooking } from './use-cases/get-booking';
import { ListOfficialLines } from './use-cases/list-official-lines';
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
  return {
    trips,
    publishTrip: new PublishTrip(trips),
    listTrips: new ListTrips(trips),
    bookSeat: new BookSeat(trips),
    cancelBooking: new CancelBooking(trips),
    cancelTrip: new CancelTrip(trips),
    getBooking: new GetBooking(trips),
  };
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
    passengerPhones: [],
    cancelledAt: null,
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

describe('booking a seat (application layer)', () => {
  const moussa = { passengerName: 'Moussa', passengerPhone: '78 555 66 77' };

  it('002-AS1: books a seat and returns the driver phone', async () => {
    const { publishTrip, listTrips, bookSeat } = setup();
    const trip = await publishTrip.execute(ndiaga);

    const confirmation = await bookSeat.execute(trip.id, moussa);

    expect(confirmation.booking.bookingCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(confirmation.booking).toMatchObject({ tripId: trip.id, passengerName: 'Moussa' });
    expect(confirmation.trip).toMatchObject({
      departurePlace: 'Pikine',
      departureAt: new Date(ndiaga.departureAt),
      driverPhone: '77 123 45 67',
    });
    const [listed] = await listTrips.execute({ site: 'diamniadio', date: FUTURE_DAY });
    expect(listed?.remainingSeats).toBe(37);
  });

  it('002-AS4: refuses the same phone twice on a trip, but not on another trip', async () => {
    const { publishTrip, bookSeat, trips } = setup();
    const first = await publishTrip.execute(ndiaga);
    const second = await publishTrip.execute({
      ...ndiaga,
      departureAt: `${FUTURE_DAY}T10:00:00.000Z`,
    });
    await bookSeat.execute(first.id, moussa);

    await expect(
      bookSeat.execute(first.id, { ...moussa, passengerPhone: '785556677' }),
    ).rejects.toMatchObject({ code: 'TRIP_ALREADY_BOOKED' });
    await bookSeat.execute(second.id, moussa);
    expect((await trips.findById(first.id))?.remainingSeats).toBe(37);
    expect((await trips.findById(second.id))?.remainingSeats).toBe(37);
  });

  it('002-AS5: refuses a booking on a trip that departed in 2025 and records nothing', async () => {
    const { trips, bookSeat } = setup();
    const departed = stored('saly', '2025-11-10T08:00:00.000Z');
    await trips.insert(departed);

    await expect(bookSeat.execute(departed.id, moussa)).rejects.toMatchObject({
      code: 'TRIP_ALREADY_DEPARTED',
    });
    expect(trips.bookings).toEqual([]);
  });

  it('002-AS6: refuses a booking on an unknown trip and records nothing', async () => {
    const { trips, bookSeat } = setup();
    await expect(
      bookSeat.execute('0199f5c2-0000-7000-8000-00000000dead', moussa),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND' });
    expect(trips.bookings).toEqual([]);
  });
});

describe('cancelling (application layer)', () => {
  const moussa = { passengerName: 'Moussa', passengerPhone: '78 555 66 77' };

  it('003-AS1: cancels a booking and frees its seat', async () => {
    const { publishTrip, bookSeat, cancelBooking, listTrips } = setup();
    const trip = await publishTrip.execute(ndiaga);
    const { booking } = await bookSeat.execute(trip.id, moussa);

    const cancelled = await cancelBooking.execute({ bookingCode: booking.bookingCode });

    expect(cancelled.status).toBe('annulee');
    expect(cancelled.booking.cancelledAt).toBeInstanceOf(Date);
    const [listed] = await listTrips.execute({ site: 'diamniadio', date: FUTURE_DAY });
    expect(listed?.remainingSeats).toBe(38);
  });

  it('003-AS2: refuses an unknown code', async () => {
    const { cancelBooking, getBooking, cancelTrip, trips } = setup();
    await expect(cancelBooking.execute({ bookingCode: 'ZZZZ9999' })).rejects.toMatchObject({
      code: 'BOOKING_NOT_FOUND',
    });
    await expect(getBooking.execute('ZZZZ9999')).rejects.toMatchObject({
      code: 'BOOKING_NOT_FOUND',
    });
    await expect(cancelTrip.execute({ managementCode: 'ZZZZ9999' })).rejects.toMatchObject({
      code: 'TRIP_NOT_FOUND',
    });
    expect(trips.bookings).toEqual([]);
  });

  it('003-AS4: cancels a trip, which leaves the list of departures', async () => {
    const { publishTrip, cancelTrip, listTrips } = setup();
    const trip = await publishTrip.execute(ndiaga);

    const cancelled = await cancelTrip.execute({ managementCode: trip.managementCode });

    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    expect(await listTrips.execute({ site: 'diamniadio', date: FUTURE_DAY })).toEqual([]);
  });

  it('003-AS6: shows a confirmed booking, then a cancelled trip', async () => {
    const { publishTrip, bookSeat, cancelTrip, getBooking } = setup();
    const trip = await publishTrip.execute(ndiaga);
    const { booking } = await bookSeat.execute(trip.id, moussa);

    const before = await getBooking.execute(booking.bookingCode);
    expect(before.status).toBe('confirmee');
    expect(before.trip).toMatchObject({ departurePlace: 'Pikine', driverPhone: '77 123 45 67' });

    await cancelTrip.execute({ managementCode: trip.managementCode });
    expect((await getBooking.execute(booking.bookingCode)).status).toBe('trajet-annule');
  });
});

describe('official lines (application layer)', () => {
  it('004-AS1: lists the official lines of a site', () => {
    const lines = new ListOfficialLines().execute({ site: 'diamniadio' });

    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.site === 'diamniadio')).toBe(true);
    expect(new ListOfficialLines().execute({ site: 'dakar' })).toEqual([]);
  });
});

describe('official lines are not bookable (application layer)', () => {
  it('004-AS4: refuses a booking on an official line and records nothing', async () => {
    const { trips, publishTrip, bookSeat } = setup();
    // Un vrai trajet en base, pour que « rien n'est enregistré » ne soit pas trivialement vrai.
    const trip = await publishTrip.execute(ndiaga);
    const line = OFFICIAL_LINES[0];

    await expect(
      bookSeat.execute(line?.id ?? '', { passengerName: 'Moussa', passengerPhone: '78 555 66 77' }),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND' });
    expect(trips.bookings).toEqual([]);
    expect((await trips.findById(trip.id))?.remainingSeats).toBe(38);
  });
});
