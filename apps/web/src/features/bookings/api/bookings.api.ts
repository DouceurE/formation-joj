import {
  type BookingConfirmationResponse,
  type BookingViewResponse,
  type BookSeatInput,
  bookingConfirmationSchema,
  bookingViewSchema,
} from '@joj/shared';
import { api } from '@/lib/api';

/**
 * Les appels HTTP de la réservation, sans React ni cache : un appel par route de l'API (TR2,
 * TR3), réponse validée par le schéma partagé. Le cache et les hooks sont dans `bookings.queries.ts`.
 */
export const bookingsApi = {
  book: (tripId: string, input: BookSeatInput) =>
    api.request<BookingConfirmationResponse>(`/trips/${tripId}/bookings`, {
      method: 'POST',
      body: input,
      schema: bookingConfirmationSchema,
    }),

  get: (code: string, signal?: AbortSignal) =>
    api.request<BookingViewResponse>(`/bookings/${encodeURIComponent(code)}`, {
      schema: bookingViewSchema,
      signal,
    }),

  cancel: (code: string) =>
    api.request<BookingViewResponse>('/bookings/cancel', {
      method: 'POST',
      body: { bookingCode: code },
      schema: bookingViewSchema,
    }),
};
