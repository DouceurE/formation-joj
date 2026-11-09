import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { SiteHeader } from '@/brand/site-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl">Page introuvable</h1>
      <Link to="/" className={cn(buttonVariants(), 'min-h-11')}>
        Retour à l’accueil
      </Link>
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout, notFoundComponent: NotFound });
