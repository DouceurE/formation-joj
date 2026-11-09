# 007 — Réserver et suivre : plan

**Statut** : Validé

## 1. Résumé

On construit dans `apps/web` l'écran de réservation d'un départ, le billet qui se retourne, et la page « Mes trajets », en s'appuyant sur les routes de l'API de TR2 et TR3, qui ne changent pas. Une fois les tâches terminées, un supporter touche « Réserver » sur un départ, voit la route et le compteur de places, réserve avec son nom et son téléphone, retourne son billet, copie son code ou se l'envoie sur WhatsApp, puis retrouve, annule ou oublie sa réservation dans « Mes trajets », même après avoir fermé la page. Le travail est découpé en six tâches : fausse API, mémoire du téléphone, écran de réservation, billet, « Mes trajets », puis audits d'accessibilité. Aucune dépendance n'est ajoutée ; la publication (TR8) et toute vérification d'identité à l'annulation sont laissées de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec            | Dans le code                             | Ce que c'est                                                                                                    |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| écran de réservation    | route `/reserver/$tripId`, `BookingPage` | L'écran d'un départ : route dessinée, détails, compteur, formulaire. Le site et le jour restent dans l'adresse. |
| route qui se dessine    | `RouteDrawing`                           | Un dessin SVG du lieu de départ au site, avec le véhicule qui le parcourt ; pas une carte réelle.               |
| compteur des places     | `SeatsCounter`                           | Le nombre de places restantes, en grand, qui descend avec une animation après la réservation.                   |
| billet                  | `BookingTicket`                          | La carte « Votre place est gardée », qui se retourne pour montrer le code et les détails.                       |
| gardé dans le téléphone | `savedBookings` (`saved-bookings.ts`)    | La liste des codes de réservation, gardée dans la mémoire du navigateur (`localStorage`).                       |
| Mes trajets             | route `/mes-trajets`, `MyTripsPage`      | La page qui relit chaque code gardé, permet d'en saisir un, d'annuler et d'oublier.                             |
| oublier ce trajet       | `savedBookings.forget(code)`             | Retire un code du téléphone, sans rien changer à la réservation dans l'API.                                     |

## 2. Fichiers par couche

On crée la fonctionnalité `apps/web/src/features/bookings/`, organisée comme `features/trips` de TR6 : `api/` pour les appels et les hooks TanStack Query, `components/` pour les écrans, plus `storage/` pour la mémoire du téléphone.

- **shared, domain, application, infra, http** : rien ; l'API sert déjà `POST /api/trips/:id/bookings` (TR2), `GET /api/bookings/:code` et `POST /api/bookings/cancel` (TR3).
- **web — fausse API** : `apps/web/src/mocks/handlers.ts` reçoit les trois routes, avec les mêmes schémas et les mêmes refus que l'API (`TRIP_FULL`, `TRIP_ALREADY_BOOKED` sur le téléphone sans espaces, `TRIP_ALREADY_DEPARTED`, `TRIP_NOT_FOUND`, `VALIDATION_FAILED`, `BOOKING_NOT_FOUND`, `BOOKING_ALREADY_CANCELLED`) ; une réservation fait baisser `remainingSeats` du trajet, une annulation le fait remonter. `apps/web/src/mocks/fixture.ts` reçoit `bookings`, un trajet complet, un trajet déjà parti et une réservation sur un trajet annulé par son conducteur.
- **web — mémoire du téléphone** : `apps/web/src/features/bookings/storage/saved-bookings.ts` lit, ajoute et oublie les codes dans `localStorage`, sans doublon ; une mémoire illisible ou indisponible donne une liste vide, jamais une erreur.
- **web — réservation** :
  - `apps/web/src/features/bookings/api/bookings.api.ts` : `book(tripId, input)`, `get(code)`, `cancel(code)`, réponses validées par `bookingConfirmationSchema` et `bookingViewSchema` ; `bookings.queries.ts` : leurs hooks. Réserver et annuler relisent les départs, pour que le compteur et la place rendue soient justes.
  - `apps/web/src/routes/reserver.$tripId.tsx` lit `tripId`, `site` et `date` ; `BookingPage` prend le trajet dans la liste du jour (TR6), et affiche « Trajet introuvable » s'il n'y est pas.
  - `apps/web/src/features/bookings/components/route-drawing.tsx`, `seats-counter.tsx`, `booking-form.tsx` et `booking-page.tsx`. Les refus de l'API deviennent des phrases sans jargon, tirées d'une table code → message dans `booking-messages.ts`.
  - `apps/web/src/features/trips/components/trip-card.tsx` : « Réserver » devient un lien vers `/reserver/$tripId` ; le test de TR6 qui le voulait inactif est adapté.
