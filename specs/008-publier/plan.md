# 008 — Publier : plan

**Statut** : Validé

## 1. Résumé

On construit dans `apps/web` l'écran « Publier un trajet » : un formulaire avec le choix du véhicule, la lecture d'une annonce WhatsApp collée qui remplit ce formulaire pour relecture, l'écran « Dem na ! » avec le code de gestion, et « Annuler mon trajet » avec ce code. Une fois les tâches terminées, un conducteur publie son trajet en quelques champs ou à partir de son annonce, voit chaque refus en clair, garde son code de gestion et peut annuler son trajet ; l'API ne change pas, elle sert déjà ces trois actions depuis TR1, TR3 et TR5. Le travail est découpé en cinq tâches : fausse API, formulaire de publication, lecture d'une annonce, annulation, puis audits d'accessibilité. Aucune dépendance n'est ajoutée ; modifier un trajet, voir ses passagers et retrouver un code perdu sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec                | Dans le code                    | Ce que c'est                                                                                             |
| --------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| écran « Publier un trajet » | route `/publier`, `PublishPage` | L'écran du conducteur : annonce à coller, formulaire, « Dem na ! », puis « Annuler mon trajet ».         |
| choix du véhicule           | `VehiclePicker`                 | Trois grandes cases à cocher : voiture, taxi, Ndiaga Ndiaye ; le choix fixe le nombre maximum de places. |
| formulaire                  | `TripForm`                      | Lieu de départ, site, jour, heure, places, prix en FCFA, téléphone ; vérifié par `publishTripSchema`.    |
| lire mon annonce            | `AnnouncementReader`            | Le champ où l'on colle l'annonce, et « Lire mon annonce », qui remplit le formulaire sans publier.       |
| « Dem na ! »                | `PublishedTrip`                 | L'écran qui salue la publication et montre le code de gestion avec « Copier le code ».                   |
| annuler mon trajet          | `CancelTripForm`                | Le champ du code de gestion, la confirmation, puis « Trajet annulé ».                                    |
| refus en clair              | `publish-messages.ts`           | La table qui traduit chaque code d'erreur de l'API en phrase sans jargon.                                |

## 2. Fichiers par couche

On crée la fonctionnalité `apps/web/src/features/publish/`, organisée comme `features/bookings` de TR7 : `api/` pour les appels et les hooks TanStack Query, `components/` pour l'écran.

- **shared, domain, application, infra, http** : rien ; l'API sert déjà `POST /api/trips` (TR1), `POST /api/trips/proposals` (TR5) et `POST /api/trips/cancel` (TR3), et le schéma partagé donne `publishTripSchema`, `tripProposalSchema`, `cancelTripSchema` et `VEHICLE_MAX_SEATS`.
- **web — fausse API** : `apps/web/src/mocks/handlers.ts` reçoit les trois routes, avec les mêmes refus que l'API : `SEATS_OUT_OF_RANGE` (400) selon `VEHICLE_MAX_SEATS`, `DEPARTURE_IN_PAST` (422) par rapport à `MOCK_NOW`, `VALIDATION_FAILED` (400), `PROPOSAL_SITE_NOT_FOUND`, `PROPOSAL_DEPARTURE_NOT_FOUND` et `ASSISTANT_UNAVAILABLE` (422), `TRIP_NOT_FOUND` (404) et `TRIP_ALREADY_CANCELLED` (409). Un trajet publié reçoit un code de gestion et entre dans la liste des départs. `apps/web/src/mocks/fixture.ts` reçoit `managementCodes` (le code de chaque trajet) et `proposalAnswer`, la réponse que la fausse API donne pour une annonce ; un test la choisit pour simuler un site ou une heure introuvables, ou un assistant en panne.
- **web — publication** :
  - `apps/web/src/features/publish/api/publish.api.ts` : `publish(input)`, `propose(message)`, `cancel(managementCode)`, réponses validées par `publishedTripSchema`, `tripProposalSchema` et `cancelledTripSchema` ; `publish.queries.ts` : leurs hooks. Publier et annuler relisent les départs.
  - `apps/web/src/features/publish/components/vehicle-picker.tsx`, `trip-form.tsx`, `published-trip.tsx` et `publish-page.tsx`. Le jour et l'heure saisis deviennent un instant en GMT (`…Z`), l'heure de Dakar. Le champ des places a pour maximum `VEHICLE_MAX_SEATS` du véhicule choisi, et un changement de véhicule ramène les places sous ce maximum.
  - `apps/web/src/features/publish/components/publish-messages.ts` : les phrases de la spec ; pour `SEATS_OUT_OF_RANGE`, la phrase dépend du véhicule (« Une voiture ou un taxi a 4 places au plus. », « Un Ndiaga Ndiaye a 38 places au plus. »).
  - `apps/web/src/routes/publier.tsx` et un lien « Publier » dans `apps/web/src/brand/site-header.tsx`.
