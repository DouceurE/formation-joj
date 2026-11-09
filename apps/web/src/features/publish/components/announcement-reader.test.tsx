/**
 * Publier depuis une annonce WhatsApp : l'assistant (simulé par la fausse API) remplit le
 * formulaire, le conducteur relit et complète, et rien ne part avant « Publier ».
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, pikineProposal } from '@/mocks/fixture';
import { renderRoute, trackRequests, writes } from '@/test/utils';

type User = ReturnType<typeof userEvent.setup>;

const ANNOUNCEMENT = 'je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places';

async function readAnnouncement(user: User, message = ANNOUNCEMENT) {
  await renderRoute({ initialEntries: ['/publier'] });
  await user.type(await screen.findByLabelText('Ton annonce WhatsApp'), message);
  await user.click(screen.getByRole('button', { name: 'Lire mon annonce' }));
}

const paths = (seen: ReturnType<typeof trackRequests>) => writes(seen).map((r) => r.path);

describe('AnnouncementReader', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-09T09:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('008-AS3: fills the form from the announcement without publishing', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();

    await readAnnouncement(user);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'J’ai rempli le formulaire avec ton annonce : relis-le, complète le prix et ton téléphone, puis touche « Publier ».',
    );
    expect(screen.getByRole('radio', { name: 'Ndiaga Ndiaye' })).toBeChecked();
    expect(screen.getByLabelText('Lieu de départ')).toHaveValue('Pikine');
    expect(screen.getByLabelText('Site')).toHaveValue('diamniadio');
    expect(screen.getByLabelText('Jour')).toHaveValue('2026-11-10');
    expect(screen.getByLabelText('Heure')).toHaveValue('08:00');
    expect(screen.getByLabelText('Places')).toHaveValue(38);
    expect(screen.getByLabelText('Prix (FCFA)')).toHaveValue(null);
    expect(screen.getByLabelText('Téléphone')).toHaveValue('');
    expect(paths(seen)).toEqual(['/api/trips/proposals']);
    expect(writes(seen)[0]?.body).toEqual({ message: ANNOUNCEMENT });
    expect(screen.queryByRole('heading', { name: 'Dem na !' })).not.toBeInTheDocument();
  });

  it('008-AS3: publishes the proposal once the driver completes it and touches « Publier »', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    await readAnnouncement(user);
    await screen.findByRole('status');

    await user.type(screen.getByLabelText('Prix (FCFA)'), '500');
    await user.type(screen.getByLabelText('Téléphone'), '77 123 45 67');
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByRole('heading', { name: 'Dem na !' })).toBeInTheDocument();
    expect(paths(seen)).toEqual(['/api/trips/proposals', '/api/trips']);
    expect(writes(seen)[1]?.body).toMatchObject({
      vehicle: 'ndiaga-ndiaye',
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt: '2026-11-10T08:00:00.000Z',
      seats: 38,
    });
  });

  it('008-AS3: leaves empty what the assistant did not find', async () => {
    const user = userEvent.setup();
    fixture.proposalAnswer = {
      ...pikineProposal,
      vehicle: null,
      departurePlace: null,
      seats: null,
    };

    await readAnnouncement(user, 'Diamniadio demain 8h');

    await screen.findByRole('status');
    expect(screen.getByLabelText('Site')).toHaveValue('diamniadio');
    expect(screen.getByLabelText('Heure')).toHaveValue('08:00');
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(screen.getByLabelText('Lieu de départ')).toHaveValue('');
    expect(screen.getByLabelText('Places')).toHaveValue(null);
  });

  it.each([
    [
      'PROPOSAL_SITE_NOT_FOUND',
      'Je n’ai pas trouvé le site (Dakar, Diamniadio ou Saly) dans ton annonce.',
    ],
    ['PROPOSAL_DEPARTURE_NOT_FOUND', 'Je n’ai pas trouvé l’heure de départ dans ton annonce.'],
    ['ASSISTANT_UNAVAILABLE', 'L’assistant ne répond pas, remplis le formulaire.'],
  ] as const)('008-AS4: says %s in plain words and keeps the form', async (code, message) => {
    const user = userEvent.setup();
    const seen = trackRequests();
    fixture.proposalAnswer = code;

    await readAnnouncement(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Publier' })).toBeEnabled();
    expect(screen.getByLabelText('Lieu de départ')).toBeInTheDocument();
    expect(paths(seen)).toEqual(['/api/trips/proposals']);
  });
});
