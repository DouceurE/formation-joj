/**
 * La page /departs, montée par sa vraie route sur la fausse API (`mocks/handlers.ts`) : le choix
 * du site et du jour, les covoiturages triés par heure, les lignes officielles en alternative,
 * le jour sans départ et la panne de chargement.
 */
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockControl } from '@/mocks/control';
import { carAt8 } from '@/mocks/fixture';
import { renderRoute } from '@/test/utils';

async function departuresList() {
  return within(await screen.findByRole('list', { name: 'Départs' })).getAllByRole('listitem');
}

describe('DeparturesPage', () => {
  it('006-AS2: shows the departures of the chosen site and day, sorted by time', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/departs?date=2026-11-10'] });

    await user.selectOptions(await screen.findByLabelText('Site'), 'diamniadio');

    const items = await departuresList();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Voiture');
    expect(items[0]).toHaveTextContent('Parcelles');
    expect(items[0]).toHaveTextContent('08:00');
    expect(items[0]).toHaveTextContent(/1\s500\sFCFA/);
    expect(items[0]).toHaveTextContent('3 places restantes');
    expect(items[1]).toHaveTextContent('Ndiaga Ndiaye');
    expect(items[1]).toHaveTextContent('10:00');
    expect(screen.queryByText('Keur Massar')).not.toBeInTheDocument();
    expect(router.state.location.search).toEqual({ site: 'diamniadio', date: '2026-11-10' });
  });

  // Annoncé par la spec 006 : « Réserver » mène à l'écran de réservation de TR7.
  it('006-AS2: shows a « Réserver » link on each departure, leading to its booking', async () => {
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });

    const [first] = await departuresList();
    expect(within(first as HTMLElement).getByRole('link', { name: 'Réserver' })).toHaveAttribute(
      'href',
      `/reserver/${carAt8.id}?site=diamniadio&date=2026-11-10`,
    );
  });

  it('006-AS3: shows the official lines below, marked as not bookable here', async () => {
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });

    const lines = within(
      await screen.findByRole('list', { name: 'Lignes officielles' }),
    ).getAllByRole('listitem');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent('Navette JOJ');
    expect(lines[1]).toHaveTextContent('Dakar Dem Dikk');
    for (const line of lines) expect(line).toHaveTextContent('ne se réserve pas ici');
  });

  it('006-AS4: says there is no departure that day, and still shows the official lines', async () => {
    await renderRoute({ initialEntries: ['/departs?site=saly&date=2026-11-12'] });

    expect(await screen.findByText('Aucun départ ce jour-là')).toBeInTheDocument();
    expect(screen.getByText(/Choisis un autre jour/)).toBeInTheDocument();
    const lines = within(
      await screen.findByRole('list', { name: 'Lignes officielles' }),
    ).getAllByRole('listitem');
    expect(lines).toHaveLength(1);
  });

  it('006-AS5: shows an error and « Réessayer » when the departures cannot be loaded', async () => {
    const user = userEvent.setup();
    mockControl.failNext('GET /api/trips');
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Impossible de charger les départs.',
    );
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(await departuresList()).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('DeparturesPage colours of the charter', () => {
  it('006-AS3: shows the official lines in Atlantic blue', async () => {
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });

    const lines = within(
      await screen.findByRole('list', { name: 'Lignes officielles' }),
    ).getAllByRole('listitem');
    for (const line of lines) {
      expect(line).toHaveClass('border-atlantique');
      expect(within(line).getByText(/^(Navette JOJ|Dakar Dem Dikk)$/)).toHaveClass(
        'text-atlantique',
      );
    }
  });

  it('006-AS5: shows the error in laterite red', async () => {
    mockControl.failNext('GET /api/trips');
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveClass('border-laterite');
    // Le rouge latérite clair ne passe pas AA en texte : le message est en latérite foncé.
    expect(alert).toHaveClass('text-laterite-fonce');
  });
});

describe('DeparturesPage day field', () => {
  it('006-AS2: changing the day in the date field updates the departures', async () => {
    const { router } = await renderRoute({
      initialEntries: ['/departs?site=diamniadio&date=2026-11-12'],
    });
    expect(await screen.findByText('Aucun départ ce jour-là')).toBeInTheDocument();

    // jsdom ne sait pas taper dans un champ date : on lui donne la valeur choisie, comme le sélecteur.
    fireEvent.change(screen.getByLabelText('Jour'), { target: { value: '2026-11-10' } });

    expect(await departuresList()).toHaveLength(2);
    expect(router.state.location.search).toEqual({ site: 'diamniadio', date: '2026-11-10' });
  });
});

describe('DeparturesPage departure details', () => {
  it('006-AS2: shows the vehicle, place, time, price and remaining seats of each departure', async () => {
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-10'] });

    const [first, second] = await departuresList();
    const expected = [
      [first, ['Voiture', 'Parcelles', '08:00', /1\s500\sFCFA/, '3 places restantes']],
      [second, ['Ndiaga Ndiaye', 'Pikine', '10:00', /500\sFCFA/, '30 places restantes']],
    ] as const;
    for (const [item, values] of expected) {
      for (const value of values) expect(item).toHaveTextContent(value);
    }
  });
});

describe('DeparturesPage full trip', () => {
  it('007-AS4: shows a full trip as « 0 place restante » in the departures', async () => {
    await renderRoute({ initialEntries: ['/departs?site=diamniadio&date=2026-11-11'] });

    const [full] = await departuresList();
    expect(full).toHaveTextContent('0 place restante');
    expect(full).not.toHaveTextContent('0 places restantes');
  });
});
