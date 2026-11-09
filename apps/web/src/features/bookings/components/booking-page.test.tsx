/**
 * L'écran de réservation, monté par sa vraie route sur la fausse API : on y arrive en trois
 * touches depuis l'accueil, et chaque refus de l'API s'y lit sans jargon.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockControl } from '@/mocks/control';
import { carAt8, departedCar, fullTaxi, ndiagaAt10 } from '@/mocks/fixture';
import { renderRoute, trackRequests } from '@/test/utils';

const bookingUrl = (tripId: string, site: string, date: string) =>
  `/reserver/${tripId}?site=${site}&date=${date}`;

async function book(user: ReturnType<typeof userEvent.setup>, name: string, phone: string) {
  // Le formulaire n'apparaît qu'une fois le trajet chargé.
  const submit = await screen.findByRole('button', { name: 'Réserver ma place' });
  if (name) await user.type(screen.getByLabelText('Nom'), name);
  if (phone) await user.type(screen.getByLabelText('Téléphone'), phone);
  await user.click(submit);
}

describe('BookingPage', () => {
  // Seule la date est figée, au 10 novembre 2026 : sans jour dans l'adresse, les départs
  // proposent aujourd'hui, et les trajets de la fausse API partent ce jour-là.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T07:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('007-AS1: opens the booking screen in three touches', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/'] });

    const [seeDepartures] = await screen.findAllByRole('link', { name: 'Voir les départs' });
    await user.click(seeDepartures as HTMLElement); // 1
    await user.selectOptions(await screen.findByLabelText('Site'), 'diamniadio'); // 2
    const ndiaga = await screen.findByRole('listitem', { name: 'Ndiaga Ndiaye de 10:00' });
    await user.click(within(ndiaga).getByRole('link', { name: 'Réserver' })); // 3

    expect(router.state.location.pathname).toBe(`/reserver/${ndiagaAt10.id}`);
    expect(
      await screen.findByRole('img', { name: 'Trajet de Pikine à Diamniadio' }),
    ).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('Ndiaga Ndiaye')).toBeInTheDocument();
    expect(screen.getByText(/^500\sFCFA$/)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Places restantes' })).toHaveTextContent(
      '30 places restantes',
    );
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    expect(screen.getByLabelText('Téléphone')).toBeInTheDocument();
  });

  it('007-AS4: says a full trip in plain words', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: [bookingUrl(fullTaxi.id, 'diamniadio', '2026-11-11')] });

    await book(user, 'Moussa', '78 555 66 77');

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce trajet est complet.');
    expect(screen.queryByText('Votre place est gardée')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Places restantes' })).toHaveTextContent(
      '0 place restante',
    );
  });

  it('007-AS4: says a phone that already booked this trip in plain words', async () => {
    const user = userEvent.setup();
    // Une première réservation de Moussa, faite directement auprès de la fausse API.
    await fetch(`http://localhost/api/trips/${carAt8.id}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passengerName: 'Moussa', passengerPhone: '78 555 66 77' }),
    });
    await renderRoute({ initialEntries: [bookingUrl(carAt8.id, 'diamniadio', '2026-11-10')] });

    await book(user, 'Moussa', '785556677');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce téléphone a déjà réservé ce trajet.',
    );
  });

  it('007-AS4: says a departed trip in plain words', async () => {
    const user = userEvent.setup();
    await renderRoute({
      initialEntries: [bookingUrl(departedCar.id, 'diamniadio', '2026-11-09')],
    });

    await book(user, 'Moussa', '78 555 66 77');

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce trajet est déjà parti.');
    expect(screen.queryByText('Votre place est gardée')).not.toBeInTheDocument();
  });

  it('007-AS4: names the empty fields without calling the API', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    await renderRoute({ initialEntries: [bookingUrl(carAt8.id, 'diamniadio', '2026-11-10')] });

    await book(user, '', '');

    expect(await screen.findByText('Ton nom est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Ton téléphone est obligatoire.')).toBeInTheDocument();
    expect(seen.filter((request) => request.method === 'POST')).toEqual([]);
  });
});

describe('BookingPage when the trip cannot be loaded', () => {
  it('007-AS4: shows « Réessayer » when the trip cannot be loaded, not « Trajet introuvable »', async () => {
    const user = userEvent.setup();
    mockControl.failNext('GET /api/trips');
    await renderRoute({ initialEntries: [bookingUrl(carAt8.id, 'diamniadio', '2026-11-10')] });

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger ce trajet.');
    expect(screen.queryByText('Trajet introuvable')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('button', { name: 'Réserver ma place' })).toBeInTheDocument();
  });
});
