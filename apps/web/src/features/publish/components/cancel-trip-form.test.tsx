/**
 * « Annuler mon trajet » : le conducteur saisit son code de gestion, confirme, et le trajet
 * quitte les départs. Chaque refus de l'API se lit sans jargon.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelledTrip, MANAGEMENT_CODES, ndiagaAt10 } from '@/mocks/fixture';
import { renderRoute, trackRequests, writes } from '@/test/utils';

type User = ReturnType<typeof userEvent.setup>;

async function askToCancel(user: User, code: string) {
  const rendered = await renderRoute({ initialEntries: ['/publier'] });
  await user.type(await screen.findByLabelText('Code de gestion'), code);
  await user.click(screen.getByRole('button', { name: 'Annuler mon trajet' }));
  return rendered;
}

async function confirm(user: User) {
  const dialog = await screen.findByRole('alertdialog', { name: 'Annuler ce trajet ?' });
  await user.click(within(dialog).getByRole('button', { name: 'Oui, annuler' }));
}

describe('CancelTripForm', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-09T09:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('008-AS5: cancels a trip with its management code after confirmation', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    const { router } = await askToCancel(user, MANAGEMENT_CODES[ndiagaAt10.id] ?? '');

    await confirm(user);

    expect(await screen.findByRole('status')).toHaveTextContent('Trajet annulé');
    expect(writes(seen)).toEqual([
      {
        method: 'POST',
        path: '/api/trips/cancel',
        body: { managementCode: MANAGEMENT_CODES[ndiagaAt10.id] },
      },
    ]);

    await router.navigate({ to: '/departs', search: { site: 'diamniadio', date: '2026-11-10' } });
    expect(await screen.findByRole('listitem', { name: 'Voiture de 08:00' })).toBeInTheDocument();
    expect(
      screen.queryByRole('listitem', { name: 'Ndiaga Ndiaye de 10:00' }),
    ).not.toBeInTheDocument();
  });

  it('008-AS5: sends nothing when the driver keeps the trip', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    await askToCancel(user, MANAGEMENT_CODES[ndiagaAt10.id] ?? '');

    const dialog = await screen.findByRole('alertdialog', { name: 'Annuler ce trajet ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Garder mon trajet' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(writes(seen)).toEqual([]);
  });

  it('008-AS5: says « Aucun trajet avec ce code. » for an unknown code', async () => {
    const user = userEvent.setup();
    await askToCancel(user, 'ZZZZ9999');

    await confirm(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun trajet avec ce code.');
    expect(screen.queryByText('Trajet annulé')).not.toBeInTheDocument();
  });

  it('008-AS5: says « Aucun trajet avec ce code. » for a code of 7 characters, without calling the API', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();

    await askToCancel(user, 'NDIAGA1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun trajet avec ce code.');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(writes(seen)).toEqual([]);
  });

  it('008-AS5: says « Ce trajet est déjà annulé. » for a trip already cancelled', async () => {
    const user = userEvent.setup();
    await askToCancel(user, MANAGEMENT_CODES[cancelledTrip.id] ?? '');

    await confirm(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce trajet est déjà annulé.');
  });
});