- **web — billet** : `apps/web/src/features/bookings/components/booking-ticket.tsx`, un bouton « Retourner le billet » à deux faces. Le retournement 3D est une transition CSS sous `motion-safe:` ; sans animation, la face arrière s'affiche directement. « Copier le code » utilise le presse-papiers du navigateur ; « Envoyer sur WhatsApp » est un lien `https://wa.me/?text=…`. Le code est gardé dans le téléphone dès la réservation.
- **web — Mes trajets** : `apps/web/src/routes/mes-trajets.tsx` et `apps/web/src/features/bookings/components/my-trips-page.tsx` : la liste des codes gardés, chacun relu par `GET /api/bookings/:code` ; un champ « Code de réservation » ; « Annuler » avec une confirmation (`AlertDialog`) ; « Trajet annulé » en rouge latérite avec un lien vers les départs ; « Oublier ce trajet ». `apps/web/src/brand/site-header.tsx` reçoit un lien « Mes trajets ».
- Toutes les animations (route, véhicule, compteur, billet) restent sous `motion-safe:`, et tout ce qu'on touche porte `min-h-11`, comme en TR6. Les images de fond éventuelles du billet sont en CSS, sans fichier à télécharger.

## 3. Données

L'écran ne stocke rien dans l'API de plus que TR2 et TR3. Dans le téléphone, la clé `dem.bookings` de `localStorage` garde une liste de codes de réservation, sans nom ni téléphone. La fausse API garde ses réservations en mémoire dans `fixture.ts`, remises à zéro après chaque test. Aucune migration.

## 4. Erreurs

Chaque refus de la spec garde le code et le statut de l'API ; l'écran les traduit en phrases, sans en créer de nouveau.

| Code AppError               | Catégorie     | HTTP | Ce que l'écran affiche                       | Scénario |
| --------------------------- | ------------- | ---- | -------------------------------------------- | -------- |
| `TRIP_FULL`                 | CONFLICT      | 409  | « Ce trajet est complet. »                   | AS4      |
| `TRIP_ALREADY_BOOKED`       | CONFLICT      | 409  | « Ce téléphone a déjà réservé ce trajet. »   | AS4      |
| `TRIP_ALREADY_DEPARTED`     | BUSINESS_RULE | 422  | « Ce trajet est déjà parti. »                | AS4      |
| `VALIDATION_FAILED`         | VALIDATION    | 400  | Le champ en cause, nommé sous le formulaire. | AS4      |
| `BOOKING_NOT_FOUND`         | NOT_FOUND     | 404  | « Aucune réservation avec ce code. »         | AS5      |
| `BOOKING_ALREADY_CANCELLED` | CONFLICT      | 409  | « Cette réservation est déjà annulée. »      | AS6      |

Toute autre réponse en échec affiche « Réessayer », comme en TR6. Le nom et le téléphone vides sont d'abord arrêtés par l'écran, avec le schéma partagé `bookSeatSchema`, avant tout appel.

## 5. Tests par scénario

Chaque scénario est prouvé par au moins un test d'écran, sur la fausse API. Les animations ne se mesurent pas dans jsdom : la règle `motion-safe:` de TR6 les vérifie, et un test vérifie que le billet montre sa face arrière quand le téléphone demande moins d'animations.