- **web — annonce** : `apps/web/src/features/publish/components/announcement-reader.tsx` envoie l'annonce, puis remplit `TripForm` avec la proposition : un champ que l'assistant n'a pas trouvé reste vide, le prix et le téléphone toujours. Rien n'est publié avant « Publier ».
- **web — annulation** : `apps/web/src/features/publish/components/cancel-trip-form.tsx`, avec la confirmation `AlertDialog` de TR7 ; un code mal tapé (pas 8 caractères) donne la phrase du code inconnu, comme en TR7.
- Comme en TR6 et TR7 : toute animation sous `motion-safe:`, `min-h-11` sur tout ce qu'on touche, couleurs de `brand/palette.ts`.

## 3. Données

L'écran ne stocke rien : le code de gestion s'affiche, se copie, mais n'est pas gardé dans le téléphone (hypothèse retenue par la spec). La fausse API garde ses trajets, leurs codes et la réponse de l'assistant en mémoire dans `fixture.ts`, remis à zéro après chaque test. Aucune migration.

## 4. Erreurs

Chaque refus de la spec garde le code et le statut de l'API ; l'écran les traduit en phrases, sans en créer de nouveau.

| Code AppError                  | Catégorie     | HTTP | Ce que l'écran affiche                                                       | Scénario |
| ------------------------------ | ------------- | ---- | ---------------------------------------------------------------------------- | -------- |
| `SEATS_OUT_OF_RANGE`           | VALIDATION    | 400  | « Une voiture ou un taxi a 4 places au plus. » (ou 38 pour un Ndiaga)        | AS2      |
| `DEPARTURE_IN_PAST`            | BUSINESS_RULE | 422  | « Ce départ est déjà passé. »                                                | AS2      |
| `VALIDATION_FAILED`            | VALIDATION    | 400  | Le champ en cause, nommé ; pour un code de gestion, le code inconnu.         | AS2, AS5 |
| `PROPOSAL_SITE_NOT_FOUND`      | BUSINESS_RULE | 422  | « Je n'ai pas trouvé le site (Dakar, Diamniadio ou Saly) dans ton annonce. » | AS4      |
| `PROPOSAL_DEPARTURE_NOT_FOUND` | BUSINESS_RULE | 422  | « Je n'ai pas trouvé l'heure de départ dans ton annonce. »                   | AS4      |
| `ASSISTANT_UNAVAILABLE`        | BUSINESS_RULE | 422  | « L'assistant ne répond pas, remplis le formulaire. »                        | AS4      |
| `TRIP_NOT_FOUND`               | NOT_FOUND     | 404  | « Aucun trajet avec ce code. »                                               | AS5      |
| `TRIP_ALREADY_CANCELLED`       | CONFLICT      | 409  | « Ce trajet est déjà annulé. »                                               | AS5      |

