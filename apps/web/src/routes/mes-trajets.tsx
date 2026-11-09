import { createFileRoute } from '@tanstack/react-router';
import { MyTripsPage } from '@/features/bookings/components/my-trips-page';

export const Route = createFileRoute('/mes-trajets')({ component: MyTripsPage });
