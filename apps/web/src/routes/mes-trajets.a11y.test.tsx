/**
 * Un audit axe-core de chaque état de « Mes trajets » : vide, avec une réservation confirmée et
 * un trajet annulé, code inconnu, et la confirmation d'annulation ouverte (rendue dans un
 * portal). Chaque état vérifie aussi les règles de la charte : `motion-safe:` et 44 px.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { savedBookings } from '@/features/bookings/storage/saved-bookings';
import { BOOKING_ON_CANCELLED_TRIP, carAt8 } from '@/mocks/fixture';
import { axeFindings, runAxe } from '@/test/axe';
import { smallTapTargets, unguardedAnimations } from '@/test/charter-rules';
import { renderRoute } from '@/test/utils';

async function keepBookingOnCarAt8(): Promise<string> {
  const response = await fetch(`http://localhost/api/trips/${carAt8.id}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passengerName: 'Moussa', passengerPhone: '78 555 66 77' }),
  });
  const { bookingCode } = (await response.json()) as { bookingCode: string };
  savedBookings.save(bookingCode);
  return bookingCode;
}

async function openWithTrips() {
  const code = await keepBookingOnCarAt8();
  savedBookings.save(BOOKING_ON_CANCELLED_TRIP);
  await renderRoute({ initialEntries: ['/mes-trajets'] });
  await screen.findByText('Confirmée');
  await screen.findByText('Trajet annulé');
  return code;
}

const STATES = {
  'when empty': async () => {
    await renderRoute({ initialEntries: ['/mes-trajets'] });
    await screen.findByText(/Aucune réservation gardée/);
  },
  'with a confirmed booking and a cancelled trip': async () => {
    await openWithTrips();
  },
  'with an unknown code': async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/mes-trajets'] });
    await user.type(await screen.findByLabelText('Code de réservation'), 'ZZZZ9999');
    await user.click(screen.getByRole('button', { name: 'Retrouver' }));
    await screen.findByText('Aucune réservation avec ce code.');
  },
  'with the cancellation dialog open': async () => {
    const user = userEvent.setup();
    const code = await openWithTrips();
    const item = await screen.findByRole('listitem', { name: `Réservation ${code}` });
    await user.click(within(item).getByRole('button', { name: 'Annuler' }));
    await screen.findByRole('alertdialog');
  },
};

describe('my trips accessibility', () => {
  it.each(Object.entries(STATES))('007-AS7: my trips is clean %s', async (_state, open) => {
    await open();
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it.each(Object.entries(STATES))(
    '007-AS7: my trips only animates when the phone allows it, %s',
    async (_state, open) => {
      await open();
      expect(unguardedAnimations()).toEqual([]);
    },
  );

  it.each(Object.entries(STATES))(
    '007-AS7: every touch target of my trips is at least 44 px, %s',
    async (_state, open) => {
      await open();
      expect(smallTapTargets()).toEqual([]);
    },
  );
});
