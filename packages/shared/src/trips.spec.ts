import { describe, expect, it } from 'vitest';
import {
  listOfficialLinesQuerySchema,
  OFFICIAL_LINE_OPERATORS,
  officialLineSchema,
  BOOKING_STATUSES,
  bookingCodeParamsSchema,
  bookingViewSchema,
  cancelBookingSchema,
  cancelTripSchema,
  bookSeatSchema,
  listTripsQuerySchema,
  publishTripSchema,
  tripIdParamsSchema,
} from './trips.ts';

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

describe('bookSeatSchema', () => {
  const booking = { passengerName: 'Moussa', passengerPhone: '78 555 66 77' };
  const pathOf = (input: unknown) => bookSeatSchema.safeParse(input).error?.issues[0]?.path;

  it('002-AS1: accepts a passenger name and phone, trimmed', () => {
    expect(
      bookSeatSchema.parse({ passengerName: ' Moussa ', passengerPhone: ' 78 555 66 77 ' }),
    ).toEqual(booking);
  });

  it('002-AS7: rejects a booking without a phone', () => {
    expect(pathOf({ passengerName: 'Moussa' })).toEqual(['passengerPhone']);
  });

  it('002-AS7: rejects a booking without a name', () => {
    expect(pathOf({ passengerPhone: '78 555 66 77' })).toEqual(['passengerName']);
  });

  it.each(['passengerName', 'passengerPhone'])('002-AS7: rejects a blank %s', (field) => {
    expect(pathOf({ ...booking, [field]: '   ' })).toEqual([field]);
  });
});

describe('tripIdParamsSchema', () => {
  it('002-AS6: accepts a uuid and rejects anything else', () => {
    const id = '0199f5c2-0000-7000-8000-000000000101';
    expect(tripIdParamsSchema.parse({ id })).toEqual({ id });
    expect(tripIdParamsSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});

describe('cancellation schemas', () => {
  it('003-AS1: accepts an 8-character booking code, trimmed', () => {
    expect(cancelBookingSchema.parse({ bookingCode: ' B7Q2M9XA ' })).toEqual({
      bookingCode: 'B7Q2M9XA',
    });
    expect(cancelTripSchema.parse({ managementCode: 'K7Q2M9XA' })).toEqual({
      managementCode: 'K7Q2M9XA',
    });
  });

  it.each(['', 'ABC', 'B7Q2M9XAZ'])(
    '003-AS2: rejects a code that is not 8 characters long (%j)',
    (code) => {
      expect(cancelBookingSchema.safeParse({ bookingCode: code }).error?.issues[0]?.path).toEqual([
        'bookingCode',
      ]);
      expect(cancelTripSchema.safeParse({ managementCode: code }).error?.issues[0]?.path).toEqual([
        'managementCode',
      ]);
      expect(bookingCodeParamsSchema.safeParse({ code }).error?.issues[0]?.path).toEqual(['code']);
    },
  );

  it('003-AS6: knows the three booking statuses', () => {
    expect(BOOKING_STATUSES).toEqual(['confirmee', 'annulee', 'trajet-annule']);
    const view = {
      id: '0199f5c2-0000-7000-8000-000000000201',
      bookingCode: 'B7Q2M9XA',
      status: 'trajet-annule',
      tripId: '0199f5c2-0000-7000-8000-000000000101',
      passengerName: 'Moussa',
      departurePlace: 'Pikine',
      departureAt: '2026-11-10T08:00:00.000Z',
      driverPhone: '77 123 45 67',
      createdAt: '2026-11-09T09:00:00.000Z',
    };
    expect(bookingViewSchema.parse(view)).toEqual(view);
    expect(bookingViewSchema.safeParse({ ...view, status: 'perdue' }).success).toBe(false);
  });
});

describe('official line schemas', () => {
  const line = {
    id: '0199f5c2-0000-7000-8000-0000000a0001',
    operator: 'navette-joj',
    name: 'Navette JOJ Dakar → Diamniadio (exemple)',
    departurePoint: 'Place de la Nation (exemple)',
    site: 'diamniadio',
  };

  it('004-AS1: describes an official line with its operator', () => {
    expect(OFFICIAL_LINE_OPERATORS).toEqual(['navette-joj', 'dakar-dem-dikk']);
    expect(officialLineSchema.parse(line)).toEqual(line);
    expect(officialLineSchema.safeParse({ ...line, operator: 'taxi' }).success).toBe(false);
  });

  it('004-AS3: asks for one of the three sites', () => {
    expect(listOfficialLinesQuerySchema.parse({ site: 'dakar' })).toEqual({ site: 'dakar' });
    expect(
      listOfficialLinesQuerySchema.safeParse({ site: 'thies' }).error?.issues[0]?.path,
    ).toEqual(['site']);
  });
});
