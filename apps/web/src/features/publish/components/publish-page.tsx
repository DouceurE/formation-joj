import type { TripProposalResponse } from '@joj/shared';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { todayInDakar } from '@/features/trips/components/labels';
import { usePublishTrip } from '../api/publish.queries';
import { AnnouncementReader } from './announcement-reader';
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

/**
 * Ce que l'assistant a compris, prêt à relire : un champ qu'il n'a pas trouvé reste vide, et
 * le prix et le téléphone sont toujours laissés au conducteur.
 */
function draftFromProposal(proposal: TripProposalResponse): TripDraft {
  return {
    ...emptyDraft(),
    vehicle: proposal.vehicle ?? '',
    departurePlace: proposal.departurePlace ?? '',
    site: proposal.site,
    // Dakar vit à l'heure GMT : le jour et l'heure se lisent tels quels dans l'instant ISO.
    day: proposal.departureAt.slice(0, 10),
    time: proposal.departureAt.slice(11, 16),
    seats: proposal.seats === null ? '' : String(proposal.seats),
  };
}

/** L'écran du conducteur : l'annonce à lire, le formulaire, puis « Dem na ! » et son code. */
export function PublishPage() {
  const publish = usePublishTrip();
  // Chaque proposition remplace le formulaire : une nouvelle clé le remonte avec ses valeurs.
  const [form, setForm] = useState({ key: 0, draft: emptyDraft() });

  if (publish.isSuccess) return <PublishedTrip trip={publish.data} />;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Publier un trajet</h1>
      <p>
        Colle ton annonce WhatsApp pour remplir le formulaire, ou remplis-le toi-même : les
        supporters verront tes places.
      </p>
      <AnnouncementReader
        onProposal={(proposal) =>
          setForm((current) => ({ key: current.key + 1, draft: draftFromProposal(proposal) }))
        }
      />
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
        key={form.key}
        initial={form.draft}
        pending={publish.isPending}
        onSubmit={(input) => publish.mutate(input)}
      />
    </div>
  );
}
