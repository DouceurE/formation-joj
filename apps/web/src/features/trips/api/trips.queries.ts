import type { TripSite } from '@joj/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { tripsApi } from './trips.api';

/** Clés du cache TanStack Query pour les départs. */
export const tripKeys = {
  all: ['trips'] as const,
  day: (site: TripSite, date: string) => [...tripKeys.all, site, date] as const,
  officialLines: (site: TripSite) => ['official-lines', site] as const,
};

export const tripsOfDayQueryOptions = (site: TripSite, date: string) =>
  queryOptions({
    queryKey: tripKeys.day(site, date),
    queryFn: ({ signal }) => tripsApi.listTrips(site, date, signal),
  });

export const officialLinesQueryOptions = (site: TripSite) =>
  queryOptions({
    queryKey: tripKeys.officialLines(site),
    queryFn: ({ signal }) => tripsApi.listOfficialLines(site, signal),
    // La liste fixe ne change pas pendant une visite.
    staleTime: Number.POSITIVE_INFINITY,
  });

export const useTripsOfDay = (site: TripSite, date: string) =>
  useQuery(tripsOfDayQueryOptions(site, date));

export const useOfficialLines = (site: TripSite) => useQuery(officialLinesQueryOptions(site));
