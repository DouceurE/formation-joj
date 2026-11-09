# 001 — Publier un trajet et lister les départs vers un site : plan

**Statut** : Validé

## 1. Résumé

On construit dans l'API un nouveau module de covoiturage qui permet à un conducteur de publier un trajet (voiture, taxi ou Ndiaga Ndiaye) vers l'un des trois sites des JOJ, et à un supporter de lister les départs d'une journée vers un site. Une fois les tâches terminées, un conducteur publie un trajet par l'API et reçoit un code de gestion ; un supporter obtient les trajets du jour vers son site, triés par heure, avec leurs places restantes, sans le téléphone du conducteur ni le code. Un nombre de places hors des limites du véhicule, un départ dans le passé et une saisie invalide sont refusés. Le travail est découpé en cinq tâches, dans l'ordre des couches : schémas partagés, domaine, cas d'usage, persistance, puis routes HTTP. La réservation (TR2), l'annulation avec le code de gestion (TR3), les lignes officielles (TR4), la publication depuis un message libre (TR5) et tout écran sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec             | Dans le code               | Ce que c'est                                                                                        |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------- |
| covoiturage (le module)  | `trips`                    | Le module de l'API qui regroupe les trajets.                                                        |
| trajet                   | `Trip`                     | Un départ d'un véhicule vers un site, à une heure donnée, avec des places et un prix.               |
| type de véhicule         | `vehicle`                  | `voiture`, `taxi` ou `ndiaga-ndiaye` (liste fixe `TRIP_VEHICLES`).                                  |
| places maximales         | `VEHICLE_MAX_SEATS`        | Le nombre de places maximum par véhicule : 4 pour une voiture ou un taxi, 38 pour un Ndiaga Ndiaye. |
| lieu de départ           | `departurePlace`           | Le quartier ou le lieu d'où part le trajet, en texte libre (« Pikine »).                            |
| site                     | `site`                     | Le site d'arrivée : `dakar`, `diamniadio` ou `saly` (liste fixe `TRIP_SITES`).                      |
| heure de départ          | `departureAt`              | L'instant du départ, date et heure.                                                                 |
| places, places restantes | `seats`, `remainingSeats`  | Les places proposées, et celles encore libres ; sans réservation en TR1, les deux sont égales.      |
| prix par place           | `priceFcfa`                | Un nombre entier de FCFA, 0 ou plus ; 0 veut dire gratuit.                                          |
| téléphone du conducteur  | `driverPhone`              | Le numéro du conducteur, gardé pour TR2 et jamais renvoyé dans la liste.                            |
| code de gestion          | `managementCode`           | Un code de 8 caractères remis au conducteur à la publication, pour annuler en TR3.                  |
| journée                  | `date`                     | Une date du calendrier à Dakar (GMT), au format `2026-11-10`.                                       |
| publier, lister          | `PublishTrip`, `ListTrips` | Les deux cas d'usage.                                                                               |

## 2. Fichiers par couche

On crée le module `trips`, organisé comme le module de référence `disciplines` de la branche `main` : un dossier par couche (`domain/`, `application/`, `infra/`, `http/`). Aucun autre module n'est touché.

- **shared** : `packages/shared/src/trips.ts` contient les listes fixes `TRIP_SITES`, `TRIP_VEHICLES` et `VEHICLE_MAX_SEATS`, et les schémas Zod des données échangées. `publishTripSchema` est le corps de la publication (`vehicle`, `departurePlace`, `site`, `departureAt`, `seats`, `priceFcfa`, `driverPhone`) : il refuse un véhicule ou un site hors liste, un lieu de départ ou un téléphone vides, un nombre de places non entier, un prix négatif ou non entier, et un champ absent. Il ne vérifie pas les limites de places par véhicule, pour que ce refus garde son propre code. `listTripsQuerySchema` porte les paramètres `site` et `date` de la liste. `tripSchema` décrit un trajet de la liste ; `publishedTripSchema` y ajoute le `managementCode`. `packages/shared/src/index.ts` exporte ce nouveau fichier.
- **domain** :
  - `apps/api/src/modules/trips/domain/trip.ts` contient l'entité `Trip`. `Trip.create()` reçoit l'identifiant, le code de gestion et l'instant présent `now` ; il refuse un départ antérieur à `now` (`DEPARTURE_IN_PAST`), un nombre de places hors de 1 à `VEHICLE_MAX_SEATS[vehicle]` (`SEATS_OUT_OF_RANGE`), et revérifie le véhicule, le site, le prix et les champs vides. `Trip.restore()` relit la base sans rejouer ces règles. `remainingSeats` vaut `seats` en TR1.
  - `apps/api/src/modules/trips/domain/trips.errors.ts` déclare `TripError`, sous-classe d'`AppError`, avec les codes de la section 4.
