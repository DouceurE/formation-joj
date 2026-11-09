# 002 — Réserver une place : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module de covoiturage `trips`, construit en TR1, la réservation d'une place sur un trajet. Une fois les tâches terminées, un supporter réserve une place par l'API avec son nom et son téléphone ; il reçoit un code de réservation, le lieu et l'heure de départ et le téléphone du conducteur, et les places restantes du trajet baissent dans la liste des départs. Un trajet complet (même pour deux réservations au même instant), un téléphone déjà inscrit sur le trajet, un trajet déjà parti, un trajet inconnu et une saisie incomplète sont refusés. Le travail est découpé en cinq tâches, dans l'ordre des couches : schémas partagés, domaine, cas d'usage, persistance, puis route HTTP. L'annulation avec le code (TR3), les notifications, le refus du conducteur sur son propre trajet et tout écran sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec                | Dans le code                      | Ce que c'est                                                                           |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| réservation                 | `Booking`                         | Une place prise par un supporter, nommé et reconnu à son téléphone, sur un trajet.     |
| réserver                    | `BookSeat`                        | Le cas d'usage qui enregistre une réservation.                                         |
| nom, téléphone du supporter | `passengerName`, `passengerPhone` | Le nom affiché et le téléphone qui identifie le supporter.                             |
| même téléphone              | `normalizePhone()`                | Le téléphone sans ses espaces : deux numéros égaux après ce traitement sont le même.   |
| code de réservation         | `bookingCode`                     | Un code de 8 caractères remis au supporter, pour annuler en TR3.                       |
| confirmation                | `BookingConfirmation`             | Ce que reçoit le supporter : son code, le lieu, l'heure et le téléphone du conducteur. |
| places restantes            | `remainingSeats`                  | Les places du trajet moins les réservations enregistrées.                              |
| déjà parti                  | départ antérieur à `now`          | Un trajet dont l'heure de départ est avant l'instant de la réservation.                |

## 2. Fichiers par couche

On étend le module `trips`, qui suit le module de référence `disciplines` de la branche `main` : un dossier par couche (`domain/`, `application/`, `infra/`, `http/`). Aucun autre module n'est touché.

- **shared** : `packages/shared/src/trips.ts` reçoit `bookSeatSchema`, le corps de la réservation (`passengerName` et `passengerPhone`, non vides après suppression des espaces, 100 et 20 caractères au plus), `tripIdParamsSchema` pour le paramètre `:id` (un uuid), `bookingConfirmationSchema` pour la réponse (`id`, `bookingCode`, `tripId`, `passengerName`, `departurePlace`, `departureAt`, `driverPhone`, `createdAt`), et les constantes `TRIP_NAME_MAX_LENGTH` et `BOOKING_CODE_LENGTH`.
- **domain** :
  - `apps/api/src/modules/trips/domain/booking.ts` contient l'entité `Booking`. `Booking.create()` reçoit l'identifiant, le code de réservation et l'instant présent ; elle revérifie le nom et le téléphone (`TRIP_FIELD_REQUIRED`) et garde le téléphone sans espaces.
  - `apps/api/src/modules/trips/domain/phone.ts` contient `normalizePhone()`, qui retire les espaces d'un téléphone.
  - `apps/api/src/modules/trips/domain/trip.ts` est modifié : les propriétés du trajet gagnent `passengerPhones`, la liste des téléphones déjà inscrits ; `remainingSeats` devient `seats` moins le nombre de passagers ; la nouvelle méthode `trip.book(booking, now)` refuse, dans cet ordre, un trajet déjà parti (`TRIP_ALREADY_DEPARTED`), un téléphone déjà inscrit (`TRIP_ALREADY_BOOKED`), puis un trajet complet (`TRIP_FULL`), et sinon ajoute le passager. Les tests de TR1 qui appellent `Trip.restore()` passent une liste vide.
  - `apps/api/src/modules/trips/domain/trips.errors.ts` reçoit les quatre nouveaux codes de la section 4 et leurs fabriques (`tripFull()`, `tripAlreadyBooked()`, `tripNotFound()`).
- **application** :
  - `apps/api/src/modules/trips/application/trip.repository.ts` reçoit deux méthodes : `findById(id)` renvoie le trajet avec ses passagers, ou `null` ; `addBooking(booking)` enregistre une réservation et lève `TRIP_FULL` ou `TRIP_ALREADY_BOOKED` si la règle est enfreinte au moment de l'écriture. `listBySiteBetween()` renvoie désormais chaque trajet avec ses passagers, pour que les places restantes soient justes.
  - `apps/api/src/modules/trips/application/use-cases/book-seat.ts` contient `BookSeat` : charge le trajet (sinon `TRIP_NOT_FOUND`), crée la `Booking` avec un code tiré au hasard, appelle `trip.book()` avec l'instant présent, enregistre par `addBooking()`, puis renvoie la réservation et son trajet.
  - `apps/api/src/modules/trips/application/management-code.ts` reçoit `generateBookingCode()`, qui tire un code de 8 caractères avec le même alphabet que le code de gestion.
  - `apps/api/src/modules/trips/application/testing/in-memory-trip.repository.ts` implémente les deux nouvelles méthodes avec les mêmes refus que la base.
