import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { ClaudeTripExtractor } from './claude-trip-extractor';

// Aucun appel réseau : un client du SDK simulé, qui enregistre la requête et rend la réponse donnée.
function stubClient(answer: () => unknown) {
  const requests: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        parse: async (params: Record<string, unknown>) => {
          requests.push(params);
          return answer();
        },
      },
    },
  } as unknown as Anthropic;
  return { client, requests };
}

const NOW = new Date('2026-11-09T09:00:00.000Z');
const MESSAGE = 'je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places';
const extracted = {
  vehicle: 'ndiaga-ndiaye',
  departurePlace: 'Pikine',
  site: 'diamniadio',
  departureAt: '2026-11-10T08:00:00.000Z',
  seats: 38,
  priceFcfa: null,
};
const unavailable = expect.objectContaining({ code: 'ASSISTANT_UNAVAILABLE' });

describe('ClaudeTripExtractor', () => {
  it('005-AS1: asks claude-opus-5-5 with the date of the day and returns what it read', async () => {
    const { client, requests } = stubClient(() => ({
      stop_reason: 'end_turn',
      parsed_output: extracted,
    }));

    expect(await new ClaudeTripExtractor(client).extract(MESSAGE, NOW)).toEqual(extracted);

    const [request] = requests;
    expect(request).toMatchObject({
      model: 'claude-opus-5-5',
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
      output_config: expect.objectContaining({ effort: 'low' }),
    });
    const content = JSON.stringify(request?.messages);
    expect(content).toContain('2026-11-09');
    expect(content).toContain(MESSAGE);
  });

  it('005-AS6: turns a refusal into ASSISTANT_UNAVAILABLE', async () => {
    const { client } = stubClient(() => ({ stop_reason: 'refusal', parsed_output: null }));
    await expect(new ClaudeTripExtractor(client).extract(MESSAGE, NOW)).rejects.toThrow(
      unavailable,
    );
  });

  it('005-AS6: turns an unreadable answer into ASSISTANT_UNAVAILABLE', async () => {
    const { client } = stubClient(() => ({ stop_reason: 'end_turn', parsed_output: null }));
    await expect(new ClaudeTripExtractor(client).extract(MESSAGE, NOW)).rejects.toThrow(
      unavailable,
    );
  });

  it('005-AS6: turns an API or network error into ASSISTANT_UNAVAILABLE', async () => {
    const { client } = stubClient(() => {
      throw new Anthropic.APIConnectionError({ message: 'network down' });
    });
    await expect(new ClaudeTripExtractor(client).extract(MESSAGE, NOW)).rejects.toThrow(
      unavailable,
    );
  });
});
