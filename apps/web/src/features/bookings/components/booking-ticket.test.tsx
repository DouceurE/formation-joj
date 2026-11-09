/**
 * Le billet de Dem, après une vraie réservation sur la fausse API : il dit que la place est
 * gardée, se retourne pour montrer le code et les détails, se copie et s'envoie sur WhatsApp.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { carAt8, DRIVER_PHONES } from '@/mocks/fixture';
import { renderRoute } from '@/test/utils';
import { savedBookings } from '../storage/saved-bookings';

const CODE = /^[A-HJ-NP-Z2-9]{8}$/;

async function bookCarAt8() {
  const user = userEvent.setup();
  await renderRoute({
    initialEntries: [`/reserver/${carAt8.id}?site=diamniadio&date=2026-11-10`],
  });
  const submit = await screen.findByRole('button', { name: 'Réserver ma place' });
  await user.type(screen.getByLabelText('Nom'), 'Moussa');
  await user.type(screen.getByLabelText('Téléphone'), '78 555 66 77');
  await user.click(submit);
  return user;
}

describe('BookingTicket', () => {
  it('007-AS2: lowers the counter and shows « Votre place est gardée »', async () => {
    await bookCarAt8();

    expect(await screen.findByText('Votre place est gardée')).toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Places restantes' })).toHaveTextContent(
      '2 places restantes',
    );
    expect(screen.queryByRole('button', { name: 'Réserver ma place' })).not.toBeInTheDocument();
  });

  it('007-AS2: turns the ticket over to show the code and Jërëjëf !', async () => {
    const user = await bookCarAt8();

    await user.click(await screen.findByRole('button', { name: /Retourner le billet/ }));

    const code = await screen.findByTestId('booking-code');
    expect(code.textContent).toMatch(CODE);
    // La route et les détails du départ montrent aussi le lieu et l'heure : on lit le billet.
    const ticket = within(screen.getByRole('region', { name: 'Ton billet' }));
    expect(ticket.getByText('Parcelles')).toBeInTheDocument();
    expect(ticket.getByText('08:00')).toBeInTheDocument();
    expect(ticket.getByText(DRIVER_PHONES[carAt8.id] as string)).toBeInTheDocument();
    expect(ticket.getByText('Jërëjëf !')).toBeInTheDocument();
    // Gardé dans le téléphone dès la réservation, pour « Mes trajets ».
    expect(savedBookings.list()).toEqual([code.textContent]);
  });

  it('007-AS3: copies the code and confirms « Code copié »', async () => {
    const user = await bookCarAt8();
    await user.click(await screen.findByRole('button', { name: /Retourner le billet/ }));
    const code = (await screen.findByTestId('booking-code')).textContent;

    await user.click(screen.getByRole('button', { name: 'Copier le code' }));

    expect(await navigator.clipboard.readText()).toBe(code);
    expect(await screen.findByText('Code copié')).toBeInTheDocument();
  });

  it('007-AS3: sends the code, place and time on WhatsApp through a simple link', async () => {
    const user = await bookCarAt8();
    await user.click(await screen.findByRole('button', { name: /Retourner le billet/ }));
    const code = (await screen.findByTestId('booking-code')).textContent ?? '';

    const link = screen.getByRole('link', { name: 'Envoyer sur WhatsApp' });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    const message = decodeURIComponent(href.slice('https://wa.me/?text='.length));
    expect(message).toContain(code);
    expect(message).toContain('Parcelles');
    expect(message).toContain('08:00');
  });
});

describe('BookingTicket when the clipboard refuses', () => {
  it('007-AS3: says the code could not be copied when the clipboard refuses', async () => {
    const user = await bookCarAt8();
    await user.click(await screen.findByRole('button', { name: /Retourner le billet/ }));
    // Le presse-papiers refuse : page hors contexte sécurisé, ou permission refusée.
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'));

    await user.click(screen.getByRole('button', { name: 'Copier le code' }));

    expect(
      await screen.findByText('Copie impossible : note le code ci-dessus.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Code copié')).not.toBeInTheDocument();
  });
});
