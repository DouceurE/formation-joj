import {
  type BookingStatus,
  bookingCodeParamsSchema,
  bookSeatSchema,
  cancelBookingSchema,
  listOfficialLinesQuerySchema,
  listTripsQuerySchema,
  type ProblemDetails,
} from '@joj/shared';
import { delay, http, HttpResponse, type RequestHandler } from 'msw';
import type { z } from 'zod';
import { mockControl } from './control';
import { DRIVER_PHONES, fixture, MOCK_NOW, type MockBooking } from './fixture';

/**
 * La fausse API des tests du front : le même contrat que apps/api (mêmes schémas zod, mêmes
 * codes d'erreur, même format RFC 9457), sur les données de `fixture.ts`. Une nouvelle route
 * de l'API s'ajoute ici (un `http.get`, `http.post`… par route), avec son test dans `handlers.test.ts`.
 */

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
};

export function problem(
  status: number,
  code: string,
  detail: string,
  extra: Pick<ProblemDetails, 'errors' | 'details'> = {},
) {
  return HttpResponse.json(
    {
      type: `urn:problem-type:${code.toLowerCase().replaceAll('_', '-')}`,
      title: TITLES[status] ?? 'Error',
      status,
      code,
      detail,
      ...extra,
    } satisfies ProblemDetails,
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

/** Latence, puis panne armée par `mockControl` : renvoie la réponse d'erreur, ou `null`. */
export async function gate(method: string, path: string): Promise<Response | null> {
  if (mockControl.latency > 0) await delay(mockControl.latency);
  const status = mockControl.takeFailure(`${method} ${path}`);
  return status === null ? null : problem(status, 'INTERNAL_ERROR', 'Mocked failure.');
}

export function validationFailed(error: z.ZodError) {
  return problem(400, 'VALIDATION_FAILED', 'The request is invalid.', {
    errors: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Les paramètres de l'adresse, lus comme l'API : `?site=…&date=…`. */
const searchParams = (request: Request) =>
  Object.fromEntries(new URL(request.url).searchParams.entries());

export const handlers: RequestHandler[] = [
  // Comme l'API (TR1) : les trajets du site entre minuit et minuit GMT, triés par heure de départ.
  http.get('*/api/trips', async ({ request }) => {
    const failure = await gate('GET', '/api/trips');
    if (failure) return failure;
    const parsed = listTripsQuerySchema.safeParse(searchParams(request));
    if (!parsed.success) return validationFailed(parsed.error);
    const from = Date.parse(`${parsed.data.date}T00:00:00.000Z`);
    const trips = fixture.trips
      .filter((trip) => {
        const at = Date.parse(trip.departureAt);
        return (
          trip.site === parsed.data.site &&
          !fixture.cancelledTripIds.includes(trip.id) &&
          at >= from &&
          at < from + ONE_DAY_MS
        );
      })
      .sort((a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt));
    return HttpResponse.json(trips);
  }),

  // Comme l'API (TR4) : les lignes officielles du site, dans l'ordre de la liste fixe.
  http.get('*/api/official-lines', async ({ request }) => {
    const failure = await gate('GET', '/api/official-lines');
    if (failure) return failure;
    const parsed = listOfficialLinesQuerySchema.safeParse(searchParams(request));
    if (!parsed.success) return validationFailed(parsed.error);
    return HttpResponse.json(
      fixture.officialLines.filter((line) => line.site === parsed.data.site),
    );
  }),

  // Comme l'API (TR2) : trajet inconnu, annulé, parti, téléphone déjà inscrit, puis complet.
  http.post('*/api/trips/:id/bookings', async ({ params, request }) => {
    const failure = await gate('POST', '/api/trips/:id/bookings');
    if (failure) return failure;
    const trip = fixture.trips.find((t) => t.id === String(params['id']));
    if (!trip) return problem(404, 'TRIP_NOT_FOUND', 'No trip with this id');
    const parsed = bookSeatSchema.safeParse(await request.json());
    if (!parsed.success) return validationFailed(parsed.error);
    if (fixture.cancelledTripIds.includes(trip.id)) {
      return problem(422, 'TRIP_CANCELLED', 'This trip has been cancelled by its driver');
    }
    if (Date.parse(trip.departureAt) < Date.parse(MOCK_NOW)) {
      return problem(422, 'TRIP_ALREADY_DEPARTED', 'This trip has already departed');
    }
    const phone = parsed.data.passengerPhone.replace(/\s+/g, '');
    if (activeBookings(trip.id).some((b) => b.passengerPhone === phone)) {
      return problem(409, 'TRIP_ALREADY_BOOKED', 'This phone already has a booking on this trip');
    }
    if (trip.remainingSeats <= 0) return problem(409, 'TRIP_FULL', 'This trip is full');
    const booking: MockBooking = {
      id: crypto.randomUUID(),
      bookingCode: newBookingCode(),
      tripId: trip.id,
      passengerName: parsed.data.passengerName,
      passengerPhone: phone,
      createdAt: new Date().toISOString(),
      cancelledAt: null,
    };
    fixture.bookings.push(booking);
    trip.remainingSeats -= 1;
    return HttpResponse.json(confirmation(booking), { status: 201 });
  }),

  // Comme l'API (TR3) : la réservation consultée par son code, avec son statut.
  http.get('*/api/bookings/:code', async ({ params }) => {
    const failure = await gate('GET', '/api/bookings/:code');
    if (failure) return failure;
    const parsed = bookingCodeParamsSchema.safeParse({ code: params['code'] });
    if (!parsed.success) return validationFailed(parsed.error);
    const booking = findBooking(parsed.data.code);
    return booking ? HttpResponse.json(view(booking)) : bookingNotFound(parsed.data.code);
  }),

  // Comme l'API (TR3) : annuler une seule fois, et rendre la place au trajet.
  http.post('*/api/bookings/cancel', async ({ request }) => {
    const failure = await gate('POST', '/api/bookings/cancel');
    if (failure) return failure;
    const parsed = cancelBookingSchema.safeParse(await request.json());
    if (!parsed.success) return validationFailed(parsed.error);
    const booking = findBooking(parsed.data.bookingCode);
    if (!booking) return bookingNotFound(parsed.data.bookingCode);
    if (booking.cancelledAt) {
      return problem(409, 'BOOKING_ALREADY_CANCELLED', 'This booking is already cancelled');
    }
    booking.cancelledAt = new Date().toISOString();
    const trip = fixture.trips.find((t) => t.id === booking.tripId);
    if (trip) trip.remainingSeats += 1;
    return HttpResponse.json(view(booking));
  }),
];

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newBookingCode(): string {
  return Array.from(
    { length: 8 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join('');
}

const activeBookings = (tripId: string) =>
  fixture.bookings.filter((b) => b.tripId === tripId && !b.cancelledAt);

const findBooking = (code: string) => fixture.bookings.find((b) => b.bookingCode === code);

const bookingNotFound = (code: string) =>
  problem(404, 'BOOKING_NOT_FOUND', `No booking with code ${code}`, { details: { code } });

function confirmation(booking: MockBooking) {
  const trip = fixture.trips.find((t) => t.id === booking.tripId);
  return {
    id: booking.id,
    bookingCode: booking.bookingCode,
    tripId: booking.tripId,
    passengerName: booking.passengerName,
    departurePlace: trip?.departurePlace ?? '',
    departureAt: trip?.departureAt ?? booking.createdAt,
    driverPhone: DRIVER_PHONES[booking.tripId] ?? '',
    createdAt: booking.createdAt,
  };
}

/** Comme le domaine de l'API : l'annulation du supporter l'emporte sur celle du trajet. */
function view(booking: MockBooking) {
  const status: BookingStatus = booking.cancelledAt
    ? 'annulee'
    : fixture.cancelledTripIds.includes(booking.tripId)
      ? 'trajet-annule'
      : 'confirmee';
  return { ...confirmation(booking), status };
}
