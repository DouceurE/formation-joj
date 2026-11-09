/**
 * Un audit axe-core de chaque étape de la publication : formulaire, champs vides, refus de
 * l'API, annonce lue ou refusée, « Dem na ! », confirmation puis annulation d'un trajet.
 * Chaque étape vérifie aussi les règles de la charte : animations sous `motion-safe:` et
 * cibles de 44 px.
 */
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, MANAGEMENT_CODES, ndiagaAt10 } from '@/mocks/fixture';
import { axeFindings, runAxe } from '@/test/axe';
import { smallTapTargets, unguardedAnimations } from '@/test/charter-rules';
import { renderRoute } from '@/test/utils';

async function openPublish() {
  const user = userEvent.setup();
  await renderRoute({ initialEntries: ['/publier'] });
  await screen.findByRole('heading', { name: 'Publier un trajet' });
  return user;
}

async function fillAndPublish(seats: string) {
  const user = await openPublish();
  await user.click(screen.getByRole('radio', { name: 'Voiture' }));
  await user.type(screen.getByLabelText('Lieu de départ'), 'Parcelles');
  await user.selectOptions(screen.getByLabelText('Site'), 'diamniadio');
  fireEvent.change(screen.getByLabelText('Jour'), { target: { value: '2026-11-10' } });
  fireEvent.change(screen.getByLabelText('Heure'), { target: { value: '08:00' } });
  await user.type(screen.getByLabelText('Places'), seats);
  await user.type(screen.getByLabelText('Prix (FCFA)'), '1500');
  await user.type(screen.getByLabelText('Téléphone'), '76 222 33 44');
  await user.click(screen.getByRole('button', { name: 'Publier' }));
}

async function readAnnouncement() {
  const user = await openPublish();
  await user.type(screen.getByLabelText('Ton annonce WhatsApp'), 'Pikine Diamniadio demain 8h');
  await user.click(screen.getByRole('button', { name: 'Lire mon annonce' }));
}

async function askToCancel() {
  const user = await openPublish();
  await user.type(screen.getByLabelText('Code de gestion'), MANAGEMENT_CODES[ndiagaAt10.id] ?? '');
  await user.click(screen.getByRole('button', { name: 'Annuler mon trajet' }));
  return { user, dialog: await screen.findByRole('alertdialog', { name: 'Annuler ce trajet ?' }) };
}

const STEPS = {
  'with the form': async () => {
    await openPublish();
  },
  'with the empty fields named': async () => {
    const user = await openPublish();
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    await screen.findByText('Choisis ton véhicule.');
  },
  'with a refusal of the API': async () => {
    await fillAndPublish('5');
    await screen.findByRole('alert');
  },
  'with the announcement read': async () => {
    await readAnnouncement();
    await screen.findByRole('status');
  },
  'with an announcement the assistant cannot read': async () => {
    fixture.proposalAnswer = 'ASSISTANT_UNAVAILABLE';
    await readAnnouncement();
    await screen.findByRole('alert');
  },
  'after « Dem na ! »': async () => {
    await fillAndPublish('3');
    await screen.findByRole('heading', { name: 'Dem na !' });
  },
  'with the cancellation to confirm': async () => {
    await askToCancel();
  },
  'with the trip cancelled': async () => {
    const { user, dialog } = await askToCancel();
    await user.click(within(dialog).getByRole('button', { name: 'Oui, annuler' }));
    await screen.findByText('Trajet annulé');
  },
};

describe('publish accessibility', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-09T09:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it.each(Object.entries(STEPS))('008-AS6: the publish screen is clean %s', async (_step, open) => {
    await open();
    expect(axeFindings(await runAxe())).toEqual([]);
  });

  it.each(Object.entries(STEPS))(
    '008-AS6: the publish screen only animates when the phone allows it, %s',
    async (_step, open) => {
      await open();
      expect(unguardedAnimations()).toEqual([]);
    },
  );

  it.each(Object.entries(STEPS))(
    '008-AS6: every touch target of the publish screen is at least 44 px, %s',
    async (_step, open) => {
      await open();
      expect(smallTapTargets()).toEqual([]);
    },
  );
});
