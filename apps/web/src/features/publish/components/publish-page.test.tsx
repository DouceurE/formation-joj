/**
 * L'écran « Publier un trajet », monté par sa vraie route sur la fausse API : le conducteur
 * choisit son véhicule, remplit le formulaire, puis voit « Dem na ! » et son code de gestion.
 */
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute, trackRequests, writes } from '@/test/utils';

type User = ReturnType<typeof userEvent.setup>;

interface TripFields {
  vehicle?: string;
  place?: string;
  site?: string;
  day?: string;
  time?: string;
  seats?: string;
  price?: string;
  phone?: string;
}

const ndiagaFromPikine: TripFields = {
  vehicle: 'Ndiaga Ndiaye',
  place: 'Pikine',
  site: 'diamniadio',
  day: '2026-11-10',
  time: '08:00',
  seats: '38',
  price: '500',
  phone: '77 123 45 67',
};

/** Remplit les champs donnés, comme le conducteur ; un champ absent reste tel quel. */
async function fill(user: User, fields: TripFields) {
  if (fields.vehicle) await user.click(screen.getByRole('radio', { name: fields.vehicle }));
  if (fields.place) await user.type(screen.getByLabelText('Lieu de départ'), fields.place);
  if (fields.site) await user.selectOptions(screen.getByLabelText('Site'), fields.site);
  if (fields.day)
    fireEvent.change(screen.getByLabelText('Jour'), { target: { value: fields.day } });
  if (fields.time) {
    fireEvent.change(screen.getByLabelText('Heure'), { target: { value: fields.time } });
  }
  if (fields.seats) {
    await user.clear(screen.getByLabelText('Places'));
    await user.type(screen.getByLabelText('Places'), fields.seats);
  }
  if (fields.price) await user.type(screen.getByLabelText('Prix (FCFA)'), fields.price);
  if (fields.phone) await user.type(screen.getByLabelText('Téléphone'), fields.phone);
}

async function openPublishScreen() {
  const rendered = await renderRoute({ initialEntries: ['/publier'] });
  await screen.findByRole('heading', { name: 'Publier un trajet' });
  return rendered;
}

describe('PublishPage', () => {
  // Seule la date est figée, à l'heure de la fausse API (MOCK_NOW) : le 9 novembre 2026, 9 h.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-09T09:00:00Z') }));
  afterEach(() => vi.useRealTimers());

  it('008-AS1: opens the publish screen from the header link « Publier »', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/'] });

    await user.click(await screen.findByRole('link', { name: 'Publier' }));

    expect(router.state.location.pathname).toBe('/publier');
    expect(await screen.findByRole('heading', { name: 'Publier un trajet' })).toBeInTheDocument();
  });

  it('008-AS1: publishes a Ndiaga Ndiaye and says « Dem na ! » with its management code', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    await openPublishScreen();

    await fill(user, ndiagaFromPikine);
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByRole('heading', { name: 'Dem na !' })).toBeInTheDocument();
    expect(screen.getByTestId('management-code').textContent).toMatch(/^[A-Z0-9]{8}$/);
    expect(screen.getByRole('button', { name: 'Copier le code' })).toBeInTheDocument();
    expect(writes(seen)).toEqual([
      {
        method: 'POST',
        path: '/api/trips',
        body: {
          vehicle: 'ndiaga-ndiaye',
          departurePlace: 'Pikine',
          site: 'diamniadio',
          departureAt: '2026-11-10T08:00:00.000Z',
          seats: 38,
          priceFcfa: 500,
          driverPhone: '77 123 45 67',
        },
      },
    ]);

    await user.click(screen.getByRole('link', { name: 'Voir le départ' }));
    const listed = await screen.findByRole('listitem', { name: 'Ndiaga Ndiaye de 08:00' });
    expect(within(listed).getByText('Pikine')).toBeInTheDocument();
    expect(within(listed).getByText('38 places restantes')).toBeInTheDocument();
  });

  it('008-AS2: offers at most 4 seats for a car or a taxi, and 38 for a Ndiaga Ndiaye', async () => {
    const user = userEvent.setup();
    await openPublishScreen();
    const seats = screen.getByLabelText('Places');

    await fill(user, { vehicle: 'Voiture' });
    expect(seats).toHaveAttribute('max', '4');
    await fill(user, { vehicle: 'Taxi' });
    expect(seats).toHaveAttribute('max', '4');
    await fill(user, { vehicle: 'Ndiaga Ndiaye', seats: '38' });
    expect(seats).toHaveAttribute('max', '38');

    // Revenir à une voiture ramène les places sous son maximum.
    await fill(user, { vehicle: 'Voiture' });
    expect(seats).toHaveValue(4);
  });

  it('008-AS2: says a seats refusal of the API in plain words, and publishes nothing', async () => {
    const user = userEvent.setup();
    await openPublishScreen();

    await fill(user, { ...ndiagaFromPikine, vehicle: 'Voiture', seats: '5' });
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Une voiture ou un taxi a 4 places au plus.',
    );
    expect(screen.queryByRole('heading', { name: 'Dem na !' })).not.toBeInTheDocument();
  });

  it('008-AS2: says a departure in the past in plain words, and publishes nothing', async () => {
    const user = userEvent.setup();
    await openPublishScreen();

    await fill(user, { ...ndiagaFromPikine, day: '2026-11-09', time: '07:00' });
    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce départ est déjà passé.');
    expect(screen.queryByRole('heading', { name: 'Dem na !' })).not.toBeInTheDocument();
  });

  it('008-AS2: names each missing field without calling the API', async () => {
    const user = userEvent.setup();
    const seen = trackRequests();
    await openPublishScreen();

    await user.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByText('Choisis ton véhicule.')).toBeInTheDocument();
    expect(screen.getByText('Le lieu de départ est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Choisis le site.')).toBeInTheDocument();
    expect(screen.getByText('L’heure est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Le nombre de places est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Le prix est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Ton téléphone est obligatoire.')).toBeInTheDocument();
    expect(writes(seen)).toEqual([]);
  });
});
