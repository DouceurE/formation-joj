import { createFileRoute } from '@tanstack/react-router';
import { PublishPage } from '@/features/publish/components/publish-page';

export const Route = createFileRoute('/publier')({ component: PublishPage });
