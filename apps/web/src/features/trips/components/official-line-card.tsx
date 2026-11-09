import type { OfficialLineResponse } from '@joj/shared';
import { Bus } from 'lucide-react';
import { OPERATOR_LABELS } from './labels';

/** Une ligne officielle, en bleu Atlantique : une alternative, qui ne se réserve pas ici. */
export function OfficialLineCard({ line }: { line: OfficialLineResponse }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg border-2 border-atlantique bg-card p-4">
      <p className="flex items-center gap-2 font-semibold text-atlantique">
        <Bus aria-hidden="true" className="size-5" />
        {OPERATOR_LABELS[line.operator]}
      </p>
      <p>{line.name}</p>
      <p>Départ : {line.departurePoint}</p>
      <p className="text-sm font-semibold text-atlantique">Elle ne se réserve pas ici.</p>
    </li>
  );
}
