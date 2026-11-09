import type { ExtractedTrip } from '../domain/trip-proposal';

/**
 * Port de l'assistant IA : lire une annonce libre et en renvoyer les champs reconnus.
 * Implémenté par ClaudeTripExtractor (infra) et FakeTripExtractor (tests).
 */
export abstract class TripExtractor {
  /** `now` situe « demain » ou « ce soir ». Lève ASSISTANT_UNAVAILABLE si l'assistant échoue. */
  abstract extract(message: string, now: Date): Promise<ExtractedTrip>;
}
