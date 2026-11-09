import type { BookSeatInput } from '@joj/shared';
import { queryOptions, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { tripKeys } from '@/features/trips/api/trips.queries';
import { bookingsApi } from './bookings.api';

/** Clés du cache TanStack Query pour les réservations. */
export const bookingKeys = {
  all: ['bookings'] as const,
  detail: (code: string) => [...bookingKeys.all, code] as const,
};

export const bookingQueryOptions = (code: string) =>
  queryOptions({
    queryKey: bookingKeys.detail(code),
    queryFn: ({ signal }) => bookingsApi.get(code, signal),
  });

/** Chaque code gardé dans le téléphone, relu auprès de l'API. */
export const useBookings = (codes: string[]) =>
  useQueries({ queries: codes.map((code) => bookingQueryOptions(code)) });

export function useBookSeat(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookSeatInput) => bookingsApi.book(tripId, input),
    // Les départs sont relus : le compteur de places descend avec la valeur de l'API.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.all }),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.cancel,
    // La réservation et les départs : la place revient au trajet.
    onSettled: async (_view, _error, code) => {
      await queryClient.invalidateQueries({ queryKey: bookingKeys.detail(code) });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
