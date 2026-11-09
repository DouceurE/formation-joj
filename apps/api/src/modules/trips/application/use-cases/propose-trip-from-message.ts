import { Injectable } from '@nestjs/common';
import type { ProposeTripInput } from '@joj/shared';
import { proposeTrip, type TripProposal } from '../../domain/trip-proposal';
import { TripExtractor } from '../trip-extractor';

/** Propose un trajet lu dans un message ; ne publie rien : le conducteur confirme par TR1. */
@Injectable()
export class ProposeTripFromMessage {
  constructor(private readonly extractor: TripExtractor) {}

  async execute({ message }: ProposeTripInput): Promise<TripProposal> {
    return proposeTrip(await this.extractor.extract(message, new Date()));
  }
}
