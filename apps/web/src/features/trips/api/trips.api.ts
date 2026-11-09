import {
  type OfficialLineResponse,
  officialLineListSchema,
  type TripResponse,
  type TripSite,
  tripListSchema,
} from '@joj/shared';
import { api } from '@/lib/api';

/**
 * Les appels HTTP des départs, sans React ni cache : un appel par route de l'API, réponse
 * validée par le schéma partagé. Le cache et les hooks sont dans `trips.queries.ts`.
 */
export const tripsApi = {
  /** Les covoiturages d'un site pour un jour (TR1), triés par heure par l'API. */
  listTrips: (site: TripSite, date: string, signal?: AbortSignal) =>
    api.request<TripResponse[]>(`/trips?${new URLSearchParams({ site, date })}`, {
      schema: tripListSchema,
      signal,
    }),

  /** Les lignes officielles qui desservent un site (TR4). */
  listOfficialLines: (site: TripSite, signal?: AbortSignal) =>
    api.request<OfficialLineResponse[]>(`/official-lines?${new URLSearchParams({ site })}`, {
      schema: officialLineListSchema,
      signal,
    }),
};
