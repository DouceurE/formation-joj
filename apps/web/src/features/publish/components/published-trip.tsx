import type { PublishedTripResponse } from '@joj/shared';
import { Link } from '@tanstack/react-router';
import { Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CarRapideFrieze } from '@/brand/car-rapide-frieze';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  departureTime,
  remainingSeatsLabel,
  SITE_LABELS,
  VEHICLE_LABELS,
} from '@/features/trips/components/labels';
import { cn } from '@/lib/utils';

/** Le jour d'un départ, à Dakar : « mardi 10 novembre ». */
function departureDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * « Dem na ! » : le trajet est publié. Le code de gestion s'affiche une seule fois ; il n'est
 * pas gardé dans le téléphone, d'où « Copier le code ».
 */
export function PublishedTrip({ trip }: { trip: PublishedTripResponse }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Le formulaire a disparu : on amène le lecteur d'écran sur la bonne nouvelle.
  useEffect(() => heading.current?.focus(), []);

  /** Le presse-papiers peut refuser (permission, page non sécurisée) : on le dit, le code reste lisible. */
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(trip.managementCode);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="published-trip-title">
      <div className="overflow-hidden rounded-xl bg-baobab text-white">
        <CarRapideFrieze />
        <div className="flex flex-col gap-2 p-5">
          <h1
            id="published-trip-title"
            ref={heading}
            tabIndex={-1}
            className="font-display text-4xl font-extrabold text-soleil outline-none motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:fade-in motion-safe:duration-500"
          >
            Dem na !
          </h1>
          <p className="text-lg">
            Ton {VEHICLE_LABELS[trip.vehicle]} de {trip.departurePlace} vers{' '}
            {SITE_LABELS[trip.site]} est publié : {departureDay(trip.departureAt)} à{' '}
            {departureTime(trip.departureAt)}, {remainingSeatsLabel(trip.remainingSeats)}.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border-4 border-baobab bg-card p-5">
        <p className="text-sm">Ton code de gestion</p>
        <p
          data-testid="management-code"
          className="font-display text-4xl font-extrabold tracking-widest text-baobab"
        >
          {trip.managementCode}
        </p>
        <p>
          Garde ce code : il te sert à annuler ton trajet. Il n’est pas gardé dans ce téléphone.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" className="min-h-11" onClick={() => void copyCode()}>
          <Copy aria-hidden="true" />
          Copier le code
        </Button>
        <Link
          to="/departs"
          search={{ site: trip.site, date: trip.departureAt.slice(0, 10) }}
          className={cn(buttonVariants(), 'min-h-11')}
        >
          Voir le départ
        </Link>
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
    </section>
  );
}
