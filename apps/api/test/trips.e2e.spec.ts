import type { INestApplication } from '@nestjs/common';
import {
  bookingConfirmationSchema,
  bookingViewSchema,
  cancelledTripSchema,
  officialLineListSchema,
  publishedTripSchema,
  tripListSchema,
  tripProposalSchema,
} from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TripExtractor } from '../src/modules/trips/application/trip-extractor';
import type { FakeTripExtractor } from '../src/modules/trips/application/testing/fake-trip-extractor';
import { createTestApp } from './create-test-app';

// L'API lit la vraie horloge : un jour lointain pour les départs à venir.
const DAY = '2030-11-10';
const ndiaga = {
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: `${DAY}T08:00:00.000Z`,
  seats: 38,
  priceFcfa: 500,
  driverPhone: '77 123 45 67',
};

describe('/api/trips (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  it('001-AS1: publishes a Ndiaga Ndiaye of 38 seats (201) with a management code', async () => {
    const response = await api().post('/api/trips').send(ndiaga).expect(201);

    expect(publishedTripSchema.parse(response.body)).toMatchObject({
      vehicle: 'ndiaga-ndiaye',
      departurePlace: 'Pikine',
      site: 'diamniadio',
      seats: 38,
      remainingSeats: 38,
      priceFcfa: 500,
    });
    expect(response.body.managementCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(response.body).not.toHaveProperty('driverPhone');
  });

  it('001-AS2: rejects a car with 5 seats (400, SEATS_OUT_OF_RANGE)', async () => {
    const response = await api()
      .post('/api/trips')
      .send({ ...ndiaga, site: 'dakar', vehicle: 'voiture', seats: 5 })
      .expect(400);

    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 400, code: 'SEATS_OUT_OF_RANGE' });
    await api().get(`/api/trips?site=dakar&date=${DAY}`).expect(200, []);
  });

  it('001-AS3: rejects a departure in the past (422, DEPARTURE_IN_PAST)', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const date = yesterday.toISOString().slice(0, 10);
    const response = await api()
      .post('/api/trips')
      .send({ ...ndiaga, site: 'saly', departureAt: yesterday.toISOString() })
      .expect(422);

    expect(response.body).toMatchObject({ status: 422, code: 'DEPARTURE_IN_PAST' });
    await api().get(`/api/trips?site=saly&date=${date}`).expect(200, []);
  });

  it('001-AS4: rejects an unknown site (400, VALIDATION_FAILED)', async () => {
    const response = await api()
      .post('/api/trips')
      .send({ ...ndiaga, site: 'thies' })
      .expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(response.body.errors).toEqual([expect.objectContaining({ path: 'site' })]);
  });

  it('001-AS4: rejects a trip without a phone and a negative price (400)', async () => {
    const { driverPhone: _omitted, ...withoutPhone } = ndiaga;
    const response = await api()
      .post('/api/trips')
      .send({ ...withoutPhone, priceFcfa: -1 })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.errors.map((error: { path: string }) => error.path).sort()).toEqual([
      'driverPhone',
      'priceFcfa',
    ]);
  });

  it('001-AS5: lists the departures of the day to a site by time, without phone nor code', async () => {
    const day = '2030-11-20';
    const at = (time: string) => `${day}T${time}:00.000Z`;
    await api()
      .post('/api/trips')
      .send({ ...ndiaga, departureAt: at('10:00') })
      .expect(201);
    await api()
      .post('/api/trips')
      .send({ ...ndiaga, vehicle: 'taxi', seats: 3, departureAt: at('08:00') })
      .expect(201);
    await api()
      .post('/api/trips')
      .send({ ...ndiaga, departureAt: '2030-11-21T08:00:00.000Z' })
      .expect(201);
    await api()
      .post('/api/trips')
      .send({ ...ndiaga, site: 'saly', departureAt: at('09:00') })
      .expect(201);

    const response = await api().get(`/api/trips?site=diamniadio&date=${day}`).expect(200);

    const listed = tripListSchema.parse(response.body);
    expect(listed.map((trip) => [trip.vehicle, trip.departureAt, trip.remainingSeats])).toEqual([
      ['taxi', at('08:00'), 3],
      ['ndiaga-ndiaye', at('10:00'), 38],
    ]);
    for (const trip of response.body) {
      expect(trip).not.toHaveProperty('driverPhone');
      expect(trip).not.toHaveProperty('managementCode');
    }
  });

  it('001-AS4: publishes a trip priced 3 000 000 000 FCFA without a server error', async () => {
    const response = await api()
      .post('/api/trips')
      .send({ ...ndiaga, site: 'dakar', departureAt: '2030-12-01T08:00:00.000Z', priceFcfa: 3e9 })
      .expect(201);
    expect(response.body.priceFcfa).toBe(3_000_000_000);

    const listed = await api().get('/api/trips?site=dakar&date=2030-12-01').expect(200);
    expect(listed.body.map((trip: { priceFcfa: number }) => trip.priceFcfa)).toEqual([
      3_000_000_000,
    ]);
  });

  it('001-AS6: returns an empty list for a day without departure (200)', async () => {
    const response = await api().get('/api/trips?site=saly&date=2030-11-12').expect(200);
    expect(response.body).toEqual([]);
  });
});

