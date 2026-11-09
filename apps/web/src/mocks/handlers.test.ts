/**
 * La fausse API tient le même contrat que apps/api : si elle s'en écarte, les tests du front
 * passent contre une API qui n'existe pas. Ces tests l'appellent avec `fetch`, sans React.
 */
import {
  bookingConfirmationSchema,
  bookingViewSchema,
  cancelledTripSchema,
  officialLineListSchema,
  publishedTripSchema,
  tripListSchema,
  tripProposalSchema,
} from '@joj/shared';
import { describe, expect, it } from 'vitest';
import {
  BOOKING_ON_CANCELLED_TRIP,
  cancelledTrip,
  carAt8,
  departedCar,
  DRIVER_PHONES,
  fixture,
  fullTaxi,
  MANAGEMENT_CODES,
  ndiagaAt10,
  pikineProposal,
} from './fixture';

const call = (path: string) => fetch(`http://localhost${path}`);

describe('mock trips API', () => {
  it('006-AS2: serves the trips of a site for a day, sorted by departure', async () => {
    const response = await call('/api/trips?site=diamniadio&date=2026-11-10');

    expect(response.status).toBe(200);
    expect(tripListSchema.parse(await response.json())).toEqual([carAt8, ndiagaAt10]);
  });

  it('006-AS2: serves an empty list for a day without departure', async () => {
    const response = await call('/api/trips?site=saly&date=2026-11-12');
    expect(await response.json()).toEqual([]);
  });

  it('006-AS2: rejects an unknown site like the API (400, VALIDATION_FAILED)', async () => {
    const response = await call('/api/trips?site=thies&date=2026-11-10');

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [expect.objectContaining({ path: 'site' })],
    });
  });
});

describe('mock official lines API', () => {
  it('006-AS3: serves the official lines of a site', async () => {
    const response = await call('/api/official-lines?site=diamniadio');

    expect(response.status).toBe(200);
    const lines = officialLineListSchema.parse(await response.json());
    expect(lines.map((line) => line.operator)).toEqual(['navette-joj', 'dakar-dem-dikk']);
  });

  it('006-AS3: serves no official line for Dakar', async () => {
    expect(await (await call('/api/official-lines?site=dakar')).json()).toEqual([]);
  });
});

const post = (path: string, body: unknown) =>
  fetch(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const moussa = { passengerName: 'Moussa', passengerPhone: '78 555 66 77' };

describe('mock bookings API', () => {
  it('007-AS2: books a seat, returns the confirmation and lowers the remaining seats', async () => {
    const response = await post(`/api/trips/${carAt8.id}/bookings`, moussa);

    expect(response.status).toBe(201);
    expect(bookingConfirmationSchema.parse(await response.json())).toMatchObject({
      tripId: carAt8.id,
      passengerName: 'Moussa',
      departurePlace: 'Parcelles',
      departureAt: carAt8.departureAt,
      driverPhone: DRIVER_PHONES[carAt8.id],
    });
    const trips = await (await call('/api/trips?site=diamniadio&date=2026-11-10')).json();
    expect(trips[0].remainingSeats).toBe(carAt8.remainingSeats - 1);
  });

  it('007-AS4: refuses a booking on a full trip like the API (409, TRIP_FULL)', async () => {
    const response = await post(`/api/trips/${fullTaxi.id}/bookings`, moussa);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'TRIP_FULL' });
  });

  it('007-AS4: refuses the same phone twice on a trip, spaces aside (409, TRIP_ALREADY_BOOKED)', async () => {
    await post(`/api/trips/${carAt8.id}/bookings`, moussa);
    const response = await post(`/api/trips/${carAt8.id}/bookings`, {
      ...moussa,
      passengerPhone: '785556677',
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'TRIP_ALREADY_BOOKED' });
  });

  it('007-AS4: refuses a booking on a departed trip (422, TRIP_ALREADY_DEPARTED)', async () => {
    const response = await post(`/api/trips/${departedCar.id}/bookings`, moussa);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'TRIP_ALREADY_DEPARTED' });
  });

  it('007-AS4: refuses a booking without a phone (400, VALIDATION_FAILED)', async () => {
    const response = await post(`/api/trips/${carAt8.id}/bookings`, { passengerName: 'Moussa' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [expect.objectContaining({ path: 'passengerPhone' })],
    });
  });

  it('007-AS5: finds a booking by its code, and refuses an unknown code (404)', async () => {
    const booked = await (await post(`/api/trips/${carAt8.id}/bookings`, moussa)).json();

    const found = await call(`/api/bookings/${booked.bookingCode}`);
    expect(found.status).toBe(200);
    expect(bookingViewSchema.parse(await found.json())).toMatchObject({ status: 'confirmee' });

    const unknown = await call('/api/bookings/ZZZZ9999');
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  });

  it('007-AS6: cancels a booking, gives the seat back, and refuses a second cancellation', async () => {
    const booked = await (await post(`/api/trips/${carAt8.id}/bookings`, moussa)).json();

    const cancelled = await post('/api/bookings/cancel', { bookingCode: booked.bookingCode });
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toMatchObject({ status: 'annulee' });
    const trips = await (await call('/api/trips?site=diamniadio&date=2026-11-10')).json();
    expect(trips[0].remainingSeats).toBe(carAt8.remainingSeats);

    const again = await post('/api/bookings/cancel', { bookingCode: booked.bookingCode });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ code: 'BOOKING_ALREADY_CANCELLED' });
  });

  it('007-AS6: shows « trajet annulé » for a booking on a trip cancelled by its driver', async () => {
    const response = await call(`/api/bookings/${BOOKING_ON_CANCELLED_TRIP}`);
    expect(await response.json()).toMatchObject({ status: 'trajet-annule' });
  });
});

