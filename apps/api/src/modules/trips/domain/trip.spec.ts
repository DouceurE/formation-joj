import { describe, expect, it } from 'vitest';
import { Trip } from './trip';

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