describe('/api/trips/:id/bookings (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const moussa = { passengerName: 'Moussa', passengerPhone: '78 555 66 77' };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  /** Publie un trajet sur un jour propre au test, et renvoie son identifiant. */
  async function publish(day: string, overrides: Record<string, unknown> = {}): Promise<string> {
    const response = await api()
      .post('/api/trips')
      .send({ ...ndiaga, departureAt: `${day}T08:00:00.000Z`, ...overrides })
      .expect(201);
    return response.body.id;
  }

  async function remainingSeats(day: string): Promise<number | undefined> {
    const response = await api().get(`/api/trips?site=diamniadio&date=${day}`).expect(200);
    return tripListSchema.parse(response.body)[0]?.remainingSeats;
  }

  it('002-AS1: books a seat (201) with the booking code, departure and driver phone', async () => {
    const id = await publish('2031-01-01');

    const response = await api().post(`/api/trips/${id}/bookings`).send(moussa).expect(201);

    expect(bookingConfirmationSchema.parse(response.body)).toMatchObject({
      tripId: id,
      passengerName: 'Moussa',
      departurePlace: 'Pikine',
      departureAt: '2031-01-01T08:00:00.000Z',
      driverPhone: '77 123 45 67',
    });
    expect(response.body.bookingCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await remainingSeats('2031-01-01')).toBe(37);
  });

  it('002-AS2: rejects a second booking on a one-seat taxi (409, TRIP_FULL)', async () => {
    const id = await publish('2031-01-02', { vehicle: 'taxi', seats: 1 });
    await api().post(`/api/trips/${id}/bookings`).send(moussa).expect(201);

    const response = await api()
      .post(`/api/trips/${id}/bookings`)
      .send({ passengerName: 'Awa', passengerPhone: '70 222 22 22' })
      .expect(409);

    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 409, code: 'TRIP_FULL' });
    expect(await remainingSeats('2031-01-02')).toBe(0);
  });

  it('002-AS4: rejects the same phone twice on a trip (409, TRIP_ALREADY_BOOKED)', async () => {
    const id = await publish('2031-01-03');
    await api().post(`/api/trips/${id}/bookings`).send(moussa).expect(201);

    const response = await api()
      .post(`/api/trips/${id}/bookings`)
      .send({ ...moussa, passengerPhone: '785556677' })
      .expect(409);

    expect(response.body).toMatchObject({ status: 409, code: 'TRIP_ALREADY_BOOKED' });
    expect(await remainingSeats('2031-01-03')).toBe(37);
  });

  it('002-AS6: rejects a booking on an unknown trip (404, TRIP_NOT_FOUND)', async () => {
    const response = await api()
      .post('/api/trips/0199f5c2-0000-7000-8000-00000000dead/bookings')
      .send(moussa)
      .expect(404);

    expect(response.body).toMatchObject({ status: 404, code: 'TRIP_NOT_FOUND' });
  });

  it('002-AS7: rejects a booking without a phone (400, VALIDATION_FAILED)', async () => {
    const id = await publish('2031-01-04');

    const response = await api()
      .post(`/api/trips/${id}/bookings`)
      .send({ passengerName: 'Moussa' })
      .expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(response.body.errors).toEqual([expect.objectContaining({ path: 'passengerPhone' })]);
    expect(await remainingSeats('2031-01-04')).toBe(38);
  });
});

