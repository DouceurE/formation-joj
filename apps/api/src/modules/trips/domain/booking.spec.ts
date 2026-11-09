import { describe, expect, it } from 'vitest';
import { Booking } from './booking';

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