- **application** :
  - `apps/api/src/modules/trips/application/trip.repository.ts` est le port `TripRepository` : `insert(trip)` enregistre un trajet, `listBySiteBetween(site, from, to)` renvoie les trajets du site dont le départ est dans l'intervalle `[from, to[`, triés par heure de départ.
  - `apps/api/src/modules/trips/application/use-cases/publish-trip.ts` contient `PublishTrip` : génère un identifiant et un code de gestion, crée le `Trip` avec l'instant présent, l'enregistre et le renvoie.
  - `apps/api/src/modules/trips/application/use-cases/list-trips.ts` contient `ListTrips` : transforme la date en intervalle de minuit à minuit GMT, puis appelle `listBySiteBetween()`.
  - `apps/api/src/modules/trips/application/management-code.ts` contient `generateManagementCode()`, qui tire 8 caractères parmi les lettres majuscules et les chiffres, sans 0, O, 1 ni I pour éviter les confusions.
  - `apps/api/src/modules/trips/application/testing/in-memory-trip.repository.ts` est le repository en mémoire des tests de cas d'usage.
- **infra** :
  - `apps/api/src/modules/trips/infra/trips.schema.ts` déclare la table `trips` (section 3).
  - `apps/api/src/modules/trips/infra/trip.mapper.ts` traduit entre une ligne et l'entité (`toDomain()`, `toRow()`).
  - `apps/api/src/modules/trips/infra/drizzle-trip.repository.ts` implémente le port avec Drizzle.
- **http** : `apps/api/src/modules/trips/http/trips.controller.ts` est le controller fin ; `apps/api/src/modules/trips/trips.module.ts` relie le port à `DrizzleTripRepository` ; `apps/api/src/app.module.ts` importe `TripsModule`. Routes :
  - `POST /api/trips` publie un trajet ; renvoie 201 et le trajet publié (`id`, `vehicle`, `departurePlace`, `site`, `departureAt`, `seats`, `remainingSeats`, `priceFcfa`, `createdAt`, `managementCode`).
  - `GET /api/trips?site=diamniadio&date=2026-11-10` liste les départs du jour vers le site ; renvoie 200 et un tableau de trajets triés par heure de départ, chacun sans `driverPhone` ni `managementCode`, et un tableau vide s'il n'y en a aucun.
- **web** : rien, car la spec exclut l'écran.

## 3. Données

On stocke les trajets dans une seule table. Migration : `pnpm db:generate --name=trips`.

- **`trips`** : `id` (uuid, clé primaire), `vehicle` (varchar 20, non nul), `departure_place` (varchar 100, non nul), `site` (varchar 20, non nul), `departure_at` (timestamp avec fuseau, précision 3, non nul), `seats` (entier, non nul), `price_fcfa` (entier, non nul), `driver_phone` (varchar 20, non nul), `management_code` (varchar 8, non nul), `created_at` (timestamp avec fuseau, précision 3, non nul).
  - L'index unique `trips_management_code_key` sur `management_code` garantit qu'un code de gestion désigne un seul trajet, ce dont TR3 aura besoin pour annuler.
  - Le véhicule, le site, les limites de places, le prix et le départ à venir sont vérifiés par le domaine, comme les catégories des disciplines : pas de contrainte `CHECK`.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. Les codes `SEATS_OUT_OF_RANGE` et `DEPARTURE_IN_PAST` sont ceux de la spec, tels quels. Les refus de forme d'AS4 sont arrêtés par la validation Zod de la route, qui répond 400 avec le code commun `VALIDATION_FAILED` et la liste `errors` des champs en cause ; le domaine les revérifie avec les codes `TRIP_*`, que l'API ne renvoie donc pas dans ces cas.

| Code AppError          | Catégorie     | HTTP | Quand                                                                     | Scénario |
| ---------------------- | ------------- | ---- | ------------------------------------------------------------------------- | -------- |
| `SEATS_OUT_OF_RANGE`   | VALIDATION    | 400  | Les places ne sont pas entre 1 et le maximum du véhicule (4 ou 38).       | AS2      |
| `DEPARTURE_IN_PAST`    | BUSINESS_RULE | 422  | Le départ est antérieur à l'instant de la publication.                    | AS3      |
| `TRIP_VEHICLE_UNKNOWN` | VALIDATION    | 400  | Le véhicule n'est ni une voiture, ni un taxi, ni un Ndiaga Ndiaye.        | AS4      |
| `TRIP_SITE_UNKNOWN`    | VALIDATION    | 400  | Le site n'est ni Dakar, ni Diamniadio, ni Saly.                           | AS4      |
| `TRIP_PRICE_INVALID`   | VALIDATION    | 400  | Le prix n'est pas un entier de 0 ou plus.                                 | AS4      |
| `TRIP_FIELD_REQUIRED`  | VALIDATION    | 400  | Le lieu de départ ou le téléphone est vide après suppression des espaces. | AS4      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit ; l'e2e vérifie en plus le statut HTTP de chaque route.

