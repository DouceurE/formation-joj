import { Link } from '@tanstack/react-router';
import { BRAND_IMAGES } from './assets';
import { CarRapideFrieze } from './car-rapide-frieze';

/** L'en-tête de toutes les pages : le nom Dem, le logo officiel des JOJ, puis la frise. */
export function SiteHeader() {
  return (
    <header className="bg-baobab text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-2">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center font-display text-2xl font-extrabold"
        >
          Dem
        </Link>
        <nav aria-label="Menu" className="flex items-center gap-1">
          <Link
            to="/publier"
            className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-white underline-offset-4 hover:underline"
          >
            Publier
          </Link>
          <Link
            to="/mes-trajets"
            className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-white underline-offset-4 hover:underline"
          >
            Mes trajets
          </Link>
        </nav>
        {/* Le logo officiel, affiché tel quel, sans recadrage ni filtre. */}
        <img
          src={BRAND_IMAGES.logo}
          alt="Logo des JOJ Dakar 2026"
          width={1200}
          height={500}
          className="h-10 w-auto rounded bg-white p-1"
        />
      </div>
      <CarRapideFrieze />
    </header>
  );
}