describe('cancellations (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const moussa = { passengerName: 'Moussa', passengerPhone: '78 555 66 77' };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  /** Publie un trajet vers Diamniadio un jour propre au test, et y réserve la place de Moussa. */
  async function bookedTrip(day: string) {
    const published = await api()
      .post('/api/trips')
      .send({ ...ndiaga, departureAt: `${day}T08:00:00.000Z` })
      .expect(201);
    const booked = await api()
      .post(`/api/trips/${published.body.id}/bookings`)
      .send(moussa)
      .expect(201);
    return {
      tripId: published.body.id as string,
      managementCode: published.body.managementCode as string,
      bookingCode: booked.body.bookingCode as string,
    };
  }

  async function listed(day: string) {
    const response = await api().get(`/api/trips?site=diamniadio&date=${day}`).expect(200);
    return tripListSchema.parse(response.body);
  }

  it('003-AS1: cancels a booking (200) and frees its seat', async () => {
    const { bookingCode } = await bookedTrip('2031-02-01');

    const response = await api().post('/api/bookings/cancel').send({ bookingCode }).expect(200);

    expect(bookingViewSchema.parse(response.body)).toMatchObject({
      bookingCode,
      status: 'annulee',
    });
    expect((await listed('2031-02-01'))[0]?.remainingSeats).toBe(38);
  });

  it('003-AS2: answers 404 to an unknown code on the three routes', async () => {
    const cancelBooking = await api()
      .post('/api/bookings/cancel')
      .send({ bookingCode: 'ZZZZ9999' })
      .expect(404);
    expect(cancelBooking.body).toMatchObject({ status: 404, code: 'BOOKING_NOT_FOUND' });

    const getBooking = await api().get('/api/bookings/ZZZZ9999').expect(404);
    expect(getBooking.body).toMatchObject({ status: 404, code: 'BOOKING_NOT_FOUND' });

    const cancelTrip = await api()
      .post('/api/trips/cancel')
      .send({ managementCode: 'ZZZZ9999' })
      .expect(404);
    expect(cancelTrip.body).toMatchObject({ status: 404, code: 'TRIP_NOT_FOUND' });
  });

  it('003-AS3: rejects a second cancellation of a booking (409, BOOKING_ALREADY_CANCELLED)', async () => {
    const { bookingCode } = await bookedTrip('2031-02-02');
    await api().post('/api/bookings/cancel').send({ bookingCode }).expect(200);

    const response = await api().post('/api/bookings/cancel').send({ bookingCode }).expect(409);

    expect(response.body).toMatchObject({ status: 409, code: 'BOOKING_ALREADY_CANCELLED' });
    expect((await listed('2031-02-02'))[0]?.remainingSeats).toBe(38);
  });

  it('003-AS4: cancels a trip (200), which leaves the list of departures', async () => {
    const { tripId, managementCode } = await bookedTrip('2031-02-03');

    const response = await api().post('/api/trips/cancel').send({ managementCode }).expect(200);

    expect(cancelledTripSchema.parse(response.body).id).toBe(tripId);
    expect(await listed('2031-02-03')).toEqual([]);
  });

  it('003-AS5: rejects a second cancellation of a trip (409, TRIP_ALREADY_CANCELLED)', async () => {
    const { managementCode } = await bookedTrip('2031-02-04');
    await api().post('/api/trips/cancel').send({ managementCode }).expect(200);

    const response = await api().post('/api/trips/cancel').send({ managementCode }).expect(409);

    expect(response.body).toMatchObject({ status: 409, code: 'TRIP_ALREADY_CANCELLED' });
  });

  it('003-AS6: shows a confirmed booking, then a cancelled trip', async () => {
    const { bookingCode, managementCode } = await bookedTrip('2031-02-05');

    const before = await api().get(`/api/bookings/${bookingCode}`).expect(200);
    expect(bookingViewSchema.parse(before.body)).toMatchObject({
      status: 'confirmee',
      departurePlace: 'Pikine',
      departureAt: '2031-02-05T08:00:00.000Z',
      driverPhone: '77 123 45 67',
    });

    await api().post('/api/trips/cancel').send({ managementCode }).expect(200);
    const after = await api().get(`/api/bookings/${bookingCode}`).expect(200);
    expect(after.body.status).toBe('trajet-annule');
  });

  it('003-AS7: rejects a booking on a cancelled trip (422, TRIP_CANCELLED)', async () => {
    const { tripId, managementCode } = await bookedTrip('2031-02-06');
    await api().post('/api/trips/cancel').send({ managementCode }).expect(200);

    const response = await api()
      .post(`/api/trips/${tripId}/bookings`)
      .send({ passengerName: 'Awa', passengerPhone: '70 222 22 22' })
      .expect(422);

    expect(response.body).toMatchObject({ status: 422, code: 'TRIP_CANCELLED' });
  });
});