- **infra** :
  - `apps/api/src/modules/trips/infra/trips.schema.ts` reçoit la table `bookings` (section 3).
  - `apps/api/src/modules/trips/infra/booking.mapper.ts` traduit une réservation en ligne (`toRow()`) ; `trip.mapper.ts` reçoit les téléphones des passagers pour reconstruire le trajet.
  - `apps/api/src/modules/trips/infra/drizzle-trip.repository.ts` implémente `findById()` et `addBooking()`, et charge les passagers dans `listBySiteBetween()`. `addBooking()` ouvre une transaction, verrouille la ligne du trajet (`SELECT … FOR UPDATE`), recompte ses réservations et lève `TRIP_FULL` si toutes les places sont prises, sinon insère ; une violation de l'index unique (trajet, téléphone) est traduite en `TRIP_ALREADY_BOOKED` avec `isUniqueViolation()`.
- **http** : `apps/api/src/modules/trips/http/trips.controller.ts` reçoit une route, et `apps/api/src/modules/trips/trips.module.ts` déclare `BookSeat`. Route :
  - `POST /api/trips/:id/bookings` réserve une place ; renvoie 201 et la confirmation (`id`, `bookingCode`, `tripId`, `passengerName`, `departurePlace`, `departureAt`, `driverPhone`, `createdAt`).
- **web** : rien, car la spec exclut l'écran.

## 3. Données

On stocke les réservations dans une nouvelle table, reliée aux trajets. Migration : `pnpm db:generate --name=bookings`.

- **`bookings`** : `id` (uuid, clé primaire), `trip_id` (uuid, non nul, clé étrangère vers `trips.id`), `booking_code` (varchar 8, non nul), `passenger_name` (varchar 100, non nul), `passenger_phone` (varchar 20, non nul, sans espaces), `created_at` (timestamp avec fuseau, précision 3, non nul).
  - La clé étrangère protège la règle « on ne réserve que sur un trajet qui existe » (AS6). Aucun trajet n'est supprimé dans TR1 ni TR2, donc elle ne peut pas faire échouer une suppression.
  - L'index unique `bookings_trip_passenger_key` sur (`trip_id`, `passenger_phone`) protège la règle « un même téléphone ne réserve pas deux fois le même trajet » (AS4), même pour deux réservations simultanées du même supporter.
  - L'index unique `bookings_booking_code_key` sur `booking_code` garantit qu'un code désigne une seule réservation, ce dont TR3 aura besoin.
  - Le nombre de places n'a pas de contrainte en base : il est protégé par le verrou de la transaction de `addBooking()` (AS2, AS3).

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. Le nom ou le téléphone manquant (AS7) est arrêté par la validation Zod de la route, qui répond 400 avec le code commun `VALIDATION_FAILED` et la liste `errors` des champs en cause ; le domaine le revérifie avec `TRIP_FIELD_REQUIRED`, que l'API ne renvoie donc pas dans ce cas.

| Code AppError           | Catégorie     | HTTP | Quand                                                                    | Scénario |
| ----------------------- | ------------- | ---- | ------------------------------------------------------------------------ | -------- |
| `TRIP_FULL`             | CONFLICT      | 409  | Le trajet a déjà autant de réservations que de places.                   | AS2, AS3 |
| `TRIP_ALREADY_BOOKED`   | CONFLICT      | 409  | Ce téléphone, sans ses espaces, a déjà une réservation sur ce trajet.    | AS4      |
| `TRIP_ALREADY_DEPARTED` | BUSINESS_RULE | 422  | Le départ du trajet est antérieur à l'instant de la réservation.         | AS5      |
| `TRIP_NOT_FOUND`        | NOT_FOUND     | 404  | Aucun trajet n'a l'identifiant donné.                                    | AS6      |
| `TRIP_FIELD_REQUIRED`   | VALIDATION    | 400  | Le nom ou le téléphone du supporter est vide (revérifié par le domaine). | AS7      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit ; l'e2e vérifie en plus le statut HTTP de la route.

