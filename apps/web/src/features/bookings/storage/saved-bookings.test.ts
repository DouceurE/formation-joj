/**
 * Les codes de réservation gardés dans le téléphone, pour que « Mes trajets » les retrouve même
 * après avoir fermé la page. Seuls les codes sont gardés, jamais le nom ni le téléphone.
 */
import { describe, expect, it } from 'vitest';
import { savedBookings } from './saved-bookings';

describe('savedBookings', () => {
  it('007-AS5: keeps a booking code on the phone without duplicates', () => {
    savedBookings.save('B7Q2M9XA');
    savedBookings.save('K7Q2M9XB');
    savedBookings.save('B7Q2M9XA');

    expect(savedBookings.list()).toEqual(['K7Q2M9XB', 'B7Q2M9XA']);
    expect(window.localStorage.getItem('dem.bookings')).toBe('["K7Q2M9XB","B7Q2M9XA"]');
  });

  it('007-AS5: forgets a code without touching the others', () => {
    savedBookings.save('B7Q2M9XA');
    savedBookings.save('K7Q2M9XB');

    savedBookings.forget('B7Q2M9XA');

    expect(savedBookings.list()).toEqual(['K7Q2M9XB']);
  });

  it('007-AS5: reads an unreadable memory as an empty list, never an error', () => {
    window.localStorage.setItem('dem.bookings', '{pas du json');
    expect(savedBookings.list()).toEqual([]);

    window.localStorage.setItem('dem.bookings', JSON.stringify([42, 'B7Q2M9XA', null]));
    expect(savedBookings.list()).toEqual(['B7Q2M9XA']);
  });
});
