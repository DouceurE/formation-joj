# 003 — Annuler une réservation ou un trajet : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module de covoiturage `trips` l'annulation d'une réservation avec son code, l'annulation d'un trajet avec son code de gestion, et la consultation d'une réservation avec son code. Une fois les tâches terminées, un supporter annule sa place, qui redevient disponible ; un conducteur annule son trajet, qui disparaît de la liste des départs et n'accepte plus de réservation ; un supporter consulte sa réservation et voit si elle est « confirmée », « annulée » ou si son « trajet est annulé ». Un code inconnu, une annulation répétée et une réservation sur un trajet annulé sont refusés. Le travail est découpé en cinq tâches, dans l'ordre des couches : schémas partagés, domaine, cas d'usage, persistance, puis routes HTTP. Les notifications, le remboursement, la modification d'un trajet ou d'une réservation et tout écran sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec                    | Dans le code                        | Ce que c'est                                                                                       |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| annuler sa réservation          | `CancelBooking`, `booking.cancel()` | Le cas d'usage et la méthode qui marquent une réservation comme annulée.                           |
| annuler son trajet              | `CancelTrip`, `trip.cancel()`       | Le cas d'usage et la méthode qui marquent un trajet comme annulé.                                  |
| consulter sa réservation        | `GetBooking`                        | Le cas d'usage qui retrouve une réservation et son trajet par le code de réservation.              |
| annulé                          | `cancelledAt`                       | L'instant de l'annulation, ou `null` tant que la réservation ou le trajet tient.                   |
| statut de la réservation        | `status`, `bookingStatus()`         | `confirmee`, `annulee` ou `trajet-annule` (liste fixe `BOOKING_STATUSES`), calculé par le domaine. |
| code de réservation, de gestion | `bookingCode`, `managementCode`     | Les codes de 8 caractères remis en TR2 et en TR1.                                                  |
| réservation active              | `cancelledAt` à `null`              | Une réservation qui occupe une place : seules elles comptent dans les places restantes.            |

## 2. Fichiers par couche

On étend le module `trips`, qui suit le module de référence `disciplines` de la branche `main` : un dossier par couche (`domain/`, `application/`, `infra/`, `http/`). Aucun autre module n'est touché.

- **shared** : `packages/shared/src/trips.ts` reçoit `BOOKING_STATUSES`, `cancelBookingSchema` (corps `{ bookingCode }`), `cancelTripSchema` (corps `{ managementCode }`) et `bookingCodeParamsSchema` (paramètre `:code`), chacun avec un code de 8 caractères sans espaces autour ; `bookingViewSchema` décrit une réservation consultée (`id`, `bookingCode`, `status`, `tripId`, `passengerName`, `departurePlace`, `departureAt`, `driverPhone`, `createdAt`) ; `cancelledTripSchema` décrit un trajet annulé (`id`, `cancelledAt`).
- **domain** :
  - `apps/api/src/modules/trips/domain/trip.ts` : les propriétés gagnent `cancelledAt` ; `trip.cancel(now)` refuse un trajet déjà annulé (`TRIP_ALREADY_CANCELLED`), sinon enregistre l'instant ; `trip.book()` refuse d'abord un trajet annulé (`TRIP_CANCELLED`), avant les règles de TR2. `passengerPhones` ne contient que les réservations actives.
  - `apps/api/src/modules/trips/domain/booking.ts` : les propriétés gagnent `cancelledAt` ; `booking.cancel(now)` refuse une réservation déjà annulée (`BOOKING_ALREADY_CANCELLED`), sinon enregistre l'instant.
  - `apps/api/src/modules/trips/domain/booking-status.ts` contient `bookingStatus(booking, trip)` : `annulee` si la réservation est annulée, sinon `trajet-annule` si le trajet l'est, sinon `confirmee`.
  - `apps/api/src/modules/trips/domain/trips.errors.ts` reçoit les codes de la section 4 et la fabrique `bookingNotFound()`.
- **application** :
  - `apps/api/src/modules/trips/application/trip.repository.ts` reçoit `findByManagementCode(code)`, `findBookingByCode(code)` qui renvoie la réservation et son trajet ou `null`, `saveTripCancellation(trip)` et `saveBookingCancellation(booking)`. Ces deux dernières n'écrivent que si l'élément n'était pas déjà annulé, et lèvent sinon le refus de conflit, pour deux annulations simultanées.
  - `apps/api/src/modules/trips/application/use-cases/cancel-booking.ts` contient `CancelBooking` : retrouve la réservation par son code (sinon `BOOKING_NOT_FOUND`), appelle `booking.cancel()`, enregistre et renvoie la réservation et son trajet.
  - `apps/api/src/modules/trips/application/use-cases/cancel-trip.ts` contient `CancelTrip` : retrouve le trajet par son code de gestion (sinon `TRIP_NOT_FOUND`), appelle `trip.cancel()`, enregistre et renvoie le trajet.
  - `apps/api/src/modules/trips/application/use-cases/get-booking.ts` contient `GetBooking` : retrouve la réservation et son trajet par le code (sinon `BOOKING_NOT_FOUND`).
  - `apps/api/src/modules/trips/application/testing/in-memory-trip.repository.ts` implémente les nouvelles méthodes avec les mêmes refus que la base ; `insert()` y garde de nouveau une copie du trajet.