| Scénario | Fichier de test                                                        | Niveau      | Ce que le test vérifie                                                                                                                       |
| -------- | ---------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | `trip.book()` sur un Ndiaga Ndiaye de 38 places laisse 37 places restantes.                                                                  |
| AS1      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | `BookSeat` renvoie un code de 8 caractères, le lieu, l'heure et le téléphone du conducteur ; la liste du jour montre 37 places restantes.    |
| AS1      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Après `addBooking()`, `findById()` et `listBySiteBetween()` relisent le passager et 37 places restantes.                                     |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | `POST /api/trips/:id/bookings` renvoie 201 et la confirmation, puis la liste du jour montre 37 places restantes.                             |
| AS2      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | `trip.book()` sur un taxi d'une place déjà réservée lève `TRIP_FULL` ; le trajet garde 1 passager et 0 place restante.                       |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | La seconde réservation sur un taxi d'une place renvoie 409 avec le code `TRIP_FULL`, et la liste montre toujours 0 place restante.           |
| AS3      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Deux `addBooking()` lancés en même temps sur la dernière place : un passe, l'autre lève `TRIP_FULL`, et la base compte 0 place restante.     |
| AS4      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | `trip.book()` lève `TRIP_ALREADY_BOOKED` pour « 78 555 66 77 » puis « 785556677 », et les places restantes ne changent pas.                  |
| AS4      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | Le même téléphone réserve sur un autre trajet sans refus.                                                                                    |
| AS4      | `apps/api/src/modules/trips/infra/drizzle-trip.repository.int.spec.ts` | intégration | Un second `addBooking()` avec le même téléphone lève `TRIP_ALREADY_BOOKED` grâce à l'index unique.                                           |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | La double réservation renvoie 409 avec le code `TRIP_ALREADY_BOOKED`.                                                                        |
| AS5      | `apps/api/src/modules/trips/domain/trip.spec.ts`                       | unitaire    | Avec `now` à 9 h, un départ à 8 h 59 lève `TRIP_ALREADY_DEPARTED` et un départ à 9 h pile est réservable.                                    |
| AS5      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | `BookSeat` sur un trajet parti en 2025 lève `TRIP_ALREADY_DEPARTED`, et le repository n'enregistre aucune réservation.                       |
| AS6      | `apps/api/src/modules/trips/application/trips.application.spec.ts`     | application | `BookSeat` sur un identifiant inconnu lève `TRIP_NOT_FOUND`, et rien n'est enregistré.                                                       |
| AS6      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Une réservation sur un identifiant inconnu renvoie 404 avec le code `TRIP_NOT_FOUND`.                                                        |
| AS7      | `packages/shared/src/trips.spec.ts`                                    | unitaire    | `bookSeatSchema` refuse un nom ou un téléphone vides ou absents, en nommant le champ.                                                        |
| AS7      | `apps/api/src/modules/trips/domain/booking.spec.ts`                    | unitaire    | `Booking.create()` refuse un nom ou un téléphone faits d'espaces (`TRIP_FIELD_REQUIRED`) et garde le téléphone sans espaces.                 |
| AS7      | `apps/api/test/trips.e2e.spec.ts`                                      | e2e         | Une réservation sans téléphone renvoie 400 `VALIDATION_FAILED` avec `passengerPhone` dans `errors`, et les places restantes ne changent pas. |

AS5 n'a pas de test e2e : l'API refuse de publier un départ passé, et ne lit que la vraie horloge.

## 6. Tâches

Cinq tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [002-AS7] Écrire d'abord dans `packages/shared/src/trips.spec.ts` (« 002-AS7: rejects a booking without a phone »), puis `bookSeatSchema`, `tripIdParamsSchema`, `bookingConfirmationSchema` et les constantes dans `packages/shared/src/trips.ts`
- [x] T02 [002-AS1, AS2, AS4, AS5, AS7] Écrire d'abord `domain/booking.spec.ts` et les tests de `trip.book()` dans `domain/trip.spec.ts` (« 002-AS2: refuses a booking on a full taxi », « 002-AS5: refuses a booking on a departed trip »), puis `booking.ts`, `phone.ts`, `trip.book()` et les nouveaux codes de `trips.errors.ts`
- [x] T03 [002-AS1, AS4, AS5, AS6] Écrire d'abord dans `application/trips.application.spec.ts` (« 002-AS1: books a seat and returns the driver phone », « 002-AS6: refuses a booking on an unknown trip »), puis `findById()` et `addBooking()` dans le port et le repository en mémoire, `generateBookingCode()` et `BookSeat`
- [x] T04 [002-AS1, AS3, AS4] Écrire d'abord dans `infra/drizzle-trip.repository.int.spec.ts` (« 002-AS3: accepts only one of two simultaneous bookings on the last seat »), puis la table `bookings`, la migration `pnpm db:generate --name=bookings`, les mappers et les méthodes de `DrizzleTripRepository`
- [ ] T05 [002-AS1, AS2, AS4, AS6, AS7] Écrire d'abord dans `apps/api/test/trips.e2e.spec.ts` (« 002-AS2: rejects a second booking on a one-seat taxi (409, TRIP_FULL) »), puis la route `POST /api/trips/:id/bookings` dans `trips.controller.ts` et `BookSeat` dans `trips.module.ts`
