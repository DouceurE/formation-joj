import {
  type PublishedTripResponse,
  type PublishTripInput,
  publishedTripSchema,
  type TripProposalResponse,
  tripProposalSchema,
} from '@joj/shared';
import { api } from '@/lib/api';

/**
 * Les appels HTTP du conducteur, sans React ni cache : un appel par route de l'API, réponse
 * validée par le schéma partagé. Les hooks sont dans `publish.queries.ts`.
 */
export const publishApi = {
  publish: (input: PublishTripInput) =>
    api.request<PublishedTripResponse>('/trips', {
      method: 'POST',
      body: input,
      schema: publishedTripSchema,
    }),

  /** L'annonce lue par l'assistant : une proposition à relire, rien n'est publié. */
  propose: (message: string) =>
    api.request<TripProposalResponse>('/trips/proposals', {
      method: 'POST',
      body: { message },
      schema: tripProposalSchema,
    }),
};