describe('/api/official-lines (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  async function officialLines(site: string) {
    const response = await api().get(`/api/official-lines?site=${site}`).expect(200);
    return officialLineListSchema.parse(response.body);
  }

  it('004-AS1: lists the 2 official lines to Diamniadio, beside unchanged carpools', async () => {
    await api()
      .post('/api/trips')
      .send({ ...ndiaga, departureAt: '2031-03-01T08:00:00.000Z' })
      .expect(201);

    const lines = await officialLines('diamniadio');
    expect(lines.map((line) => [line.operator, line.site])).toEqual([
      ['navette-joj', 'diamniadio'],
      ['dakar-dem-dikk', 'diamniadio'],
    ]);
    for (const line of lines) expect(line.departurePoint).not.toBe('');
    const trips = await api().get('/api/trips?site=diamniadio&date=2031-03-01').expect(200);
    expect(tripListSchema.parse(trips.body)).toHaveLength(1);
  });

  it('004-AS2: still lists the official lines on a day without carpool', async () => {
    const trips = await api().get('/api/trips?site=diamniadio&date=2031-03-12').expect(200);
    expect(trips.body).toEqual([]);
    expect(await officialLines('diamniadio')).toHaveLength(2);
  });

  it('004-AS3: returns an empty list for a site without official line (200)', async () => {
    expect(await officialLines('dakar')).toEqual([]);
  });

  it('004-AS4: refuses a booking on an official line (404, TRIP_NOT_FOUND)', async () => {
    const [line] = await officialLines('diamniadio');

    const response = await api()
      .post(`/api/trips/${line?.id}/bookings`)
      .send({ passengerName: 'Moussa', passengerPhone: '78 555 66 77' })
      .expect(404);

    expect(response.body).toMatchObject({ status: 404, code: 'TRIP_NOT_FOUND' });
  });
});

