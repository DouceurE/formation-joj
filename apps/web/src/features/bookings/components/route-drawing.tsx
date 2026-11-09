import type { TripVehicle } from '@joj/shared';
import { Bus, Car, CarTaxiFront } from 'lucide-react';

const VEHICLE_ICONS = { voiture: Car, taxi: CarTaxiFront, 'ndiaga-ndiaye': Bus } as const;

/**
 * La route du lieu de départ au site, qui se dessine, avec le véhicule qui la parcourt. Un
 * dessin, pas une carte. Les deux animations n'existent que sous `motion-safe:` : sans elles,
 * la route est déjà tracée et le véhicule arrivé au milieu.
 */
export function RouteDrawing({
  from,
  to,
  vehicle,
}: {
  from: string;
  to: string;
  vehicle: TripVehicle;
}) {
  const VehicleIcon = VEHICLE_ICONS[vehicle];
  return (
    <div role="img" aria-label={`Trajet de ${from} à ${to}`} className="flex flex-col gap-2">
      <div className="relative h-16">
        <svg viewBox="0 0 300 40" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path
            d="M10 30 C 80 0, 160 40, 290 12"
            fill="none"
            stroke="var(--baobab)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="6 8"
            className="motion-safe:animate-[dem-draw_1.2s_ease-out_both]"
          />
          <circle cx="10" cy="30" r="6" fill="var(--soleil)" />
          <circle cx="290" cy="12" r="6" fill="var(--laterite)" />
        </svg>
        <VehicleIcon
          aria-hidden="true"
          className="absolute top-3 left-1/2 size-8 -translate-x-1/2 rounded-full bg-soleil p-1 text-texte motion-safe:animate-[dem-drive_1.6s_ease-in-out_both]"
        />
      </div>
      <div className="flex justify-between font-semibold" aria-hidden="true">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  );
}
