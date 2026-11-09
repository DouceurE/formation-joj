# 004 — Alternatives officielles : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module de covoiturage `trips` une liste fixe de lignes officielles (navettes JOJ et Dakar Dem Dikk) et une route qui renvoie celles qui desservent un site. Une fois les tâches terminées, un supporter obtient, à côté des départs en covoiturage du jour, les lignes officielles qui vont à son site, avec leur exploitant, leur nom et leur point de départ ; une liste vide quand il n'y en a pas ; et une ligne officielle ne se réserve pas. Le travail est découpé en quatre tâches, dans l'ordre des couches : schémas partagés, domaine, cas d'usage, puis route HTTP ; il n'y a pas de table, puisque la liste est fixe. Les horaires, le temps réel, la réservation d'une ligne officielle, la modification de la liste et tout écran sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec              | Dans le code                             | Ce que c'est                                                                                      |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ligne officielle          | `OfficialLine`                           | Une ligne de transport public vers un site, qui ne se réserve pas dans l'application.             |
| liste fixe                | `OFFICIAL_LINES`                         | La liste des lignes, écrite dans le code ; ses lignes d'exemple seront remplacées par les vraies. |
| exploitant                | `operator`                               | `navette-joj` ou `dakar-dem-dikk` (liste fixe `OFFICIAL_LINE_OPERATORS`).                         |
| nom, point de départ      | `name`, `departurePoint`                 | Le nom affiché de la ligne et l'endroit où on la prend.                                           |
| site desservi             | `site`                                   | L'un des trois sites de TR1 (`TRIP_SITES`).                                                       |
| voir les lignes d'un site | `ListOfficialLines`, `officialLinesTo()` | Le cas d'usage et la fonction du domaine qui filtrent la liste par site.                          |

## 2. Fichiers par couche

On étend le module `trips`, qui suit le module de référence `disciplines` de la branche `main`. Il n'y a ni table ni repository : la liste est une constante du domaine. Aucun autre module n'est touché, et la route de TR1 qui liste les covoiturages ne change pas.

- **shared** : `packages/shared/src/trips.ts` reçoit `OFFICIAL_LINE_OPERATORS`, `officialLineSchema` (`id`, `operator`, `name`, `departurePoint`, `site`), `officialLineListSchema` et `listOfficialLinesQuerySchema` (paramètre `site`, l'un des trois sites).
- **domain** : `apps/api/src/modules/trips/domain/official-lines.ts` contient `OFFICIAL_LINES`, la liste fixe, et `officialLinesTo(site)`, qui renvoie les lignes de ce site dans l'ordre de la liste. Chaque ligne a un identifiant uuid fixe, qu'aucun trajet ne porte. Les trois lignes de départ sont des exemples, signalés « (exemple) » dans leur nom : deux vers Diamniadio (une navette JOJ, une ligne Dakar Dem Dikk), une navette JOJ vers Saly, aucune vers Dakar.
- **application** : `apps/api/src/modules/trips/application/use-cases/list-official-lines.ts` contient `ListOfficialLines`, qui appelle `officialLinesTo()`.
- **infra** : rien, puisque la liste n'est pas en base.
- **http** : le nouveau `apps/api/src/modules/trips/http/official-lines.controller.ts` porte la route ; `apps/api/src/modules/trips/trips.module.ts` déclare ce controller et `ListOfficialLines`. Route :
  - `GET /api/official-lines?site=diamniadio` renvoie 200 et le tableau des lignes officielles du site, ou un tableau vide.
- **web** : rien, car la spec exclut l'écran.

## 3. Données

On ne stocke rien en base : la liste des lignes officielles est une constante du domaine, `OFFICIAL_LINES`, et aucune migration n'est créée. On remplace les lignes d'exemple dans ce seul fichier quand l'équipe fournit les vraies données. Les identifiants des lignes sont des uuid fixes, différents de tout identifiant de trajet : une réservation sur une ligne officielle tombe donc sur le refus « trajet inconnu » de TR2 (AS4).

## 4. Erreurs

Chaque refus de la spec correspond à une erreur métier (`AppError`), avec un code stable et un statut HTTP. Le seul refus de TR4 réutilise un code existant. Un site hors liste est arrêté par la validation Zod, qui répond 400 avec le code commun `VALIDATION_FAILED`.

| Code AppError    | Catégorie | HTTP | Quand                                                                                             | Scénario |
| ---------------- | --------- | ---- | ------------------------------------------------------------------------------------------------- | -------- |
| `TRIP_NOT_FOUND` | NOT_FOUND | 404  | On réserve avec l'identifiant d'une ligne officielle, qui n'est pas un trajet (code créé en TR2). | AS4      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit ; l'e2e vérifie en plus le statut HTTP de la route.

| Scénario | Fichier de test                                                    | Niveau      | Ce que le test vérifie                                                                                                                               |
| -------- | ------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/official-lines.spec.ts`         | unitaire    | `officialLinesTo('diamniadio')` renvoie la navette JOJ et la ligne Dakar Dem Dikk, avec exploitant, nom et point de départ, sans la navette de Saly. |
| AS1      | `apps/api/src/modules/trips/application/trips.application.spec.ts` | application | `ListOfficialLines` renvoie les 2 lignes de Diamniadio.                                                                                              |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | `GET /api/official-lines?site=diamniadio` renvoie 200 et les 2 lignes, et la liste des covoiturages du jour est inchangée.                           |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | Un jour sans covoiturage, la liste des trajets est vide et `GET /api/official-lines?site=diamniadio` renvoie toujours 2 lignes.                      |
| AS3      | `apps/api/src/modules/trips/domain/official-lines.spec.ts`         | unitaire    | `officialLinesTo('dakar')` renvoie un tableau vide.                                                                                                  |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | `GET /api/official-lines?site=dakar` renvoie 200 et un tableau vide.                                                                                 |
| AS4      | `apps/api/src/modules/trips/domain/official-lines.spec.ts`         | unitaire    | Chaque ligne a un identifiant uuid valide et unique.                                                                                                 |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | `POST /api/trips/<identifiant d'une ligne>/bookings` renvoie 404 avec le code `TRIP_NOT_FOUND`.                                                      |

## 6. Tâches

Quatre tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [004-AS1, AS3] Écrire d'abord dans `packages/shared/src/trips.spec.ts` (« 004-AS1: describes an official line with its operator »), puis `OFFICIAL_LINE_OPERATORS`, `officialLineSchema`, `officialLineListSchema` et `listOfficialLinesQuerySchema`
- [x] T02 [004-AS1, AS3, AS4] Écrire d'abord `domain/official-lines.spec.ts` (« 004-AS1: lists the two official lines to Diamniadio », « 004-AS3: has no official line to Dakar »), puis `OFFICIAL_LINES` et `officialLinesTo()` dans `domain/official-lines.ts`
- [x] T03 [004-AS1] Écrire d'abord dans `application/trips.application.spec.ts` (« 004-AS1: lists the official lines of a site »), puis `ListOfficialLines`
- [x] T04 [004-AS1, AS2, AS3, AS4] Écrire d'abord dans `apps/api/test/trips.e2e.spec.ts` (« 004-AS4: refuses a booking on an official line (404, TRIP_NOT_FOUND) »), puis `official-lines.controller.ts` et les déclarations dans `trips.module.ts`
