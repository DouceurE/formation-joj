import type { OfficialLineOperator, TripSite, TripVehicle } from '@joj/shared';

/** Les noms affichés : l'API parle en identifiants, l'écran en mots de Dakar. */
export const SITE_LABELS: Record<TripSite, string> = {
  dakar: 'Dakar',
  diamniadio: 'Diamniadio',
  saly: 'Saly',
};

export const VEHICLE_LABELS: Record<TripVehicle, string> = {
  voiture: 'Voiture',
  taxi: 'Taxi',
  'ndiaga-ndiaye': 'Ndiaga Ndiaye',
};

export const OPERATOR_LABELS: Record<OfficialLineOperator, string> = {
  'navette-joj': 'Navette JOJ',
  'dakar-dem-dikk': 'Dakar Dem Dikk',
};

/** L'heure d'un départ, à Dakar (GMT toute l'année) : « 08:00 ». */
export function departureTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Un prix en FCFA, à la française : « 1 500 FCFA », « Gratuit » pour 0. */
export function priceLabel(priceFcfa: number): string {
  return priceFcfa === 0 ? 'Gratuit' : `${priceFcfa.toLocaleString('fr-FR')} FCFA`;
}

export function remainingSeatsLabel(remaining: number): string {
  return remaining === 1 ? '1 place restante' : `${remaining} places restantes`;
}

/** Aujourd'hui, à Dakar : la date proposée quand l'adresse n'en donne pas. */
export function todayInDakar(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
