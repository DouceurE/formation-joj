import { describe, expect, it } from 'vitest';
import { Trip } from './trip';
import { Booking } from './booking';

const NOW = new Date('2026-11-09T09:00:00.000Z');
const ID = '0199f5c2-0000-7000-8000-000000000101';
const DEPARTURE_AT = new Date('2026-11-10T08:00:00.000Z');

const publish = (overrides: Partial<Parameters<typeof Trip.create>[0]> = {}) =>
  Trip.create({
    id: ID,
    managementCode: 'K7Q2M9XA',
    vehicle: 'ndiaga-ndiaye',
    departurePlace: 'Pikine',
    site: 'diamniadio',
    departureAt: DEPARTURE_AT,
    seats: 38,
    priceFcfa: 500,
    driverPhone: '77 123 45 67',
    now: NOW,
    ...overrides,
  });

const rejection = (code: string, kind = 'VALIDATION') => expect.objectContaining({ code, kind });

describe('Trip', () => {
  it('001-AS1: publishes a Ndiaga Ndiaye of 38 seats with all seats remaining and its management code', () => {
    expect(publish()).toMatchObject({
      id: ID,
      managementCode: 'K7Q2M9XA',
      vehicle: 'ndiaga-ndiaye',
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: DEPARTURE_AT,
      seats: 38,
      remainingSeats: 38,
      priceFcfa: 500,
      driverPhone: '77 123 45 67',
      createdAt: NOW,
    });
  });

  it.each([
    ['voiture', 5],
    ['taxi', 5],
    ['ndiaga-ndiaye', 39],
    ['voiture', 0],
    ['ndiaga-ndiaye', 0],
  ])('001-AS2: rejects a %s with %i seats (SEATS_OUT_OF_RANGE)', (vehicle, seats) => {
    expect(() => publish({ vehicle, seats })).toThrow(rejection('SEATS_OUT_OF_RANGE'));
  });

  it.each([
    ['voiture', 4],
    ['taxi', 1],
    ['ndiaga-ndiaye', 38],
  ])('001-AS2: accepts a %s with %i seats', (vehicle, seats) => {
    expect(publish({ vehicle, seats }).seats).toBe(seats);
  });

  it('001-AS3: rejects a departure one minute in the past (DEPARTURE_IN_PAST)', () => {
    const departureAt = new Date('2026-11-09T08:59:00.000Z');
    expect(() => publish({ departureAt })).toThrow(rejection('DEPARTURE_IN_PAST', 'BUSINESS_RULE'));
  });

  it('001-AS3: accepts a departure at the very moment of publication', () => {
    expect(publish({ departureAt: NOW }).departureAt).toEqual(NOW);
  });

  it('001-AS4: rejects an unknown site', () => {
    expect(() => publish({ site: 'thies' })).toThrow(rejection('TRIP_SITE_UNKNOWN'));
  });

  it('001-AS4: rejects an unknown vehicle', () => {
    expect(() => publish({ vehicle: 'moto' })).toThrow(rejection('TRIP_VEHICLE_UNKNOWN'));
  });

  it.each([-1, 2.5])('001-AS4: rejects a price of %j FCFA', (priceFcfa) => {
    expect(() => publish({ priceFcfa })).toThrow(rejection('TRIP_PRICE_INVALID'));
  });

  it('001-AS4: accepts a free trip (0 FCFA)', () => {
    expect(publish({ priceFcfa: 0 }).priceFcfa).toBe(0);
  });

  it.each(['departurePlace', 'driverPhone'])('001-AS4: rejects a blank %s', (field) => {
    expect(() => publish({ [field]: '   ' })).toThrow(rejection('TRIP_FIELD_REQUIRED'));
  });
});

let bookingCount = 0;
const booking = (passengerPhone: string) => {
  bookingCount += 1;
  return Booking.create({
    id: `0199f5c2-0000-7000-8000-${String(bookingCount).padStart(12, '0')}`,
    bookingCode: `BOOK${String(bookingCount).padStart(4, '0')}`,
    tripId: ID,
    passengerName: 'Supporter',
    passengerPhone,
    now: NOW,
  });
};

describe('Trip.book', () => {
  it('002-AS1: a booking on a Ndiaga Ndiaye of 38 seats leaves 37 seats', () => {
    const trip = publish();
    trip.book(booking('78 555 66 77'), NOW);
    expect(trip.remainingSeats).toBe(37);
    expect(trip.passengerPhones).toEqual(['785556677']);
  });

  it('002-AS2: refuses a booking on a full taxi', () => {
    const trip = publish({ vehicle: 'taxi', seats: 1 });
    trip.book(booking('70 111 11 11'), NOW);
    expect(() => trip.book(booking('70 222 22 22'), NOW)).toThrow(
      rejection('TRIP_FULL', 'CONFLICT'),
    );
    expect(trip.passengerPhones).toHaveLength(1);
    expect(trip.remainingSeats).toBe(0);
  });

  it('002-AS4: refuses the same phone twice on a trip, spaces aside', () => {
    const trip = publish();
    trip.book(booking('78 555 66 77'), NOW);
    expect(() => trip.book(booking('785556677'), NOW)).toThrow(
      rejection('TRIP_ALREADY_BOOKED', 'CONFLICT'),
    );
    expect(trip.remainingSeats).toBe(37);
  });

  it('002-AS5: refuses a booking on a departed trip', () => {
    const trip = publish({ departureAt: new Date('2026-11-10T08:59:00.000Z') });
    const later = new Date('2026-11-10T09:00:00.000Z');
    expect(() => trip.book(booking('78 555 66 77'), later)).toThrow(
      rejection('TRIP_ALREADY_DEPARTED', 'BUSINESS_RULE'),
    );
    expect(trip.remainingSeats).toBe(38);
  });

  it('002-AS5: still accepts a booking at the very minute of departure', () => {
    const departureAt = new Date('2026-11-10T09:00:00.000Z');
    const trip = publish({ departureAt });
    trip.book(booking('78 555 66 77'), departureAt);
    expect(trip.remainingSeats).toBe(37);
  });
});
