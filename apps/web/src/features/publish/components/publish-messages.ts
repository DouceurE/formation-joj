import { ApiError } from '@/lib/api';

/** Les refus de l'API dits avec des mots de tous les jours, jamais avec leur code. */
const MESSAGES: Record<string, string> = {
  DEPARTURE_IN_PAST: 'Ce départ est déjà passé.',
  VALIDATION_FAILED: 'Vérifie les champs du formulaire.',
  PROPOSAL_SITE_NOT_FOUND:
    'Je n’ai pas trouvé le site (Dakar, Diamniadio ou Saly) dans ton annonce.',
  PROPOSAL_DEPARTURE_NOT_FOUND: 'Je n’ai pas trouvé l’heure de départ dans ton annonce.',
  ASSISTANT_UNAVAILABLE: 'L’assistant ne répond pas, remplis le formulaire.',
};

/** Le refus des places dépend du véhicule : l'API dit lequel dans `details`. */
const SEATS_MESSAGES: Record<string, string> = {
  voiture: 'Une voiture ou un taxi a 4 places au plus.',
  taxi: 'Une voiture ou un taxi a 4 places au plus.',
  'ndiaga-ndiaye': 'Un Ndiaga Ndiaye a 38 places au plus.',
};

const FALLBACK = 'Quelque chose n’a pas marché. Réessaie dans un instant.';

/** La phrase à montrer pour une erreur, connue ou non. */
export function publishErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK;
  if (error.code === 'SEATS_OUT_OF_RANGE') {
    return (
      SEATS_MESSAGES[String(error.details?.['vehicle'])] ?? 'Ce nombre de places est trop grand.'
    );
  }
  return MESSAGES[error.code] ?? FALLBACK;
}
