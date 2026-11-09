import { Link } from '@tanstack/react-router';
import { BadgeCheck, Banknote, Smartphone, Ticket, MapPin, Users } from 'lucide-react';
import { BRAND_IMAGES } from '@/brand/assets';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: MapPin, title: 'Choisis ton site et ton jour', text: 'Dakar, Diamniadio ou Saly.' },
  { icon: Ticket, title: 'Réserve ta place', text: 'Ton nom et ton téléphone suffisent.' },
  {
    icon: Users,
    title: 'Retrouve le chauffeur',
    text: 'Au point de départ, à l’heure dite : Pikine, Parcelles, Keur Massar…',
  },
];

const DOUBTS = [
  { icon: BadgeCheck, title: 'Gratuit', text: 'Dem ne prend aucune commission.' },
  {
    icon: Smartphone,
    title: 'Sans installation',
    text: 'Tout se passe dans ton navigateur, depuis le lien WhatsApp.',
  },
  {
    icon: Banknote,
    title: 'Le prix se règle au chauffeur',
    text: 'En FCFA, en espèces ou par Wave, à la descente.',
  },
];

/** L'action principale de la page, affichée en haut et répétée en bas (en jaune sur le vert). */
function SeeDeparturesLink({ onBaobab = false }: { onBaobab?: boolean }) {
  return (
    <Link
      to="/departs"
      className={cn(
        buttonVariants({ size: 'lg', variant: onBaobab ? 'secondary' : 'default' }),
        'min-h-11 px-6 text-base font-semibold',
      )}
    >
      Voir les départs
    </Link>
  );
}

/** L'accueil de Dem : dire le service en une phrase, puis mener tout droit aux départs. */
export function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <h1 className="text-3xl leading-tight sm:text-4xl">
          Trouve une place vers ton site des JOJ, partagée sur WhatsApp.
        </h1>
        <img
          src={BRAND_IMAGES.mascotte}
          alt="Ayo, la mascotte des JOJ Dakar 2026"
          width={474}
          height={355}
          className="h-40 w-auto self-center"
        />
        <SeeDeparturesLink />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Comment ça marche</h2>
        <ol aria-label="Comment ça marche" className="flex flex-col gap-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="flex items-start gap-3 rounded-lg bg-card p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soleil font-display font-extrabold text-texte">
                {index + 1}
              </span>
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <Icon aria-hidden="true" className="size-4 text-baobab" />
                  {title}
                </p>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Vos questions</h2>
        <ul aria-label="Vos questions" className="flex flex-col gap-3">
          {DOUBTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-baobab" />
              <div>
                <p className="font-semibold">{title}</p>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-3 rounded-lg bg-baobab p-6 text-white">
        <p className="font-display text-2xl font-extrabold">Dem ! On y va ?</p>
        <SeeDeparturesLink onBaobab />
      </section>
    </div>
  );
}
