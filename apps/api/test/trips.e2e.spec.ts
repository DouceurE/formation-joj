import type { INestApplication } from '@nestjs/common';
import { bookingConfirmationSchema, publishedTripSchema, tripListSchema } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
