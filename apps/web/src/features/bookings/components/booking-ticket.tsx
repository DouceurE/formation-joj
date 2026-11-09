import type { BookingConfirmationResponse } from '@joj/shared';
import { Copy, MessageCircle, Ticket } from 'lucide-react';
import { useState } from 'react';
import { CarRapideFrieze } from '@/brand/car-rapide-frieze';
import { Button, buttonVariants } from '@/components/ui/button';
import { departureTime } from '@/features/trips/components/labels';
import { cn } from '@/lib/utils';

/** Le message envoyé à soi-même sur WhatsApp : de quoi retrouver sa place sans l'application. */
function whatsAppLink(booking: BookingConfirmationResponse): string {
  const message = [
    'Dem — ma place est gardée.',
    `Code : ${booking.bookingCode}`,
    `Départ : ${booking.departurePlace}, à ${departureTime(booking.departureAt)}`,
    `Chauffeur : ${booking.driverPhone}`,
  ].join('\n');
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Le billet : « Votre place est gardée », puis, une fois touché, le code et les détails.
 * Le retournement 3D est une transition CSS sous `motion-safe:` ; sans animation, la face
 * arrière s'affiche directement. La face cachée est aussi cachée aux lecteurs d'écran.
 */
export function BookingTicket({ booking }: { booking: BookingConfirmationResponse }) {
  const [turned, setTurned] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  /** Le presse-papiers peut refuser (permission, page non sécurisée) : on le dit, le code reste lisible. */
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(booking.bookingCode);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Ton billet">
      <button
        type="button"
        aria-pressed={turned}
        onClick={() => setTurned(true)}
        className="min-h-11 text-left [perspective:1200px]"
      >
        <span className="sr-only">Retourner le billet</span>
        <div
          className={cn(
            'relative grid [transform-style:preserve-3d] motion-safe:transition-transform motion-safe:duration-700',
            turned && '[transform:rotateY(180deg)]',
          )}
        >
          <div
            aria-hidden={turned}
            className="col-start-1 row-start-1 flex flex-col gap-3 overflow-hidden rounded-xl bg-baobab text-white [backface-visibility:hidden]"
          >
            <CarRapideFrieze />
            <div className="flex flex-col gap-2 p-5">
              <Ticket aria-hidden="true" className="size-8 text-soleil" />
              <p className="font-display text-3xl font-extrabold">Votre place est gardée</p>
              <p>Touche le billet pour voir ton code.</p>
            </div>
          </div>
          <div
            aria-hidden={!turned}
            className="col-start-1 row-start-1 flex flex-col gap-2 rounded-xl border-4 border-baobab bg-card p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <p className="text-sm">Code de réservation</p>
            <p
              data-testid="booking-code"
              className="font-display text-4xl font-extrabold tracking-widest text-baobab"
            >
              {booking.bookingCode}
            </p>
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-sm">Départ</dt>
                <dd className="font-semibold">{booking.departurePlace}</dd>
              </div>
              <div>
                <dt className="text-sm">Heure</dt>
                <dd className="font-semibold">{departureTime(booking.departureAt)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm">Téléphone du chauffeur</dt>
                <dd className="font-semibold">{booking.driverPhone}</dd>
              </div>
            </dl>
            <p className="font-display text-2xl font-extrabold text-baobab">Jërëjëf !</p>
          </div>
        </div>
      </button>

      {turned && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="min-h-11" onClick={() => void copyCode()}>
            <Copy aria-hidden="true" />
            Copier le code
          </Button>
          <a
            href={whatsAppLink(booking)}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), 'min-h-11')}
          >
            <MessageCircle aria-hidden="true" />
            Envoyer sur WhatsApp
          </a>
          <p
            role="status"
            className={cn(
              'self-center font-semibold',
              copyStatus === 'failed' && 'text-laterite-fonce',
            )}
          >
            {copyStatus === 'copied' && 'Code copié'}
            {copyStatus === 'failed' && 'Copie impossible : note le code ci-dessus.'}
          </p>
        </div>
      )}
    </section>
  );
}
