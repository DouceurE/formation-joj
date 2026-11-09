import { describe, expect, it } from 'vitest';
import { listTripsQuerySchema, publishTripSchema } from './trips.ts';

const trip = {
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-10T08:00:00.000Z',
  seats: 38,
  priceFcfa: 500,
  driverPhone: '77 123 45 67',
};

function firstPath(input: unknown): PropertyKey[] | undefined {
  return publishTripSchema.safeParse(input).error?.issues[0]?.path;
}

describe('publishTripSchema', () => {
  it('001-AS1: accepts a Ndiaga Ndiaye of 38 seats from Pikine to Diamniadio', () => {
    expect(publishTripSchema.parse(trip)).toEqual(trip);
  });

  it('001-AS2: leaves the seat limits per vehicle to the domain', () => {
    expect(publishTripSchema.safeParse({ ...trip, vehicle: 'voiture', seats: 5 }).success).toBe(
      true,
    );
  });

  it('001-AS4: rejects an unknown site', () => {
    expect(firstPath({ ...trip, site: 'thies' })).toEqual(['site']);
  });

  it('001-AS4: rejects an unknown vehicle', () => {
    expect(firstPath({ ...trip, vehicle: 'moto' })).toEqual(['vehicle']);
  });

  it.each(['departurePlace', 'driverPhone'])('001-AS4: rejects a blank %s', (field) => {
    expect(firstPath({ ...trip, [field]: '   ' })).toEqual([field]);
  });

  it.each(['departurePlace', 'driverPhone', 'priceFcfa', 'seats', 'departureAt'])(
    '001-AS4: rejects a trip without %s',
    (field) => {
      const { [field as keyof typeof trip]: _omitted, ...rest } = trip;
      expect(firstPath(rest)).toEqual([field]);
    },
  );

  it.each([-1, 2.5])('001-AS4: rejects a price of %j FCFA', (priceFcfa) => {
    expect(firstPath({ ...trip, priceFcfa })).toEqual(['priceFcfa']);
  });

  it('001-AS4: accepts a free trip (0 FCFA)', () => {
    expect(publishTripSchema.parse({ ...trip, priceFcfa: 0 }).priceFcfa).toBe(0);
  });
});

describe('listTripsQuerySchema', () => {
  it('001-AS5: accepts a site and a calendar date', () => {
    expect(listTripsQuerySchema.parse({ site: 'diamniadio', date: '2026-11-10' })).toEqual({
      site: 'diamniadio',
      date: '2026-11-10',
    });
  });

  it('001-AS4: rejects an unknown site in the list', () => {
    const result = listTripsQuerySchema.safeParse({ site: 'thies', date: '2026-11-10' });
    expect(result.error?.issues[0]?.path).toEqual(['site']);
  });
});
