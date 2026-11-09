import { cancelTripSchema } from '@joj/shared';
import { AlertTriangle, CircleCheck } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCancelTrip } from '../api/publish.queries';
import { publishErrorMessage, UNKNOWN_TRIP_CODE_MESSAGE } from './publish-messages';

/**
 * Annuler son trajet avec son code de gestion, seulement après confirmation. Un code mal tapé
 * est dit tout de suite, sans appel à l'API.
 */
export function CancelTripForm() {
  const id = useId();
  const [code, setCode] = useState('');
  const [mistyped, setMistyped] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cancel = useCancelTrip();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancel.reset();
    const parsed = cancelTripSchema.safeParse({ managementCode: code });
    setMistyped(!parsed.success);
    setConfirming(parsed.success);
  }

  const failure = mistyped
    ? UNKNOWN_TRIP_CODE_MESSAGE
    : cancel.isError
      ? publishErrorMessage(cancel.error)
      : null;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3 border-t-2 pt-5">
      <h2 id={`${id}-title`} className="text-2xl">
        Annuler mon trajet
      </h2>
      <p>Tu ne pars plus ? Saisis le code de gestion reçu à la publication.</p>
      <form noValidate onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={id}>Code de gestion</Label>
          <Input
            id={id}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="min-h-11 font-semibold tracking-widest"
          />
        </div>
        <Button
          type="submit"
          variant="destructive"
          disabled={cancel.isPending}
          className="min-h-11"
        >
          Annuler mon trajet
        </Button>
      </form>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce trajet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Il disparaîtra des départs, et les supporters verront qu’il ne part plus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Garder mon trajet</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }), 'min-h-11')}
              onClick={() => cancel.mutate(code.trim())}
            >
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {failure && (
        <p role="alert" className="flex items-center gap-2 font-semibold text-laterite-fonce">
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
          {failure}
        </p>
      )}
      {cancel.isSuccess && (
        <p role="status" className="flex items-center gap-2 font-semibold text-baobab">
          <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
          Trajet annulé
        </p>
      )}
    </section>
  );
}