const ndiagaFromPikine = {
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-10T08:00:00.000Z',
  seats: 38,
  priceFcfa: 500,
  driverPhone: '77 123 45 67',
};

describe('mock trip publication API', () => {
  it('008-AS1: publishes a trip with its management code and lists it among the departures', async () => {
    const response = await post('/api/trips', ndiagaFromPikine);

    expect(response.status).toBe(201);
    const published = publishedTripSchema.parse(await response.json());
    expect(published).toMatchObject({ vehicle: 'ndiaga-ndiaye', seats: 38, remainingSeats: 38 });
    const trips = tripListSchema.parse(
      await (await call('/api/trips?site=diamniadio&date=2026-11-10')).json(),
    );
    const listed = trips.find((trip) => trip.id === published.id);
    expect(listed).toMatchObject({ departurePlace: 'Pikine', remainingSeats: 38 });
    expect(listed).not.toHaveProperty('managementCode');
  });

  it('008-AS2: refuses a car with 5 seats like the API (400, SEATS_OUT_OF_RANGE)', async () => {
    const response = await post('/api/trips', {
      ...ndiagaFromPikine,
      vehicle: 'voiture',
      seats: 5,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'SEATS_OUT_OF_RANGE',
      details: { vehicle: 'voiture', max: 4 },
    });
  });

  it('008-AS2: refuses a departure in the past (422, DEPARTURE_IN_PAST)', async () => {
    const response = await post('/api/trips', {
      ...ndiagaFromPikine,
      departureAt: '2026-11-09T08:00:00.000Z',
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'DEPARTURE_IN_PAST' });
  });

  it('008-AS2: refuses a trip without a phone (400, VALIDATION_FAILED)', async () => {
    const { driverPhone: _phone, ...withoutPhone } = ndiagaFromPikine;
    const response = await post('/api/trips', withoutPhone);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [expect.objectContaining({ path: 'driverPhone' })],
    });
  });

  it('008-AS3: reads an announcement into a proposal, without publishing it', async () => {
    const before = await (await call('/api/trips?site=diamniadio&date=2026-11-10')).json();

    const response = await post('/api/trips/proposals', {
      message: 'je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places',
    });

    expect(response.status).toBe(200);
    expect(tripProposalSchema.parse(await response.json())).toEqual(pikineProposal);
    const after = await (await call('/api/trips?site=diamniadio&date=2026-11-10')).json();
    expect(after).toEqual(before);
  });

  it.each([
    'PROPOSAL_SITE_NOT_FOUND',
    'PROPOSAL_DEPARTURE_NOT_FOUND',
    'ASSISTANT_UNAVAILABLE',
  ] as const)('008-AS4: answers %s (422) when the test chooses it', async (code) => {
    fixture.proposalAnswer = code;

    const response = await post('/api/trips/proposals', { message: 'on se voit au stade' });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code });
  });

  it('008-AS5: cancels a trip with its management code and removes it from the departures', async () => {
    const response = await post('/api/trips/cancel', {
      managementCode: MANAGEMENT_CODES[ndiagaAt10.id],
    });

    expect(response.status).toBe(200);
    expect(cancelledTripSchema.parse(await response.json())).toMatchObject({ id: ndiagaAt10.id });
    const trips = await (await call('/api/trips?site=diamniadio&date=2026-11-10')).json();
    expect(trips).toEqual([carAt8]);
  });

  it('008-AS5: refuses an unknown code (404) and a trip already cancelled (409)', async () => {
    const unknown = await post('/api/trips/cancel', { managementCode: 'ZZZZ9999' });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ code: 'TRIP_NOT_FOUND' });

    const again = await post('/api/trips/cancel', {
      managementCode: MANAGEMENT_CODES[cancelledTrip.id],
    });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ code: 'TRIP_ALREADY_CANCELLED' });
  });

  it('008-AS5: refuses a code that is not 8 characters (400, VALIDATION_FAILED)', async () => {
    const response = await post('/api/trips/cancel', { managementCode: 'ABC' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
