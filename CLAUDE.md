# CLAUDE.md

Application d'organisation des JOJ Dakar 2026 : une API NestJS (`apps/api`), un front React (`apps/web`) et des schémas partagés (`packages/shared`), dans un monorepo pnpm. Commandes et structure détaillée : `README.md`.

## Méthodologie

- Une fonctionnalité suit le cycle `/prd` → `/spec` → `/spec-plan` → `/tdd-task` → `/converge` ; les principes sont dans `specs/constitution.md`.
- Test d'abord : écrire le test, le voir échouer pour la bonne raison (`pnpm tdd:red <fichier>`), puis le code minimal.
- Ordre des couches pour une fonctionnalité : schéma partagé → domaine → cas d'usage → table et migration → repository Drizzle → controller et e2e → fausse API (MSW) → écran (détail dans `README.md`, « Ajouter une fonctionnalité »).
- Une tâche = un commit Conventional Commits ; `pnpm verify` passe avant chaque commit (lefthook), jamais de `--no-verify`. `pnpm check` avant de conclure.
- Celui qui produit ne valide pas : faire relire par le sous-agent `relecteur` (base git + dossier de la spec seulement).

## Architecture

- Un module par domaine dans `apps/api/src/modules/<domaine>/`, découpé en `domain/`, `application/`, `infra/`, `http/`, sur le modèle de `disciplines`. Le transverse (config, base, erreurs, santé) est dans `apps/api/src/core/`.
- `domain/` est du TypeScript pur : aucun import de NestJS, Drizzle, `pg` ou PGlite (vérifié par oxlint), pas d'accès à l'horloge ni au hasard : l'id et la date lui sont passés.
- `application/` : un port `<entité>.repository.ts` (classe abstraite), un cas d'usage par classe dans `use-cases/`, un repository en mémoire dans `testing/`.
- `infra/` : table Drizzle, mapper `toDomain()`/`toRow()`, repository Drizzle. Le module Nest relie le port à son implémentation et s'ajoute à `src/app.module.ts`.
- `http/` : controller fin, qui valide (DTO `createZodDto`), appelle un cas d'usage et sérialise. Aucune règle métier, aucun accès au repository.
- Les schémas Zod d'entrée et de réponse sont dans `packages/shared`, exportés par `index.ts`, et servent à l'API comme au front.
- Front : pages dans `apps/web/src/routes/` (TanStack Router), fonctionnalités dans `src/features/<nom>/` (`api/` pour HTTP et hooks TanStack Query, `components/`), composants shadcn dans `src/components/ui/`.
- `apps/web/src/mocks/` est la fausse API des tests : même contrat (schémas, codes d'erreur) que `apps/api`.

## Concepts appréciés

- Typage strict (`strict`, `noUncheckedIndexedAccess`), pas de `any` ; types dérivés des schémas (`z.infer`).
- Entité à constructeur privé : `create()` applique les règles, `restore()` relit la base sans les rejouer ; état modifié par des méthodes métier (`rename()`).
- Un cas d'usage = une classe `@Injectable()` avec une seule méthode `execute()`.
- Le cas d'usage dépend du port abstrait, jamais de Drizzle : on le teste avec le repository en mémoire.
- Fonctions courtes et commentaires courts, en français, qui disent le pourquoi.

## Bonnes pratiques

- Toute erreur métier est une sous-classe d'`AppError` (code stable + catégorie VALIDATION, NOT_FOUND, CONFLICT ou BUSINESS_RULE), déclarée dans `domain/<nom>.errors.ts`. Pas de `throw new Error()` hors `infra/`, pas de `HttpException`.
- Seul `ProblemDetailsFilter` transforme une erreur en réponse HTTP (400, 404, 409, 422, format RFC 9457).
- Une entrée est validée par un schéma Zod de `packages/shared`, jamais à la main dans le controller ; le domaine revérifie ses propres règles.
- Migrations générées par `pnpm db:generate --name=<sujet>`, jamais éditées à la main.
- Aucun secret dans le code : les valeurs sensibles vont dans `apps/api/.env` (ignoré par git).
- Tests API : `*.spec.ts` (domaine, application avec repository en mémoire), `*.int.spec.ts` (Drizzle sur PGlite en mémoire), `*.e2e.spec.ts` dans `apps/api/test/` (supertest, statut HTTP vérifié).
- Tests front : `<fichier>.test.tsx` à côté du fichier testé, sur la fausse API MSW, avec un commentaire d'en-tête qui dit ce qu'il prouve ; un audit `*.a11y.test.tsx` par état d'écran.

## Nommage

- Fichiers en kebab-case, suffixés par leur rôle : `create-discipline.ts`, `discipline.mapper.ts`, `drizzle-discipline.repository.ts`, `disciplines.controller.ts`.
- Classes en PascalCase ; cas d'usage nommés par un verbe : `CreateDiscipline`, `ListDisciplines`.
- Codes d'erreur en majuscules, préfixés par le domaine : `DISCIPLINE_NOT_FOUND`, `DISCIPLINE_NAME_TAKEN`.
- Schémas Zod en camelCase suffixé `Schema` (`createDisciplineSchema`), types en PascalCase (`CreateDisciplineInput`), constantes en majuscules (`DISCIPLINE_CATEGORIES`).
- Titres de tests en anglais, préfixés par la spec et le scénario : `it('000-AS2: rejects a discipline without a name (400, RFC 9457)')`.
- Commits Conventional Commits, en anglais : `feat(benevoles): T03 refuse a full slot (001-AS2)`.
