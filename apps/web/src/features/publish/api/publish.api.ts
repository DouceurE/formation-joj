import {
  type PublishedTripResponse,
  type PublishTripInput,
  publishedTripSchema,
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
};