| Scénario | Fichier de test                                                        | Niveau      | Ce que le test vérifie                                                                                                                                              |
| -------- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | Un Ndiaga Ndiaye de 38 places Pikine → Diamniadio est créé avec 38 places restantes et le code de gestion reçu.                                                     |
| AS1      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | `PublishTrip` renvoie un trajet avec un code de 8 caractères, et le repository en mémoire contient ce trajet.                                                       |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `POST /api/trips` renvoie 201 avec `remainingSeats` à 38 et un `managementCode`.                                                                                    |
| AS2      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | 5 places en voiture ou en taxi, 39 en Ndiaga Ndiaye et 0 place lèvent `SEATS_OUT_OF_RANGE` ; 4 en voiture et 38 en Ndiaga Ndiaye passent.                           |
| AS2      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | `PublishTrip` avec une voiture de 5 places échoue, et le repository en mémoire reste vide.                                                                          |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Une voiture de 5 places renvoie 400 avec le code `SEATS_OUT_OF_RANGE`.                                                                                              |
| AS3      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | Avec `now` le 9 novembre 2026 à 9 h, un départ à 8 h 59 lève `DEPARTURE_IN_PAST` et un départ à 9 h pile passe.                                                     |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Un départ d'hier renvoie 422 avec le code `DEPARTURE_IN_PAST`, et la liste de ce jour reste vide.                                                                   |
| AS4      | `packages/shared/src/trips.spec.ts`                                    | unitaire    | Le schéma refuse le site `thies`, le véhicule `moto`, un lieu de départ ou un téléphone vides, un prix de -1 ou 2,5, en nommant le champ ; il accepte un prix de 0. |
| AS4      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | `Trip.create()` revérifie le véhicule, le site, le prix et les champs vides avec les codes `TRIP_*`.                                                                |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Un site `thies` renvoie 400 avec le code `VALIDATION_FAILED` et `site` dans `errors`.                                                                               |
| AS5      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | `listBySiteBetween()` sur PGlite garde les trajets du site dans l'intervalle, y compris un départ déjà passé, et les trie par heure.                                |
| AS5      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | `ListTrips('diamniadio', '2026-11-10')` renvoie le trajet de 8 h puis celui de 10 h, sans celui du 11 ni celui de Saly.                                             |
| AS5      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `GET /api/trips?site=diamniadio&date=…` renvoie 200, les trajets dans l'ordre, sans `driverPhone` ni `managementCode`.                                              |
| AS6      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `GET /api/trips?site=saly&date=…` sans trajet renvoie 200 et un tableau vide.                                                                                       |

## 6. Tâches

Cinq tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [001-AS4] Écrire d'abord `packages/shared/src/trips.spec.ts` (« 001-AS4: rejects an unknown site »), puis `packages/shared/src/trips.ts` et son export dans `index.ts`
- [x] T02 [001-AS1, AS2, AS3, AS4] Écrire d'abord `domain/trip.spec.ts` (« 001-AS2: rejects 5 seats in a car », « 001-AS3: rejects a departure one minute in the past »), puis `trip.ts` et `trips.errors.ts`
- [x] T03 [001-AS1, AS2, AS5] Écrire d'abord `application/trips.application.spec.ts` (« 001-AS1: publishes a trip with a management code », « 001-AS5: lists the trips of a site for a day by departure time »), puis le port `TripRepository`, le repository en mémoire, `generateManagementCode()`, `PublishTrip` et `ListTrips`
- [x] T04 [001-AS5] Écrire d'abord `infra/drizzle-trip.repository.int.spec.ts` (« 001-AS5: keeps the trips of the day for the site, ordered by departure »), puis `trips.schema.ts`, la migration `pnpm db:generate --name=trips`, le mapper et `DrizzleTripRepository`
- [x] T05 [001-AS1, AS2, AS3, AS4, AS5, AS6] Écrire d'abord `apps/api/test/trips.e2e.spec.ts` (« 001-AS2: rejects a car with 5 seats (400, SEATS_OUT_OF_RANGE) »), puis `trips.controller.ts`, `trips.module.ts` et l'import dans `app.module.ts`

## 7. Corrections

### Passage 1

Écarts bloquants relevés par le relecteur (base `589b45c^`).

- [ ] T06 [001-AS4] Écrire d'abord dans `apps/api/test/trips.e2e.spec.ts` (« 001-AS4: publishes a trip priced 3 000 000 000 FCFA without a server error »), puis élargir la colonne `price_fcfa` en `bigint` (mode `number`) dans `trips.schema.ts` et générer la migration `pnpm db:generate --name=trips-price-bigint` ; preuve : relecteur, `packages/shared/src/trips.ts:32`, `domain/trip.ts:157`, `infra/trips.schema.ts:17` (un prix accepté par la validation dépasse `integer` et renvoie 500)
- [ ] T07 [001-AS5] Écrire d'abord dans `infra/drizzle-trip.repository.int.spec.ts` et `application/trips.application.spec.ts` (« 001-AS5: lists a trip that has already departed first »), un jour déjà écoulé (2025-11-10) où le trajet de 8 h, passé par rapport à l'heure réelle, reste listé en premier ; test de couverture, il peut passer d'emblée ; preuve : relecteur, `trips.application.spec.ts:67`, `drizzle-trip.repository.int.spec.ts:48` (aucun test ne prouve « même s'il est déjà parti »)
