import { AlertTriangle } from 'lucide-react';
import { todayInDakar } from '@/features/trips/components/labels';
import { usePublishTrip } from '../api/publish.queries';
import { publishErrorMessage } from './publish-messages';
import { PublishedTrip } from './published-trip';
import { type TripDraft, TripForm } from './trip-form';

const emptyDraft = (): TripDraft => ({
  vehicle: '',
  departurePlace: '',
  site: '',
  day: todayInDakar(),
  time: '',
  seats: '',
  priceFcfa: '',
  driverPhone: '',
});

/** L'écran du conducteur : le formulaire, puis « Dem na ! » avec le code de gestion. */
export function PublishPage() {
  const publish = usePublishTrip();

  if (publish.isSuccess) return <PublishedTrip trip={publish.data} />;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Publier un trajet</h1>
      <p>Choisis ton véhicule et remplis ton trajet : les supporters verront tes places.</p>
      {publish.isError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border-2 border-laterite bg-card p-4 font-semibold text-laterite-fonce"
        >
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
          {publishErrorMessage(publish.error)}
        </div>
      )}
      <TripForm
        initial={emptyDraft()}
        pending={publish.isPending}
        onSubmit={(input) => publish.mutate(input)}
      />
    </div>
  );
}
