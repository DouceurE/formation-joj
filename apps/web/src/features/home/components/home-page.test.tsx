/**
 * L'accueil de Dem, monté par sa vraie route : un supporter arrivé par un lien WhatsApp doit
 * comprendre le service en une phrase et trouver tout de suite « Voir les départs ».
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/utils';

describe('HomePage', () => {
  it('006-AS1: says the service in one sentence and leads to the departures', async () => {
    await renderRoute({ initialEntries: ['/'] });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Trouve une place vers ton site des JOJ, partagée sur WhatsApp.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Logo des JOJ Dakar 2026/ })).toHaveAttribute(
      'src',
      '/cojoj1.webp',
    );
    expect(screen.getByRole('img', { name: /Ayo, la mascotte/ })).toHaveAttribute(
      'src',
      '/mascotte.webp',
    );
    expect(screen.getByTestId('car-rapide-frieze')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: 'Voir les départs' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/departs');
  });

  it('006-AS1: explains how it works in three steps', async () => {
    await renderRoute({ initialEntries: ['/'] });

    const steps = await screen.findByRole('list', { name: 'Comment ça marche' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
  });

  it('006-AS1: answers the three doubts: free, no install, price paid to the driver', async () => {
    await renderRoute({ initialEntries: ['/'] });

    const doubts = await screen.findByRole('list', { name: 'Vos questions' });
    const items = within(doubts).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Gratuit');
    expect(items[1]).toHaveTextContent('Sans installation');
    expect(items[2]).toHaveTextContent('Le prix se règle au chauffeur');
  });

  it('006-AS1: « Voir les départs » opens the departures page', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/'] });

    const [first] = await screen.findAllByRole('link', { name: 'Voir les départs' });
    await user.click(first as HTMLElement);

    expect(router.state.location.pathname).toBe('/departs');
  });
});
