import type { BookingStatus, BookingViewResponse } from '@joj/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { departureTime } from '@/features/trips/components/labels';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { bookingQueryOptions, useBookings, useCancelBooking } from '../api/bookings.queries';
import { savedBookings } from '../storage/saved-bookings';
import { bookingErrorMessage, UNKNOWN_CODE_MESSAGE } from './booking-messages';

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmee: 'Confirmée',
  annulee: 'Annulée',
  'trajet-annule': 'Trajet annulé',
};

/** « Mes trajets » : les réservations gardées dans le téléphone, et celles qu'on retrouve par code. */
export function MyTripsPage() {
  const [codes, setCodes] = useState(() => savedBookings.list());
  const bookings = useBookings(codes);

  function keep(code: string) {
    savedBookings.save(code);
    setCodes(savedBookings.list());
  }

  function forget(code: string) {
    savedBookings.forget(code);
    setCodes(savedBookings.list());
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">Mes trajets</h1>
      <FindByCode onFound={keep} />
      {codes.length === 0 ? (
        <p>Aucune réservation gardée sur ce téléphone pour l’instant.</p>
      ) : (
        <ul aria-label="Mes réservations" className="flex flex-col gap-3">
          {codes.map((code, index) => {
            const query = bookings[index];
            return (
              <li
                key={code}
                aria-label={`Réservation ${code}`}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4"
              >
                <p className="font-display text-xl font-extrabold tracking-widest text-baobab">
                  {code}
                </p>
                {query?.data ? (
                  <BookingDetails booking={query.data} />
                ) : query?.isError ? (
                  <p>{bookingErrorMessage(query.error)}</p>
                ) : (
                  <p>Chargement…</p>
                )}
                <Button
                  variant="outline"
                  className="min-h-11 self-start"
                  onClick={() => forget(code)}
                >
                  Oublier ce trajet
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BookingDetails({ booking }: { booking: BookingViewResponse }) {
  const cancelledByDriver = booking.status === 'trajet-annule';
  return (
    <>
      <p
        className={cn(
          'font-semibold',
          cancelledByDriver &&
            'flex items-center gap-2 rounded-md border-2 border-laterite p-2 text-laterite-fonce',
        )}
      >
        {cancelledByDriver && <AlertTriangle aria-hidden="true" className="size-5" />}
        {STATUS_LABELS[booking.status]}
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
      </dl>
      {cancelledByDriver && (
        <Link
          to="/departs"
          search={{ date: booking.departureAt.slice(0, 10) }}
          className={cn(buttonVariants(), 'min-h-11 self-start')}
        >
          Voir les autres départs
        </Link>
      )}
      {booking.status === 'confirmee' && <CancelBooking code={booking.bookingCode} />}
    </>
  );
}

/** Annuler, seulement après confirmation : la place revient au trajet. */
function CancelBooking({ code }: { code: string }) {
  const cancel = useCancelBooking();
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="min-h-11 self-start" disabled={cancel.isPending}>
            Annuler
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta place sera rendue au trajet, pour un autre supporter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Garder ma place</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }), 'min-h-11')}
              onClick={() => cancel.mutate(code)}
            >
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {cancel.isError && (
        <p role="alert" className="font-semibold text-laterite-fonce">
          {bookingErrorMessage(cancel.error)}
        </p>
      )}
    </>
  );
}

/** Retrouver une réservation par son code, puis la garder dans le téléphone. */
function FindByCode({ onFound }: { onFound: (code: string) => void }) {
  const fieldId = useId();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('code') ?? '')
      .trim()
      .toUpperCase();
    if (code.length === 0) return;
    setPending(true);
    try {
      await queryClient.fetchQuery(bookingQueryOptions(code));
      setMessage(null);
      onFound(code);
    } catch (error) {
      // Un code mal tapé (pas 8 caractères) est refusé comme mal formé : pour le supporter,
      // c'est simplement un code qui ne mène à aucune réservation.
      const malformed = error instanceof ApiError && error.code === 'VALIDATION_FAILED';
      setMessage(malformed ? UNKNOWN_CODE_MESSAGE : bookingErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void find(event)} className="flex flex-col gap-2">
      <Label htmlFor={fieldId}>Code de réservation</Label>
      <div className="flex gap-2">
        <Input
          id={fieldId}
          name="code"
          autoCapitalize="characters"
          className="min-h-11"
          aria-describedby={message ? `${fieldId}-message` : undefined}
        />
        <Button type="submit" className="min-h-11" disabled={pending}>
          Retrouver
        </Button>
      </div>
      {message && (
        <p id={`${fieldId}-message`} role="alert" className="font-semibold text-laterite-fonce">
          {message}
        </p>
      )}
    </form>
  );
}
