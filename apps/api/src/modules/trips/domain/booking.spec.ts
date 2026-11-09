import { describe, expect, it } from 'vitest';
import { Booking } from './booking';
import { bookingStatus } from './booking-status';
import { Trip } from './trip';

const NOW = new Date('2026-11-09T09:00:00.000Z');

const create = (overrides: Partial<Parameters<typeof Booking.create>[0]> = {}) =>
  Booking.create({
    id: '0199f5c2-0000-7000-8000-000000000201',
    bookingCode: 'B7Q2M9XA',
    tripId: '0199f5c2-0000-7000-8000-000000000101',
    passengerName: ' Moussa ',
    passengerPhone: '78 555 66 77',
    now: NOW,
    ...overrides,
  });

describe('Booking', () => {
  it('002-AS1: keeps the booking code, a trimmed name and the phone without spaces', () => {
    expect(create()).toMatchObject({
      bookingCode: 'B7Q2M9XA',
      passengerName: 'Moussa',
      passengerPhone: '785556677',
      createdAt: NOW,
    });
  });

  it.each(['passengerName', 'passengerPhone'])('002-AS7: rejects a blank %s', (field) => {
    expect(() => create({ [field]: '   ' })).toThrow(
      expect.objectContaining({ code: 'TRIP_FIELD_REQUIRED', kind: 'VALIDATION' }),
    );
  });
});

describe('Booking cancellation', () => {
  const LATER = new Date('2026-11-09T18:00:00.000Z');

  it('003-AS1: records the moment of the cancellation', () => {
    const booking = create();
    expect(booking.cancelledAt).toBeNull();
    booking.cancel(LATER);
    expect(booking.cancelledAt).toEqual(LATER);
  });

  it('003-AS3: refuses to cancel a booking twice', () => {
    const booking = create();
    booking.cancel(LATER);
    expect(() => booking.cancel(LATER)).toThrow(
      expect.objectContaining({ code: 'BOOKING_ALREADY_CANCELLED', kind: 'CONFLICT' }),
    );
  });

  it('003-AS6: is confirmed, then "trajet annulé", and "annulée" wins over both', () => {
    const trip = Trip.create({
      id: '0199f5c2-0000-7000-8000-000000000101',
      managementCode: 'K7Q2M9XA',
      vehicle: 'taxi',
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: new Date('2026-11-10T08:00:00.000Z'),
      seats: 4,
      priceFcfa: 1000,
      driverPhone: '77 123 45 67',
      now: NOW,
    });
    const booking = create();
    expect(bookingStatus(booking, trip)).toBe('confirmee');
    trip.cancel(LATER);
    expect(bookingStatus(booking, trip)).toBe('trajet-annule');
    booking.cancel(LATER);
    expect(bookingStatus(booking, trip)).toBe('annulee');
  });
});