describe('/api/trips/proposals (e2e, fake assistant)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const message = 'je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places';
  const ndiagaRead = {
    vehicle: 'ndiaga-ndiaye',
    departurePlace: 'Pikine',
    site: 'diamniadio',
    departureAt: '2031-04-10T08:00:00.000Z',
    seats: 38,
    priceFcfa: null,
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  async function propose(answer: typeof ndiagaRead | 'fail', expected: number) {
    // createTestApp remplace l'assistant par le faux : aucun test n'appelle Claude.
    const assistant = app.get<TripExtractor, FakeTripExtractor>(TripExtractor);
    if (answer === 'fail') assistant.willFail();
    else assistant.willReturn(answer);
    return api().post('/api/trips/proposals').send({ message }).expect(expected);
  }

  it('005-AS1: proposes the trip read in the message (200) without publishing it', async () => {
    const response = await propose(ndiagaRead, 200);

    expect(tripProposalSchema.parse(response.body)).toEqual(ndiagaRead);
    const listed = await api().get('/api/trips?site=diamniadio&date=2031-04-10').expect(200);
    expect(listed.body).toEqual([]);
  });

  it('005-AS2: publishes the completed proposal through TR1', async () => {
    const proposal = (
      await propose({ ...ndiagaRead, departureAt: '2031-04-11T08:00:00.000Z' }, 200)
    ).body;

    const published = await api()
      .post('/api/trips')
      .send({ ...proposal, priceFcfa: 500, driverPhone: '77 123 45 67' })
      .expect(201);

    expect(published.body.managementCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const listed = await api().get('/api/trips?site=diamniadio&date=2031-04-11').expect(200);
    expect(tripListSchema.parse(listed.body)[0]?.remainingSeats).toBe(38);
  });

  it('005-AS3: applies the rules of TR1 when the proposal is confirmed (400, 422)', async () => {
    const car = (await propose({ ...ndiagaRead, vehicle: 'voiture', seats: 5 }, 200)).body;
    const tooMany = await api()
      .post('/api/trips')
      .send({ ...car, priceFcfa: 0, driverPhone: '77 123 45 67' })
      .expect(400);
    expect(tooMany.body).toMatchObject({ status: 400, code: 'SEATS_OUT_OF_RANGE' });

    const past = (await propose({ ...ndiagaRead, departureAt: '2020-01-01T08:00:00.000Z' }, 200))
      .body;
    const late = await api()
      .post('/api/trips')
      .send({ ...past, priceFcfa: 0, driverPhone: '77 123 45 67' })
      .expect(422);
    expect(late.body).toMatchObject({ status: 422, code: 'DEPARTURE_IN_PAST' });
  });

  it('005-AS3: creates no trip when the confirmed proposal breaks a rule of TR1', async () => {
    const day = '2031-04-20';
    const car = (
      await propose(
        { ...ndiagaRead, vehicle: 'voiture', seats: 5, departureAt: `${day}T08:00:00.000Z` },
        200,
      )
    ).body;
    await api()
      .post('/api/trips')
      .send({ ...car, priceFcfa: 0, driverPhone: '77 123 45 67' })
      .expect(400);
    const past = (await propose({ ...ndiagaRead, departureAt: '2020-01-01T08:00:00.000Z' }, 200))
      .body;
    await api()
      .post('/api/trips')
      .send({ ...past, priceFcfa: 0, driverPhone: '77 123 45 67' })
      .expect(422);

    for (const date of [day, '2020-01-01']) {
      const listed = await api().get(`/api/trips?site=diamniadio&date=${date}`).expect(200);
      expect(listed.body).toEqual([]);
    }
  });

  it('005-AS4: refuses a message without a known site (422, PROPOSAL_SITE_NOT_FOUND)', async () => {
    const response = await propose({ ...ndiagaRead, site: null } as never, 422);
    expect(response.body).toMatchObject({ status: 422, code: 'PROPOSAL_SITE_NOT_FOUND' });
  });

  it('005-AS4: says that none of Dakar, Diamniadio and Saly was found', async () => {
    const response = await propose({ ...ndiagaRead, site: null } as never, 422);
    expect(response.body.detail).toMatch(/Dakar, Diamniadio and Saly/);
  });

  it('005-AS5: refuses a message without a departure time (422, PROPOSAL_DEPARTURE_NOT_FOUND)', async () => {
    const response = await propose({ ...ndiagaRead, departureAt: null } as never, 422);
    expect(response.body).toMatchObject({ status: 422, code: 'PROPOSAL_DEPARTURE_NOT_FOUND' });
  });

  it('005-AS5: says that no departure time was found', async () => {
    const response = await propose({ ...ndiagaRead, departureAt: null } as never, 422);
    expect(response.body.detail).toMatch(/departure time/);
  });

  it('005-AS6: refuses when the assistant is unavailable (422, ASSISTANT_UNAVAILABLE)', async () => {
    const response = await propose('fail', 422);
    expect(response.body).toMatchObject({ status: 422, code: 'ASSISTANT_UNAVAILABLE' });
    expect(response.body.detail).toMatch(/form/);
  });
});

describe('/api/trips/proposals publishes nothing when it refuses (e2e, fake assistant)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const day = '2031-05-10';
  const read = {
    vehicle: 'ndiaga-ndiaye',
    departurePlace: 'Pikine',
    site: 'diamniadio',
    departureAt: `${day}T08:00:00.000Z`,
    seats: 38,
    priceFcfa: null,
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  async function refusedThenListed(answer: Record<string, unknown> | 'fail', code: string) {
    const assistant = app.get<TripExtractor, FakeTripExtractor>(TripExtractor);
    if (answer === 'fail') assistant.willFail();
    else assistant.willReturn(answer as never);
    const response = await api()
      .post('/api/trips/proposals')
      .send({ message: 'je pars de Pikine demain 8h' })
      .expect(422);
    expect(response.body.code).toBe(code);
    const listed = await api().get(`/api/trips?site=diamniadio&date=${day}`).expect(200);
    return listed.body;
  }

  it('005-AS4: publishes nothing for a message without a known site', async () => {
    expect(await refusedThenListed({ ...read, site: null }, 'PROPOSAL_SITE_NOT_FOUND')).toEqual([]);
  });

  it('005-AS5: publishes nothing for a message without a departure time', async () => {
    expect(
      await refusedThenListed({ ...read, departureAt: null }, 'PROPOSAL_DEPARTURE_NOT_FOUND'),
    ).toEqual([]);
  });

  it('005-AS6: publishes nothing when the assistant is unavailable', async () => {
    expect(await refusedThenListed('fail', 'ASSISTANT_UNAVAILABLE')).toEqual([]);
  });
});