- **infra** :
  - `apps/api/src/modules/trips/infra/trips.schema.ts` : colonne `cancelled_at` sur `trips` et sur `bookings`, et index unique partiel (section 3).
  - `apps/api/src/modules/trips/infra/trip.mapper.ts` et `booking.mapper.ts` lisent et écrivent `cancelledAt` ; `booking.mapper.ts` reçoit `toDomain()`.
  - `apps/api/src/modules/trips/infra/drizzle-trip.repository.ts` implémente les nouvelles méthodes. `listBySiteBetween()` écarte les trajets annulés ; les places restantes ne comptent que les réservations actives ; `addBooking()`, sous le verrou de TR2, refuse un trajet annulé (`TRIP_CANCELLED`) et ne compte que les réservations actives ; les deux sauvegardes d'annulation font un `UPDATE … WHERE cancelled_at IS NULL` et lèvent le conflit si aucune ligne n'a changé.
- **http** : `apps/api/src/modules/trips/http/trips.controller.ts` reçoit l'annulation d'un trajet ; le nouveau `apps/api/src/modules/trips/http/bookings.controller.ts` porte les routes d'une réservation ; `apps/api/src/modules/trips/trips.module.ts` déclare le nouveau controller et les trois cas d'usage. Routes :
  - `POST /api/trips/cancel` annule le trajet dont le corps donne le `managementCode` ; renvoie 200 et le trajet annulé (`id`, `cancelledAt`).
  - `POST /api/bookings/cancel` annule la réservation dont le corps donne le `bookingCode` ; renvoie 200 et la réservation consultée, avec le statut `annulee`.
  - `GET /api/bookings/:code` renvoie 200 et la réservation consultée, avec son statut.
- **web** : rien, car la spec exclut l'écran.

## 3. Données

On ne crée pas de table : on marque l'annulation sur les deux tables existantes, sans rien supprimer. Migration : `pnpm db:generate --name=cancellations`.

- **`trips`** reçoit `cancelled_at` (timestamp avec fuseau, précision 3, nul tant que le trajet tient). Le trajet n'est jamais supprimé, pour que ses passagers voient « trajet annulé » (AS6).
- **`bookings`** reçoit `cancelled_at` (timestamp avec fuseau, précision 3, nul tant que la réservation tient). La réservation n'est jamais supprimée, pour qu'elle se consulte encore avec le statut « annulée ».
  - L'index unique `bookings_trip_passenger_key` sur (`trip_id`, `passenger_phone`) devient partiel, limité aux lignes où `cancelled_at` est nul. Il protège toujours la règle de TR2 « un même téléphone ne réserve pas deux fois le même trajet » entre réservations actives, mais il laisse un supporter qui a annulé reprendre une place.
  - L'index unique `bookings_booking_code_key` ne change pas : il garantit qu'un code de réservation désigne une seule réservation (AS1, AS3, AS6).

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. Un code mal formé (plus ou moins de 8 caractères) est arrêté par la validation Zod, qui répond 400 avec le code commun `VALIDATION_FAILED`.

| Code AppError               | Catégorie     | HTTP | Quand                                                           | Scénario |
| --------------------------- | ------------- | ---- | --------------------------------------------------------------- | -------- |
| `BOOKING_NOT_FOUND`         | NOT_FOUND     | 404  | Aucune réservation n'a ce code de réservation.                  | AS2      |
| `TRIP_NOT_FOUND`            | NOT_FOUND     | 404  | Aucun trajet n'a ce code de gestion (code existant depuis TR2). | AS2      |
| `BOOKING_ALREADY_CANCELLED` | CONFLICT      | 409  | La réservation est déjà annulée.                                | AS3      |
| `TRIP_ALREADY_CANCELLED`    | CONFLICT      | 409  | Le trajet est déjà annulé.                                      | AS5      |
| `TRIP_CANCELLED`            | BUSINESS_RULE | 422  | On réserve sur un trajet annulé par son conducteur.             | AS7      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit ; l'e2e vérifie en plus le statut HTTP de chaque route.