Toute autre réponse en échec affiche « Réessayer », comme en TR6 et TR7.

## 5. Tests par scénario

Chaque scénario est prouvé par au moins un test d'écran, sur la fausse API ; la fausse API a ses propres tests de contrat.

| Scénario | Fichier de test                                                         | Niveau   | Ce que le test vérifie                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/web/src/mocks/handlers.test.ts`                                   | unitaire | La fausse API publie, renvoie un code de gestion et met le trajet dans les départs du jour.                                                                                             |
| AS1      | `apps/web/src/features/publish/components/publish-page.test.tsx`        | écran    | Ndiaga Ndiaye, Pikine, Diamniadio, 10 novembre 8 h, 38 places, 500 FCFA : « Dem na ! », un code de 8 caractères, « Copier le code », et le trajet dans les départs avec 38 places.      |
| AS2      | `apps/web/src/features/publish/components/publish-page.test.tsx`        | écran    | Le maximum des places passe de 4 (voiture, taxi) à 38 (Ndiaga) ; un refus de places et un départ passé s'affichent en clair ; un champ vide est nommé sans requête ; rien n'est publié. |
| AS3      | `apps/web/src/features/publish/components/announcement-reader.test.tsx` | écran    | L'annonce remplit véhicule, lieu, site, jour, heure et places ; aucune publication avant « Publier » ; après prix, téléphone et « Publier », « Dem na ! ».                              |
| AS4      | `apps/web/src/features/publish/components/announcement-reader.test.tsx` | écran    | Site introuvable, heure introuvable, assistant en panne : la phrase de la section 4, le formulaire toujours là, rien de publié.                                                         |
| AS5      | `apps/web/src/features/publish/components/cancel-trip-form.test.tsx`    | écran    | Le code de gestion puis la confirmation : « Trajet annulé », et le trajet quitte les départs ; code inconnu, code de 7 caractères et trajet déjà annulé donnent leur phrase.            |
| AS6      | `apps/web/src/routes/publier.a11y.test.tsx`                             | écran    | L'audit axe ne relève rien à chaque étape (formulaire, refus, annonce lue, « Dem na ! », confirmation d'annulation) ; aucune animation hors `motion-safe:` ; tout a `min-h-11`.         |

## 6. Tâches

Cinq tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [008-AS1, AS2, AS3, AS4, AS5] Écrire d'abord dans `apps/web/src/mocks/handlers.test.ts` (« 008-AS2: refuses a car with 5 seats like the API (400, SEATS_OUT_OF_RANGE) »), puis `managementCodes` et `proposalAnswer` dans `fixture.ts`, et les trois routes dans `handlers.ts`
- [x] T02 [008-AS1, AS2] Écrire d'abord `apps/web/src/features/publish/components/publish-page.test.tsx` (« 008-AS1: publishes a Ndiaga Ndiaye and says « Dem na ! » with its management code »), puis `publish.api.ts`, `publish.queries.ts`, `publish-messages.ts`, `VehiclePicker`, `TripForm`, `PublishedTrip`, `PublishPage`, la route `/publier` et le lien « Publier » de l'en-tête
- [x] T03 [008-AS3, AS4] Écrire d'abord `apps/web/src/features/publish/components/announcement-reader.test.tsx` (« 008-AS3: fills the form from the announcement without publishing »), puis `AnnouncementReader` et le remplissage de `TripForm`
- [ ] T04 [008-AS5] Écrire d'abord `apps/web/src/features/publish/components/cancel-trip-form.test.tsx` (« 008-AS5: cancels a trip with its management code after confirmation »), puis `CancelTripForm` dans `PublishPage`
- [ ] T05 [008-AS6] Écrire d'abord `apps/web/src/routes/publier.a11y.test.tsx` (« 008-AS6: the publish screen is clean after « Dem na ! » »), puis corriger ce que l'audit, la règle `motion-safe:` et la règle `min-h-11` relèvent
