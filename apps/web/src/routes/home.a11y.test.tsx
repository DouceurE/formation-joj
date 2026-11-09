/**
 * Un audit axe-core de l'accueil, et les deux règles de la charte vérifiables sans navigateur :
 * pas d'animation hors `motion-safe:`, des cibles tactiles de 44 px. Le contraste AA est prouvé
 * par le calcul dans `brand/palette.test.ts`, jsdom ne pouvant pas le mesurer.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axeFindings, runAxe } from '@/test/axe';
import { smallTapTargets, unguardedAnimations } from '@/test/charter-rules';
import { renderRoute } from '@/test/utils';

async function openHome() {
  await renderRoute({ initialEntries: ['/'] });
  await screen.findByRole('heading', { level: 1 });
}

describe('home accessibility', () => {
  it('006-AS6: the home page is clean', async () => {
    await openHome();
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it('006-AS6: the home page only animates when the phone allows it', async () => {
    await openHome();
    expect(unguardedAnimations()).toEqual([]);
  });

  it('006-AS6: every touch target of the home page is at least 44 px', async () => {
    await openHome();
    expect(smallTapTargets()).toEqual([]);
  });
});
