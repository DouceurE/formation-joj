/**
 * « Mes trajets », monté par sa vraie route sur la fausse API : les réservations gardées dans
 * le téléphone, la saisie d'un code, l'annulation confirmée, le trajet annulé par son
 * conducteur, et « Oublier ce trajet ».
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BOOKING_ON_CANCELLED_TRIP, carAt8 } from '@/mocks/fixture';
import { renderRoute } from '@/test/utils';
import { savedBookings } from '../storage/saved-bookings';

/** Une réservation de Moussa sur la voiture de 8 h, faite auprès de la fausse API et gardée. */
async function bookAndKeep(): Promise<string> {
  const response = await fetch(`http://localhost/api/trips/${carAt8.id}/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passengerName: 'Moussa', passengerPhone: '78 555 66 77' }),
  });
  const { bookingCode } = (await response.json()) as { bookingCode: string };
  savedBookings.save(bookingCode);
  return bookingCode;
}

async function remainingSeatsOfCarAt8(): Promise<number> {
  const trips = (await (
    await fetch('http://localhost/api/trips?site=diamniadio&date=2026-11-10')
  ).json()) as { id: string; remainingSeats: number }[];
  return trips.find((trip) => trip.id === carAt8.id)?.remainingSeats ?? -1;
}

const myTrip = (code: string) => screen.findByRole('listitem', { name: `Réservation ${code}` });

describe('MyTripsPage', () => {
  it('007-AS5: finds a kept booking after the page was closed, with its status', async () => {
    const code = await bookAndKeep();
    await renderRoute({ initialEntries: ['/mes-trajets'] });

    const item = await myTrip(code);
    expect(await within(item).findByText('Confirmée')).toBeInTheDocument();
    expect(within(item).getByText('Parcelles')).toBeInTheDocument();
    expect(within(item).getByText('08:00')).toBeInTheDocument();
  });

  it('007-AS5: adds a booking from its code, and refuses an unknown code', async () => {
    const user = userEvent.setup();
    await renderRoute({ initialEntries: ['/mes-trajets'] });

    await user.type(await screen.findByLabelText('Code de réservation'), 'ZZZZ9999');
    await user.click(screen.getByRole('button', { name: 'Retrouver' }));
    expect(await screen.findByText('Aucune réservation avec ce code.')).toBeInTheDocument();
    expect(savedBookings.list()).toEqual([]);

    const field = screen.getByLabelText('Code de réservation');
    await user.clear(field);
    await user.type(field, BOOKING_ON_CANCELLED_TRIP);
    await user.click(screen.getByRole('button', { name: 'Retrouver' }));
    expect(await myTrip(BOOKING_ON_CANCELLED_TRIP)).toBeInTheDocument();
    expect(savedBookings.list()).toEqual([BOOKING_ON_CANCELLED_TRIP]);
  });

  it('007-AS5: forgets a trip on the phone without cancelling it', async () => {
    const user = userEvent.setup();
    const code = await bookAndKeep();
    await renderRoute({ initialEntries: ['/mes-trajets'] });

    await user.click(within(await myTrip(code)).getByRole('button', { name: 'Oublier ce trajet' }));

    expect(screen.queryByRole('listitem', { name: `Réservation ${code}` })).not.toBeInTheDocument();
    expect(savedBookings.list()).toEqual([]);
    const stillThere = await (await fetch(`http://localhost/api/bookings/${code}`)).json();
    expect(stillThere).toMatchObject({ status: 'confirmee' });
  });

  it('007-AS6: cancels after confirmation, and the seat goes back to the trip', async () => {
    const user = userEvent.setup();
    const code = await bookAndKeep();
    expect(await remainingSeatsOfCarAt8()).toBe(carAt8.remainingSeats - 1);
    await renderRoute({ initialEntries: ['/mes-trajets'] });

    await user.click(await within(await myTrip(code)).findByRole('button', { name: 'Annuler' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Annuler cette réservation ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Oui, annuler' }));

    expect(await within(await myTrip(code)).findByText('Annulée')).toBeInTheDocument();
    expect(await remainingSeatsOfCarAt8()).toBe(carAt8.remainingSeats);
  });

  it('007-AS6: shows a trip cancelled by its driver in laterite red, with a link to other departures', async () => {
    savedBookings.save(BOOKING_ON_CANCELLED_TRIP);
    await renderRoute({ initialEntries: ['/mes-trajets'] });

    const item = await myTrip(BOOKING_ON_CANCELLED_TRIP);
    const status = await within(item).findByText('Trajet annulé');
    expect(status).toHaveClass('text-laterite-fonce');
    expect(within(item).getByRole('link', { name: 'Voir les autres départs' })).toHaveAttribute(
      'href',
      '/departs?date=2026-11-12',
    );
    expect(within(item).queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument();
  });

  it('007-AS5: is reachable from the header on every page', async () => {
    const user = userEvent.setup();
    const { router } = await renderRoute({ initialEntries: ['/'] });

    await user.click(await screen.findByRole('link', { name: 'Mes trajets' }));

    expect(router.state.location.pathname).toBe('/mes-trajets');
  });
});
