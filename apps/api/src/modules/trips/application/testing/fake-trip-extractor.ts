import type { ExtractedTrip } from '../../domain/trip-proposal';
import { assistantUnavailable } from '../../domain/trips.errors';
import { TripExtractor } from '../trip-extractor';

/** Faux assistant : répond ce qu'on lui a dit, sans jamais appeler Claude. */
export class FakeTripExtractor extends TripExtractor {
  /** Les appels reçus, pour vérifier le message et l'instant transmis. */
  readonly calls: { message: string; now: Date }[] = [];
  private next: ExtractedTrip | 'fail' = 'fail';

  willReturn(extracted: ExtractedTrip): void {
    this.next = { ...extracted };
  }

  willFail(): void {
    this.next = 'fail';
  }

  async extract(message: string, now: Date): Promise<ExtractedTrip> {
    this.calls.push({ message, now });
    if (this.next === 'fail') throw assistantUnavailable();
    return { ...this.next };
  }
}
