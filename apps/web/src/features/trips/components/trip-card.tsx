import type { TripResponse } from '@joj/shared';
import { Link } from '@tanstack/react-router';
import { Clock, MapPin, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { departureTime, priceLabel, remainingSeatsLabel, VEHICLE_LABELS } from './labels';

/** Un départ en covoiturage : ce qu'il faut savoir pour choisir, et « Réserver » (TR7). */
export function TripCard({ trip }: { trip: TripResponse }) {
  return (
    <li
      aria-label={`${VEHICLE_LABELS[trip.vehicle]} de ${departureTime(trip.departureAt)}`}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 motion-safe:animate-in motion-safe:fade-in"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-2xl font-extrabold text-baobab">
          <Clock aria-hidden="true" className="size-5" />
          {departureTime(trip.departureAt)}
        </p>
        <p className="font-semibold">{priceLabel(trip.priceFcfa)}</p>
      </div>
      <p className="font-semibold">{VEHICLE_LABELS[trip.vehicle]}</p>
      <p className="flex items-center gap-2">
        <MapPin aria-hidden="true" className="size-4 text-baobab" />
        {trip.departurePlace}
      </p>
      <p className="flex items-center gap-2">
        <Users aria-hidden="true" className="size-4 text-baobab" />
        {remainingSeatsLabel(trip.remainingSeats)}
      </p>
      {/* Le site et le jour suivent dans l'adresse : l'écran de réservation relit ce départ. */}
      <Link
        to="/reserver/$tripId"
        params={{ tripId: trip.id }}
        search={{ site: trip.site, date: trip.departureAt.slice(0, 10) }}
        className={cn(buttonVariants(), 'min-h-11 self-start')}
      >
        Réserver
      </Link>
    </li>
  );
}
