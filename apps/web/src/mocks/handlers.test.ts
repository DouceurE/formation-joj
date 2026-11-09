/**
 * La fausse API tient le même contrat que apps/api : si elle s'en écarte, les tests du front
 * passent contre une API qui n'existe pas. Ces tests l'appellent avec `fetch`, sans React.
 */
import { officialLineListSchema, tripListSchema } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { carAt8, ndiagaAt10 } from './fixture';

const call = (path: string) => fetch(`http://localhost${path}`);

describe('mock trips API', () => {
  it('006-AS2: serves the trips of a site for a day, sorted by departure', async () => {
    const response = await call('/api/trips?site=diamniadio&date=2026-11-10');

    expect(response.status).toBe(200);
    expect(tripListSchema.parse(await response.json())).toEqual([carAt8, ndiagaAt10]);
  });

  it('006-AS2: serves an empty list for a day without departure', async () => {
    const response = await call('/api/trips?site=saly&date=2026-11-12');
    expect(await response.json()).toEqual([]);
  });

  it('006-AS2: rejects an unknown site like the API (400, VALIDATION_FAILED)', async () => {
    const response = await call('/api/trips?site=thies&date=2026-11-10');

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [expect.objectContaining({ path: 'site' })],
    });
  });
});

describe('mock official lines API', () => {
  it('006-AS3: serves the official lines of a site', async () => {
    const response = await call('/api/official-lines?site=diamniadio');

    expect(response.status).toBe(200);
    const lines = officialLineListSchema.parse(await response.json());
    expect(lines.map((line) => line.operator)).toEqual(['navette-joj', 'dakar-dem-dikk']);
  });

  it('006-AS3: serves no official line for Dakar', async () => {
    expect(await (await call('/api/official-lines?site=dakar')).json()).toEqual([]);
  });
});
