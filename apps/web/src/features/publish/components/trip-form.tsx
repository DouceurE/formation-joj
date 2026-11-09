import {
  type PublishTripInput,
  publishTripSchema,
  TRIP_SITES,
  type TripSite,
  type TripVehicle,
  VEHICLE_MAX_SEATS,
} from '@joj/shared';
import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { SITE_LABELS } from '@/features/trips/components/labels';
import { VehiclePicker } from './vehicle-picker';

/** Le formulaire tel que le conducteur le remplit : du texte, converti à l'envoi. */
export interface TripDraft {
  vehicle: TripVehicle | '';
  departurePlace: string;
  site: TripSite | '';
  day: string;
  time: string;
  seats: string;
  priceFcfa: string;
  driverPhone: string;
}

type Field = keyof TripDraft;
type Errors = Partial<Record<Field, string>>;

const MISSING: Record<Field, string> = {
  vehicle: 'Choisis ton véhicule.',
  departurePlace: 'Le lieu de départ est obligatoire.',
  site: 'Choisis le site.',
  day: 'Le jour est obligatoire.',
  time: 'L’heure est obligatoire.',
  seats: 'Le nombre de places est obligatoire.',
  priceFcfa: 'Le prix est obligatoire.',
  driverPhone: 'Ton téléphone est obligatoire.',
};

const INVALID: Errors = {
  seats: 'Il faut un nombre entier de places, 1 au moins.',
  priceFcfa: 'Le prix est un nombre entier de FCFA, 0 si c’est gratuit.',
};

const FIELDS = Object.keys(MISSING) as Field[];
const isField = (value: string): value is Field => (FIELDS as string[]).includes(value);

/** Le trajet prêt à envoyer, ou les champs à corriger : rien ne part tant qu'un champ manque. */
function check(draft: TripDraft): { input: PublishTripInput } | { errors: Errors } {
  const missing = FIELDS.filter((field) => !draft[field].trim());
  if (missing.length > 0) {
    return { errors: Object.fromEntries(missing.map((field) => [field, MISSING[field]])) };
  }
  const seats = Number(draft.seats);
  const parsed = publishTripSchema.safeParse({
    vehicle: draft.vehicle,
    departurePlace: draft.departurePlace,
    site: draft.site,
    // Dakar vit à l'heure GMT toute l'année : l'heure saisie est déjà l'heure GMT.
    departureAt: `${draft.day}T${draft.time}:00.000Z`,
    seats,
    priceFcfa: Number(draft.priceFcfa),
    driverPhone: draft.driverPhone,
  });
  const invalid = new Set<Field>(seats < 1 ? ['seats'] : []);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      // Le jour et l'heure forment ensemble le départ envoyé à l'API.
      if (field === 'departureAt') invalid.add('time');
      else if (isField(field)) invalid.add(field);
    }
  }
  if (!parsed.success || invalid.size > 0) {
    return {
      errors: Object.fromEntries(
        [...invalid].map((field) => [field, INVALID[field] ?? MISSING[field]]),
      ),
    };
  }
  return { input: parsed.data };
}

/**
 * Le trajet du conducteur. Le maximum des places suit le véhicule choisi ; l'API revérifie
 * tout, et ses refus sont affichés par la page.
 */
export function TripForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: TripDraft;
  pending: boolean;
  onSubmit: (input: PublishTripInput) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const maxSeats = draft.vehicle ? VEHICLE_MAX_SEATS[draft.vehicle] : undefined;

  const fieldId = (field: Field) => `${id}-${field}`;
  const errorId = (field: Field) => `${id}-${field}-error`;
  const set = (field: Field) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  function chooseVehicle(vehicle: TripVehicle) {
    const max = VEHICLE_MAX_SEATS[vehicle];
    // Changer de véhicule ramène les places sous son maximum.
    setDraft((d) => ({ ...d, vehicle, seats: Number(d.seats) > max ? String(max) : d.seats }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = check(draft);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.input);
  }

  /** Les attributs qui relient un champ à son libellé et à son erreur. */
  const described = (field: Field) => ({
    id: fieldId(field),
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? errorId(field) : undefined,
  });

  const row = (field: Field, label: string, control: ReactNode, hint?: string) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={fieldId(field)}>{label}</Label>
      {control}
      {hint && <p className="text-sm">{hint}</p>}
      {errors[field] && (
        <p id={errorId(field)} className="text-sm font-semibold text-laterite-fonce">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <VehiclePicker
        value={draft.vehicle}
        error={errors.vehicle}
        errorId={errorId('vehicle')}
        onChange={chooseVehicle}
      />
      {row(
        'departurePlace',
        'Lieu de départ',
        <Input
          {...described('departurePlace')}
          placeholder="Pikine, Parcelles, Keur Massar…"
          className="min-h-11"
          value={draft.departurePlace}
          onChange={(event) => set('departurePlace')(event.target.value)}
        />,
      )}
      {row(
        'site',
        'Site',
        <NativeSelect
          {...described('site')}
          className="min-h-11"
          value={draft.site}
          onChange={(event) => set('site')(event.target.value)}
        >
          <option value="">Choisis le site</option>
          {TRIP_SITES.map((site) => (
            <option key={site} value={site}>
              {SITE_LABELS[site]}
            </option>
          ))}
        </NativeSelect>,
      )}
      <div className="grid grid-cols-2 gap-4">
        {row(
          'day',
          'Jour',
          <Input
            {...described('day')}
            type="date"
            className="min-h-11"
            value={draft.day}
            onChange={(event) => set('day')(event.target.value)}
          />,
        )}
        {row(
          'time',
          'Heure',
          <Input
            {...described('time')}
            type="time"
            className="min-h-11"
            value={draft.time}
            onChange={(event) => set('time')(event.target.value)}
          />,
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {row(
          'seats',
          'Places',
          <Input
            {...described('seats')}
            type="number"
            inputMode="numeric"
            min={1}
            max={maxSeats}
            className="min-h-11"
            value={draft.seats}
            onChange={(event) => set('seats')(event.target.value)}
          />,
          maxSeats ? `${maxSeats} au plus.` : undefined,
        )}
        {row(
          'priceFcfa',
          'Prix (FCFA)',
          <Input
            {...described('priceFcfa')}
            type="number"
            inputMode="numeric"
            min={0}
            className="min-h-11"
            value={draft.priceFcfa}
            onChange={(event) => set('priceFcfa')(event.target.value)}
          />,
        )}
      </div>
      {row(
        'driverPhone',
        'Téléphone',
        <Input
          {...described('driverPhone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="77 123 45 67"
          className="min-h-11"
          value={draft.driverPhone}
          onChange={(event) => set('driverPhone')(event.target.value)}
        />,
      )}
      <Button type="submit" size="lg" disabled={pending} className="min-h-11 text-base">
        Publier
      </Button>
    </form>
  );
}
