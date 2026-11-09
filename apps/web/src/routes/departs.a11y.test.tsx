/**
 * Un audit axe-core de chaque état de la page des départs : sans site choisi, la liste, le jour
 * sans départ et la panne de chargement. Un état jamais audité peut régresser sans bruit.
 * Chaque état vérifie aussi les règles de la charte : animations sous `motion-safe:`, 44 px.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockControl } from '@/mocks/control';
import { axeFindings, runAxe } from '@/test/axe';
import { smallTapTargets, unguardedAnimations } from '@/test/charter-rules';
import { renderRoute } from '@/test/utils';

const STATES = {
  'without a chosen site': async () => {
    await renderRoute({ initialEntries: ['/departs?date=2026-11-10'] });
    await screen.findByText('Choisis ton site pour voir les départs du jour.');
  },
  'with departures': async () => {
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });
    await screen.findByRole('list', { name: 'Départs' });
    await screen.findByRole('list', { name: 'Lignes officielles' });
  },
  'when the day is empty': async () => {
    await renderRoute({ initialEntries: ['/departs?site=saly&date=2026-11-12'] });
    await screen.findByText('Aucun départ ce jour-là');
    await screen.findByRole('list', { name: 'Lignes officielles' });
  },
  'when the departures cannot be loaded': async () => {
    mockControl.failNext('GET /api/trips');
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });
    await screen.findByRole('alert');
  },
};

describe('departures accessibility', () => {
  it.each(Object.entries(STATES))(
    '006-AS6: the departures page is clean %s',
    async (_state, open) => {
      await open();
      expect(axeFindings(await runAxe())).toEqual([]);
    },
  );

  it.each(Object.entries(STATES))(
    '006-AS6: the departures page only animates when the phone allows it, %s',
    async (_state, open) => {
      await open();
      expect(unguardedAnimations()).toEqual([]);
    },
  );

  it.each(Object.entries(STATES))(
    '006-AS6: every touch target of the departures page is at least 44 px, %s',
    async (_state, open) => {
      await open();
      expect(smallTapTargets()).toEqual([]);
    },
  );
});
