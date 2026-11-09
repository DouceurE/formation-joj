import { tripSiteSchema } from '@joj/shared';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { DeparturesPage } from '@/features/trips/components/departures-page';
import { todayInDakar } from '@/features/trips/components/labels';

/**
 * Le site et le jour vivent dans l'adresse (`/departs?site=diamniadio&date=2026-11-10`) : un lien
 * partagé sur WhatsApp ouvre les mêmes départs. Une valeur mal formée est simplement ignorée.
 */
const searchSchema = z.object({
  site: tripSiteSchema.optional().catch(undefined),
  date: z.iso.date().optional().catch(undefined),
});

function Departures() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <DeparturesPage
      site={search.site}
      date={search.date ?? todayInDakar()}
      onSearchChange={(next) => void navigate({ search: next })}
    />
  );
}

export const Route = createFileRoute('/departs')({
  validateSearch: searchSchema,
  component: Departures,
});
