import { TRIP_VEHICLES, type TripVehicle } from '@joj/shared';
import { Bus, Car, CarTaxiFront, type LucideIcon } from 'lucide-react';
import { VEHICLE_LABELS } from '@/features/trips/components/labels';
import { cn } from '@/lib/utils';

const VEHICLE_ICONS: Record<TripVehicle, LucideIcon> = {
  voiture: Car,
  taxi: CarTaxiFront,
  'ndiaga-ndiaye': Bus,
};

/**
 * Trois grandes cases, une par véhicule : de vrais boutons radio, cachés sous leur case, pour
 * que le clavier et les lecteurs d'écran s'en servent comme d'une liste de choix.
 */
export function VehiclePicker({
  value,
  error,
  errorId,
  onChange,
}: {
  value: TripVehicle | '';
  error?: string | undefined;
  errorId: string;
  onChange: (vehicle: TripVehicle) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-sm font-medium">Véhicule</legend>
      <div className="grid grid-cols-3 gap-3">
        {TRIP_VEHICLES.map((vehicle) => {
          const Icon = VEHICLE_ICONS[vehicle];
          return (
            <label
              key={vehicle}
              className={cn(
                'flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-input bg-card p-3 text-center font-semibold',
                'has-[:checked]:border-baobab has-[:checked]:bg-baobab has-[:checked]:text-white',
                'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                'motion-safe:transition-colors',
              )}
            >
              <input
                type="radio"
                name="vehicle"
                value={vehicle}
                checked={value === vehicle}
                onChange={() => onChange(vehicle)}
                className="sr-only"
              />
              <Icon aria-hidden="true" className="size-7" />
              {VEHICLE_LABELS[vehicle]}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm font-semibold text-laterite-fonce">
          {error}
        </p>
      )}
    </fieldset>
  );
}
