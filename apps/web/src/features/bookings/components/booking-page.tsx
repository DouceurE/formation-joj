import type { TripSite } from '@joj/shared';
import { Link } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTripsOfDay } from '@/features/trips/api/trips.queries';
import {
  departureTime,
  priceLabel,
  SITE_LABELS,
  VEHICLE_LABELS,
} from '@/features/trips/components/labels';
import { cn } from '@/lib/utils';
import { useBookSeat } from '../api/bookings.queries';
import { savedBookings } from '../storage/saved-bookings';
import { BookingForm } from './booking-form';
import { bookingErrorMessage } from './booking-messages';
import { BookingTicket } from './booking-ticket';
import { RouteDrawing } from './route-drawing';
import { SeatsCounter } from './seats-counter';

export interface BookingPageProps {
  tripId: string;
  site?: TripSite | undefined;
  date?: string | undefined;
}

/** Réserver une place sur un départ : la route, les détails, le compteur, puis le formulaire. */
export function BookingPage({ tripId, site, date }: BookingPageProps) {
  if (!site || !date) return <TripNotFound />;
  return <BookingForTrip tripId={tripId} site={site} date={date} />;
}

function BookingForTrip({ tripId, site, date }: { tripId: string; site: TripSite; date: string }) {
  // Le trajet vient de la liste du jour (TR6) : l'API n'a pas de route pour un seul trajet.
  const trips = useTripsOfDay(site, date);
  const booking = useBookSeat(tripId);

  if (trips.isPending) return <p>Chargement du trajet…</p>;
  // Une panne n'est pas un trajet qui n'existe pas : on propose de réessayer, comme en TR6.
  if (trips.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border-2 border-laterite bg-card p-4 text-laterite-fonce"
      >
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle aria-hidden="true" className="size-5" />
          Impossible de charger ce trajet.
        </p>
        <Button variant="destructive" className="min-h-11" onClick={() => void trips.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }
  const trip = trips.data.find((candidate) => candidate.id === tripId);
  if (!trip) return <TripNotFound />;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Réserver ma place</h1>
      <RouteDrawing from={trip.departurePlace} to={SITE_LABELS[trip.site]} vehicle={trip.vehicle} />
      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-card p-4">
        <div>
          <dt className="text-sm">Heure</dt>
          <dd className="font-display text-2xl font-extrabold text-baobab">
            {departureTime(trip.departureAt)}
          </dd>
        </div>
        <div>
          <dt className="text-sm">Véhicule</dt>
          <dd className="font-semibold">{VEHICLE_LABELS[trip.vehicle]}</dd>
        </div>
        <div>
          <dt className="text-sm">Prix</dt>
          <dd className="font-semibold">{priceLabel(trip.priceFcfa)}</dd>
        </div>
      </dl>
      <SeatsCounter remaining={trip.remainingSeats} />

      {booking.isError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border-2 border-laterite bg-card p-4 font-semibold text-laterite-fonce"
        >
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
          {bookingErrorMessage(booking.error)}
        </div>
      )}
      {booking.isSuccess ? (
        <BookingTicket booking={booking.data} />
      ) : (
        <BookingForm
          pending={booking.isPending}
          onSubmit={(input) =>
            booking.mutate(input, {
              // Gardé dans le téléphone tout de suite, pour « Mes trajets ».
              onSuccess: (confirmation) => savedBookings.save(confirmation.bookingCode),
            })
          }
        />
      )}
    </div>
  );
}

function TripNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl">Trajet introuvable</h1>
      <p>Ce départ n’existe plus, ou le lien est incomplet.</p>
      <Link to="/departs" className={cn(buttonVariants(), 'min-h-11')}>
        Voir les départs
      </Link>
    </div>
  );
}
