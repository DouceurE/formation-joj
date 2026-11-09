import { bookSeatSchema, type BookSeatInput } from '@joj/shared';
import { type FormEvent, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELD_ERRORS = {
  passengerName: 'Ton nom est obligatoire.',
  passengerPhone: 'Ton téléphone est obligatoire.',
} as const;

type Field = keyof typeof FIELD_ERRORS;

/**
 * Le nom et le téléphone du supporter. Le schéma partagé arrête un champ vide avant tout appel ;
 * l'API revérifie, et ses refus sont affichés par la page.
 */
export function BookingForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (input: BookSeatInput) => void;
}) {
  const nameId = useId();
  const phoneId = useId();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = bookSeatSchema.safeParse({
      passengerName: String(data.get('passengerName') ?? ''),
      passengerPhone: String(data.get('passengerPhone') ?? ''),
    });
    if (!parsed.success) {
      const fields = new Set(parsed.error.issues.map((issue) => issue.path[0] as Field));
      setErrors(Object.fromEntries([...fields].map((field) => [field, FIELD_ERRORS[field]])));
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Nom</Label>
        <Input
          id={nameId}
          name="passengerName"
          autoComplete="name"
          className="min-h-11"
          aria-invalid={errors.passengerName ? true : undefined}
          aria-describedby={errors.passengerName ? `${nameId}-error` : undefined}
        />
        {errors.passengerName && (
          <p id={`${nameId}-error`} className="text-sm font-semibold text-laterite-fonce">
            {errors.passengerName}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={phoneId}>Téléphone</Label>
        <Input
          id={phoneId}
          name="passengerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="77 123 45 67"
          className="min-h-11"
          aria-invalid={errors.passengerPhone ? true : undefined}
          aria-describedby={errors.passengerPhone ? `${phoneId}-error` : undefined}
        />
        {errors.passengerPhone && (
          <p id={`${phoneId}-error`} className="text-sm font-semibold text-laterite-fonce">
            {errors.passengerPhone}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="min-h-11 text-base">
        Réserver ma place
      </Button>
    </form>
  );
}
