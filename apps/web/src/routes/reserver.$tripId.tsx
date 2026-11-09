import { tripSiteSchema } from '@joj/shared';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { BookingPage } from '@/features/bookings/components/booking-page';

const searchSchema = z.object({
  site: tripSiteSchema.optional().catch(undefined),
  date: z.iso.date().optional().catch(undefined),
});

function Booking() {
  const { tripId } = Route.useParams();
  const { site, date } = Route.useSearch();
  return <BookingPage tripId={tripId} site={site} date={date} />;
}

export const Route = createFileRoute('/reserver/$tripId')({
  validateSearch: searchSchema,
  component: Booking,
});
