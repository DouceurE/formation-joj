import type { OfficialLineOperator, TripSite } from '@joj/shared';

/** Une ligne de transport public vers un site : elle ne se réserve pas dans l'application. */
export interface OfficialLine {
  /** Uuid fixe, qu'aucun trajet ne porte : réserver dessus donne « trajet introuvable ». */
  id: string;
  operator: OfficialLineOperator;
  name: string;
  departurePoint: string;
  site: TripSite;
}

/**
 * La liste fixe des lignes officielles. Ce sont des EXEMPLES, signalés dans leur nom :
 * à remplacer ici par les données officielles des navettes JOJ et de Dakar Dem Dikk.
 */
export const OFFICIAL_LINES: readonly OfficialLine[] = [
  {
    id: '0199f5c2-0000-7000-8000-0000000a0001',
    operator: 'navette-joj',
    name: 'Navette JOJ Dakar → Diamniadio (exemple)',
    departurePoint: 'Point de départ à confirmer (exemple)',
    site: 'diamniadio',
  },
  {
    id: '0199f5c2-0000-7000-8000-0000000a0002',
    operator: 'dakar-dem-dikk',
    name: 'Dakar Dem Dikk vers Diamniadio (exemple)',
    departurePoint: 'Point de départ à confirmer (exemple)',
    site: 'diamniadio',
  },
  {
    id: '0199f5c2-0000-7000-8000-0000000a0003',
    operator: 'navette-joj',
    name: 'Navette JOJ Dakar → Saly (exemple)',
    departurePoint: 'Point de départ à confirmer (exemple)',
    site: 'saly',
  },
];

/** Les lignes officielles qui desservent un site, dans l'ordre de la liste. */
export function officialLinesTo(site: TripSite): OfficialLine[] {
  return OFFICIAL_LINES.filter((line) => line.site === site);
}
