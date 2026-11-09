/**
 * Un audit axe-core de chaque étape de la réservation : formulaire, champs vides, refus de
 * l'API, billet de face et billet retourné. Chaque étape vérifie aussi les règles de la charte :
 * animations sous `motion-safe:` (route, véhicule, compteur, billet) et cibles de 44 px.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { carAt8, fullTaxi } from '@/mocks/fixture';
import { axeFindings, runAxe } from '@/test/axe';
import { smallTapTargets, unguardedAnimations } from '@/test/charter-rules';
import { renderRoute } from '@/test/utils';

async function openBooking(tripId: string, date: string) {
  const user = userEvent.setup();
  await renderRoute({ initialEntries: [`/reserver/${tripId}?site=diamniadio&date=${date}`] });
  const submit = await screen.findByRole('button', { name: 'Réserver ma place' });
  return { user, submit };
}

async function fillAndSubmit(tripId: string, date: string) {
  const { user, submit } = await openBooking(tripId, date);
  await user.type(screen.getByLabelText('Nom'), 'Moussa');
  await user.type(screen.getByLabelText('Téléphone'), '78 555 66 77');
  await user.click(submit);
  return user;
}

const STEPS = {
  'with the form': async () => {
    await openBooking(carAt8.id, '2026-11-10');
  },
  'with the empty fields named': async () => {
    const { user, submit } = await openBooking(carAt8.id, '2026-11-10');
    await user.click(submit);
    await screen.findByText('Ton nom est obligatoire.');
  },
  'with a refusal of the API': async () => {
    await fillAndSubmit(fullTaxi.id, '2026-11-11');
    await screen.findByRole('alert');
  },
  'with the ticket face up': async () => {
    await fillAndSubmit(carAt8.id, '2026-11-10');
    await screen.findByText('Votre place est gardée');
  },
  'with the ticket turned over': async () => {
    const user = await fillAndSubmit(carAt8.id, '2026-11-10');
    await user.click(await screen.findByRole('button', { name: /Retourner le billet/ }));
    await screen.findByRole('button', { name: 'Copier le code' });
  },
};

describe('booking accessibility', () => {
  it.each(Object.entries(STEPS))('007-AS7: the booking screen is clean %s', async (_step, open) => {
    await open();
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it.each(Object.entries(STEPS))(
    '007-AS7: the booking screen only animates when the phone allows it, %s',
    async (_step, open) => {
      await open();
      expect(unguardedAnimations()).toEqual([]);
    },
  );

  it.each(Object.entries(STEPS))(
    '007-AS7: every touch target of the booking screen is at least 44 px, %s',
    async (_step, open) => {
      await open();
      expect(smallTapTargets()).toEqual([]);
    },
  );
});