| Scénario | Fichier de test                                                           | Niveau   | Ce que le test vérifie                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/web/src/features/bookings/components/booking-page.test.tsx`         | écran    | Depuis l'accueil, trois touches mènent à l'écran : route Pikine → Diamniadio, 10:00, Ndiaga Ndiaye, 500 FCFA, 30 places, formulaire.                                                                        |
| AS2      | `apps/web/src/mocks/handlers.test.ts`                                     | unitaire | La fausse API réserve, baisse les places restantes et renvoie la confirmation, comme l'API.                                                                                                                 |
| AS2      | `apps/web/src/features/bookings/components/booking-ticket.test.tsx`       | écran    | Après « Réserver ma place », le compteur montre 29, le billet « Votre place est gardée » paraît ; touché, il montre le code, le point, l'heure, le téléphone du chauffeur et « Jërëjëf ! ».                 |
| AS3      | `apps/web/src/features/bookings/components/booking-ticket.test.tsx`       | écran    | « Copier le code » met le code dans le presse-papiers et affiche « Code copié » ; le lien WhatsApp contient le code, le point et l'heure.                                                                   |
| AS4      | `apps/web/src/features/bookings/components/booking-page.test.tsx`         | écran    | Trajet complet, déjà réservé, déjà parti : la phrase de la section 4, pas de billet, compteur inchangé ; champ vide nommé, sans requête.                                                                    |
| AS5      | `apps/web/src/features/bookings/storage/saved-bookings.test.ts`           | unitaire | Garder, relire sans doublon et oublier un code ; une mémoire illisible donne une liste vide.                                                                                                                |
| AS5      | `apps/web/src/features/bookings/components/my-trips-page.test.tsx`        | écran    | Après une réservation et une page rouverte, « Mes trajets » montre « Confirmée », l'heure et le point ; un code saisi s'ajoute ; un code inconnu est refusé ; « Oublier ce trajet » le retire sans annuler. |
| AS6      | `apps/web/src/features/bookings/components/my-trips-page.test.tsx`        | écran    | « Annuler » puis confirmer : « Annulée », et la place revient dans les départs ; un trajet annulé par le conducteur affiche « Trajet annulé » en rouge latérite et un lien vers les départs.                |
| AS7      | `apps/web/src/routes/reserver.a11y.test.tsx`, `mes-trajets.a11y.test.tsx` | écran    | L'audit axe ne relève rien à chaque étape (formulaire, refus, billet des deux côtés, liste, confirmation) ; aucune animation hors `motion-safe:` ; tout a `min-h-11`.                                       |

## 6. Tâches

Six tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [007-AS2, AS4, AS5, AS6] Écrire d'abord dans `apps/web/src/mocks/handlers.test.ts` (« 007-AS4: refuses a booking on a full trip like the API (409, TRIP_FULL) »), puis les données de `fixture.ts` et les trois routes de réservation de `handlers.ts`
- [x] T02 [007-AS5] Écrire d'abord `apps/web/src/features/bookings/storage/saved-bookings.test.ts` (« 007-AS5: keeps a booking code on the phone without duplicates »), puis `saved-bookings.ts`
- [x] T03 [007-AS1, AS4] Écrire d'abord `apps/web/src/features/bookings/components/booking-page.test.tsx` (« 007-AS1: opens the booking screen in three touches », « 007-AS4: says a full trip in plain words »), puis `bookings.api.ts`, `bookings.queries.ts`, `booking-messages.ts`, `RouteDrawing`, `SeatsCounter`, le formulaire, `BookingPage`, la route `/reserver/$tripId` et le lien « Réserver » de `TripCard`
- [x] T04 [007-AS2, AS3] Écrire d'abord `apps/web/src/features/bookings/components/booking-ticket.test.tsx` (« 007-AS2: turns the ticket over to show the code and Jërëjëf ! »), puis `BookingTicket`, la copie, le lien WhatsApp et la mémoire du code après la réservation
- [x] T05 [007-AS5, AS6] Écrire d'abord `apps/web/src/features/bookings/components/my-trips-page.test.tsx` (« 007-AS6: shows a trip cancelled by its driver in laterite red »), puis `MyTripsPage`, la route `/mes-trajets` et le lien « Mes trajets » de l'en-tête
- [x] T06 [007-AS7] Écrire d'abord `apps/web/src/routes/reserver.a11y.test.tsx` et `mes-trajets.a11y.test.tsx` (« 007-AS7: the turned ticket is clean »), puis corriger ce que l'audit, la règle `motion-safe:` et la règle `min-h-11` relèvent

## 7. Corrections

### Passage 1

Écarts bloquants relevés par le relecteur (base `6188629^`).

- [x] T07 [007-AS5] Écrire d'abord dans `apps/web/src/features/bookings/components/my-trips-page.test.tsx` (« 007-AS5: says « Aucune réservation avec ce code. » for a code of the wrong length »), un test où un code de 7 puis de 9 caractères donne « Aucune réservation avec ce code. », sans parler de nom ni de téléphone, puis faire de `VALIDATION_FAILED` reçu en cherchant un code la phrase du code inconnu dans `my-trips-page.tsx` ; preuve : relecteur, `my-trips-page.tsx` (`FindByCode.find`) et `booking-messages.ts` (un code de 7 caractères affiche « Vérifie ton nom et ton téléphone. »)
- [x] T08 [007-AS4] Écrire d'abord dans `apps/web/src/features/trips/components/departures-page.test.tsx` (« 007-AS4: shows a full trip as « 0 place restante » in the departures »), un test où le taxi complet du 11 novembre affiche « 0 place restante » dans la liste des départs, ce qui inscrit et prouve le changement de `remainingSeatsLabel` dans `labels.ts` fait en T03 ; preuve : relecteur, `apps/web/src/features/trips/components/labels.ts:35-37` (changement hors plan et sans test)
