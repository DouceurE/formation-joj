import { proposeTripSchema, type TripProposalResponse } from '@joj/shared';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useProposeTrip } from '../api/publish.queries';
import { publishErrorMessage } from './publish-messages';

/**
 * L'annonce WhatsApp collée telle quelle. L'assistant la lit et propose un trajet, que la page
 * met dans le formulaire : rien n'est publié avant « Publier ».
 */
export function AnnouncementReader({
  onProposal,
}: {
  onProposal: (proposal: TripProposalResponse) => void;
}) {
  const id = useId();
  const [message, setMessage] = useState('');
  const [empty, setEmpty] = useState(false);
  const propose = useProposeTrip();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = proposeTripSchema.safeParse({ message });
    setEmpty(!parsed.success);
    if (parsed.success) propose.mutate(parsed.data.message, { onSuccess: onProposal });
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-baobab bg-card p-4"
    >
      <Label htmlFor={id}>Ton annonce WhatsApp</Label>
      <textarea
        id={id}
        rows={3}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places"
        aria-invalid={empty ? true : undefined}
        aria-describedby={empty ? `${id}-error` : undefined}
        className={cn(
          'min-h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        )}
      />
      {empty && (
        <p id={`${id}-error`} className="text-sm font-semibold text-laterite-fonce">
          Colle ton annonce avant de la faire lire.
        </p>
      )}
      <Button
        type="submit"
        variant="secondary"
        disabled={propose.isPending}
        className="min-h-11 self-start"
      >
        <Sparkles aria-hidden="true" />
        {propose.isPending ? 'Lecture en cours…' : 'Lire mon annonce'}
      </Button>
      {propose.isError && (
        <p role="alert" className="flex items-center gap-2 font-semibold text-laterite-fonce">
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
          {publishErrorMessage(propose.error)}
        </p>
      )}
      {propose.isSuccess && (
        <p role="status" className="font-semibold">
          J’ai rempli le formulaire avec ton annonce : relis-le, complète le prix et ton téléphone,
          puis touche « Publier ».
        </p>
      )}
    </form>
  );
}
