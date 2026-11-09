import { TRIP_SITES, type TripSite } from '@joj/shared';
import { AlertTriangle } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useOfficialLines, useTripsOfDay } from '../api/trips.queries';
import { SITE_LABELS } from './labels';
import { OfficialLineCard } from './official-line-card';
import { TripCard } from './trip-card';

export interface DeparturesSearch {
  site?: TripSite | undefined;
  date: string;
}

interface DeparturesPageProps extends DeparturesSearch {
  /** Le site ou le jour a changé : la route les écrit dans l'adresse. */
  onSearchChange: (search: DeparturesSearch) => void;
}

/** Les départs d'un site pour un jour, puis les lignes officielles en alternative. */
export function DeparturesPage({ site, date, onSearchChange }: DeparturesPageProps) {
  const siteId = useId();
  const dateId = useId();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">Les départs</h1>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <div className="flex flex-col gap-2">
          <Label htmlFor={siteId}>Site</Label>
          <NativeSelect
            id={siteId}
            className="min-h-11"
            value={site ?? ''}
            onChange={(event) =>
              onSearchChange({
                site: (event.target.value || undefined) as TripSite | undefined,
                date,
              })
            }
          >
            <option value="">Choisis ton site</option>
            {TRIP_SITES.map((value) => (
              <option key={value} value={value}>
                {SITE_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={dateId}>Jour</Label>
          <Input
            id={dateId}
            type="date"
            className="min-h-11"
            value={date}
            onChange={(event) =>
              event.target.value && onSearchChange({ site, date: event.target.value })
            }
          />
        </div>
      </form>

      {site ? (
        <>
          <TripsOfDay site={site} date={date} />
          <OfficialLines site={site} />
        </>
      ) : (
        <p>Choisis ton site pour voir les départs du jour.</p>
      )}
    </div>
  );
}

function TripsOfDay({ site, date }: { site: TripSite; date: string }) {
  const trips = useTripsOfDay(site, date);

  if (trips.isPending) return <p>Chargement des départs…</p>;
  if (trips.isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border-2 border-laterite bg-card p-4 text-laterite-fonce"
      >
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle aria-hidden="true" className="size-5" />
          Impossible de charger les départs.
        </p>
        <Button variant="destructive" className="min-h-11" onClick={() => void trips.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (trips.data.length === 0) {
    return (
      <div className="flex flex-col gap-1 rounded-lg bg-muted p-4">
        <p className="font-semibold">Aucun départ ce jour-là</p>
        <p>Choisis un autre jour ci-dessus, ou prends une ligne officielle ci-dessous.</p>
      </div>
    );
  }
  return (
    <ul aria-label="Départs" className="flex flex-col gap-3">
      {trips.data.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </ul>
  );
}

function OfficialLines({ site }: { site: TripSite }) {
  const lines = useOfficialLines(site);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl text-atlantique">Lignes officielles</h2>
      {lines.isPending && <p>Chargement des lignes officielles…</p>}
      {lines.isError && <p>Les lignes officielles sont indisponibles pour l’instant.</p>}
      {lines.data?.length === 0 && <p>Aucune ligne officielle vers {SITE_LABELS[site]}.</p>}
      {lines.data && lines.data.length > 0 && (
        <ul aria-label="Lignes officielles" className="flex flex-col gap-3">
          {lines.data.map((line) => (
            <OfficialLineCard key={line.id} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}