| Scénario | Fichier de test                                                        | Niveau      | Ce que le test vérifie                                                                                                     |
| -------- | ---------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/booking.spec.ts`                    | unitaire    | `booking.cancel(now)` enregistre l'instant de l'annulation.                                                                |
| AS1      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | Après `CancelBooking`, la liste du jour montre de nouveau 38 places restantes.                                             |
| AS1      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Après `saveBookingCancellation()`, `findById()` compte 38 places, et le même téléphone peut réserver de nouveau.           |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `POST /api/bookings/cancel` renvoie 200 avec le statut `annulee`, puis la liste montre 38 places restantes.                |
| AS2      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | Le code « ZZZZ9999 » lève `BOOKING_NOT_FOUND` pour `CancelBooking` et `GetBooking`, et `TRIP_NOT_FOUND` pour `CancelTrip`. |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Les trois routes renvoient 404 avec ces codes pour « ZZZZ9999 ».                                                           |
| AS3      | `apps/api/src/modules/trips/domain/booking.spec.ts`                    | unitaire    | Un second `booking.cancel()` lève `BOOKING_ALREADY_CANCELLED`.                                                             |
| AS3      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Un second `saveBookingCancellation()` sur la même réservation lève `BOOKING_ALREADY_CANCELLED`.                            |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | La seconde annulation renvoie 409 `BOOKING_ALREADY_CANCELLED`, et la liste montre toujours 38 places restantes.            |
| AS4      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | `trip.cancel(now)` enregistre l'instant de l'annulation.                                                                   |
| AS4      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | `listBySiteBetween()` n'inclut plus un trajet annulé.                                                                      |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `POST /api/trips/cancel` renvoie 200 avec `cancelledAt`, et le trajet n'est plus dans la liste du jour.                    |
| AS5      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | Un second `trip.cancel()` lève `TRIP_ALREADY_CANCELLED`.                                                                   |
| AS5      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | La seconde annulation du trajet renvoie 409 `TRIP_ALREADY_CANCELLED`.                                                      |
| AS6      | `apps/api/src/modules/trips/domain/booking.spec.ts`                    | unitaire    | `bookingStatus()` renvoie `confirmee`, `trajet-annule` puis `annulee` selon les deux annulations.                          |
| AS6      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `GET /api/bookings/:code` renvoie `confirmee` avec le lieu, l'heure et le téléphone du conducteur, puis `trajet-annule`.   |
| AS7      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | `trip.book()` sur un trajet annulé lève `TRIP_CANCELLED`, et les places restantes ne changent pas.                         |
| AS7      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | `addBooking()` sur un trajet annulé lève `TRIP_CANCELLED` et n'enregistre rien.                                            |
| AS7      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Une réservation sur un trajet annulé renvoie 422 `TRIP_CANCELLED`.                                                         |

## 6. Tâches

Cinq tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [003-AS2, AS6] Écrire d'abord dans `packages/shared/src/trips.spec.ts` (« 003-AS2: rejects a code that is not 8 characters long »), puis `BOOKING_STATUSES`, `cancelBookingSchema`, `cancelTripSchema`, `bookingCodeParamsSchema`, `bookingViewSchema` et `cancelledTripSchema`
- [x] T02 [003-AS1, AS3, AS4, AS5, AS6, AS7] Écrire d'abord dans `domain/booking.spec.ts` et `domain/trip.spec.ts` (« 003-AS3: refuses to cancel a booking twice », « 003-AS7: refuses a booking on a cancelled trip »), puis `cancelledAt`, `booking.cancel()`, `trip.cancel()`, le refus dans `trip.book()`, `booking-status.ts` et les nouveaux codes d'erreur
- [ ] T03 [003-AS1, AS2, AS4, AS6] Écrire d'abord dans `application/trips.application.spec.ts` (« 003-AS1: cancels a booking and frees its seat », « 003-AS2: refuses an unknown code »), puis les nouvelles méthodes du port et du repository en mémoire, `CancelBooking`, `CancelTrip` et `GetBooking`
- [ ] T04 [003-AS1, AS3, AS4, AS7] Écrire d'abord dans `infra/drizzle-trip.repository.int.spec.ts` (« 003-AS4: no longer lists a cancelled trip », « 003-AS7: refuses a booking on a cancelled trip under lock »), puis les colonnes `cancelled_at`, l'index partiel, la migration `pnpm db:generate --name=cancellations`, les mappers et les méthodes de `DrizzleTripRepository`
- [ ] T05 [003-AS1, AS2, AS3, AS4, AS5, AS6, AS7] Écrire d'abord dans `apps/api/test/trips.e2e.spec.ts` (« 003-AS6: shows a confirmed booking, then a cancelled trip »), puis `POST /api/trips/cancel`, `bookings.controller.ts` avec ses deux routes, et les déclarations dans `trips.module.ts`
