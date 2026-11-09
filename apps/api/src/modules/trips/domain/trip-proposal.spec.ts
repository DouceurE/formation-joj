import { describe, expect, it } from 'vitest';
import { type ExtractedTrip, proposeTrip } from './trip-proposal';

// Ce que l'assistant lit dans « je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places ».
const extracted: ExtractedTrip = {
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-10T08:00:00.000Z',
  seats: 38,
  priceFcfa: null,
};

const rejection = (code: string) => expect.objectContaining({ code, kind: 'BUSINESS_RULE' });

describe('proposeTrip', () => {
  it('005-AS1: proposes the trip read in the message, with an empty price', () => {
    expect(proposeTrip(extracted)).toEqual({
      vehicle: 'ndiaga-ndiaye',
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: new Date('2026-11-10T08:00:00.000Z'),
      seats: 38,
      priceFcfa: null,
    });
  });

  it('005-AS1: leaves empty a vehicle it does not know, and seats or a price that are not whole numbers', () => {
    const proposal = proposeTrip({ ...extracted, vehicle: 'moto', seats: 2.5, priceFcfa: -10 });
    expect(proposal).toMatchObject({ vehicle: null, seats: null, priceFcfa: null });
    expect(proposeTrip({ ...extracted, departurePlace: '  ' }).departurePlace).toBeNull();
  });

  it.each([null, 'thies'])('005-AS4: refuses a message without a known site (%j)', (site) => {
    expect(() => proposeTrip({ ...extracted, site })).toThrow(rejection('PROPOSAL_SITE_NOT_FOUND'));
  });

  it.each([null, 'demain matin'])(
    '005-AS5: refuses a message without a departure time (%j)',
    (departureAt) => {
      expect(() => proposeTrip({ ...extracted, departureAt })).toThrow(
        rejection('PROPOSAL_DEPARTURE_NOT_FOUND'),
      );
    },
  );
});

describe('proposeTrip refusal messages', () => {
  it('005-AS4: says that none of Dakar, Diamniadio and Saly was found', () => {
    expect(() => proposeTrip({ ...extracted, site: null })).toThrow(/Dakar, Diamniadio and Saly/);
  });

  it('005-AS5: says that no departure time was found', () => {
    expect(() => proposeTrip({ ...extracted, departureAt: null })).toThrow(/departure time/);
  });
});

describe('proposeTrip with a date but no time', () => {
  it.each(['2026-11-10', '2026-11-10T', '10/11/2026'])(
    '005-AS5: refuses a date without a time (%j), never read as midnight',
    (departureAt) => {
      expect(() => proposeTrip({ ...extracted, departureAt })).toThrow(
        rejection('PROPOSAL_DEPARTURE_NOT_FOUND'),
      );
    },
  );

  it('005-AS5: still accepts a full instant with its time', () => {
    expect(
      proposeTrip({ ...extracted, departureAt: '2026-11-10T08:00:00.000Z' }).departureAt,
    ).toEqual(new Date('2026-11-10T08:00:00.000Z'));
  });
});
