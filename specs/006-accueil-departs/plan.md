# 006 — Accueil et départs : plan

**Statut** : Validé

## 1. Résumé

On construit dans `apps/web` les deux premiers écrans de Dem : l'accueil, et la page des départs d'un site pour un jour avec les lignes officielles en alternative, aux couleurs et aux polices de la charte. Une fois les tâches terminées, un supporter ouvre le lien, comprend le service, touche « Voir les départs », choisit un site et un jour, et voit les covoiturages triés par heure et les navettes JOJ ou Dakar Dem Dikk ; un jour sans départ, une panne de chargement et un téléphone qui demande moins d'animations ont chacun leur réponse. Le travail est découpé en cinq tâches : fausse API, charte, accueil, page des départs, puis audits d'accessibilité ; l'API ne change pas, elle sert déjà ces données depuis TR1 et TR4. La réservation (TR7), la publication (TR8) et le mode hors connexion sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec           | Dans le code                               | Ce que c'est                                                                                        |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| accueil                | route `/`, `HomePage`                      | La page d'entrée : accroche, logo, Ayo, frise, trois étapes, réponses aux doutes.                   |
| départs                | route `/departs`, `DeparturesPage`         | La page qui liste les covoiturages d'un site pour un jour, puis les lignes officielles.             |
| site, jour choisis     | paramètres d'adresse `site` et `date`      | Ils restent dans l'adresse (`/departs?site=diamniadio&date=2026-11-10`), donc dans un lien partagé. |
| départ                 | `TripCard`                                 | Une carte : véhicule, lieu de départ, heure, prix en FCFA, places restantes, « Réserver ».          |
| ligne officielle       | `OfficialLineCard`                         | Une carte bleu Atlantique marquée « ne se réserve pas ici ».                                        |
| frise des cars rapides | `CarRapideFrieze`                          | Une bande de triangles colorés sous l'en-tête, dessinée en SVG, sans image à télécharger.           |
| charte                 | jetons de `styles.css`, `brand/palette.ts` | Les couleurs et les polices de la charte, déclarées une fois et réutilisées partout.                |

## 2. Fichiers par couche

On crée la fonctionnalité `apps/web/src/features/trips/`, organisée comme la fonctionnalité de référence `disciplines` de la branche `main` : un dossier `api/` pour les appels HTTP et les hooks TanStack Query, un dossier `components/` pour l'écran. On ajoute deux dépendances à `apps/web` : `lucide-react` pour les icônes, déjà prévu par `components.json`, et `@fontsource-variable/inter` avec `@fontsource/bricolage-grotesque` pour héberger les polices avec le site.

- **shared** : rien de nouveau ; on réutilise `tripListSchema`, `listTripsQuerySchema`, `officialLineListSchema`, `TRIP_SITES` et `TRIP_VEHICLES`.
- **domain, application, infra, http** : rien ; l'API sert déjà `GET /api/trips?site=…&date=…` (TR1) et `GET /api/official-lines?site=…` (TR4).
- **web — fausse API** :
  - `apps/web/src/mocks/fixture.ts` reçoit `trips` (deux départs vers Diamniadio le 10 novembre à 10 h et à 8 h, un vers Saly) et `officialLines` (les trois lignes d'exemple de l'API).
  - `apps/web/src/mocks/handlers.ts` reçoit `GET /api/trips` et `GET /api/official-lines`, avec les mêmes schémas, le même tri et les mêmes refus que l'API (400 `VALIDATION_FAILED` sur un site inconnu).
- **web — charte** :
  - `apps/web/src/styles.css` déclare les couleurs de la charte (vert baobab, jaune soleil, rouge latérite et sa version foncée, bleu Atlantique, sable, texte) et les deux polices ; il remplace les couleurs neutres du socle.
  - `apps/web/src/brand/palette.ts` liste les couleurs et les paires texte sur fond autorisées, et `contrastRatio()` qui calcule leur contraste selon WCAG.
  - `apps/web/src/brand/car-rapide-frieze.tsx` dessine la frise ; `apps/web/src/brand/site-header.tsx` affiche le logo JOJ (`/cojoj1.webp`) avec la frise, sur toutes les pages.
- **web — accueil** : `apps/web/src/routes/index.tsx` affiche `HomePage`, écrite dans `apps/web/src/features/home/components/home-page.tsx` : accroche, Ayo (`/mascotte.webp`), lien « Voir les départs » en haut et en bas, trois étapes, trois réponses aux doutes. `apps/web/src/routes/__root.tsx` utilise `SiteHeader`.
- **web — départs** :
  - `apps/web/src/features/trips/api/trips.api.ts` : `listTrips(site, date)` et `listOfficialLines(site)`, réponses validées par les schémas partagés ; `trips.queries.ts` : leurs hooks TanStack Query.
  - `apps/web/src/routes/departs.tsx` lit et valide `site` et `date` dans l'adresse ; `date` vaut aujourd'hui à Dakar (GMT) si elle manque.
  - `apps/web/src/features/trips/components/departures-page.tsx` : le choix du site et du jour, la liste des `TripCard`, le message « Aucun départ ce jour-là », l'erreur en rouge latérite avec « Réessayer », puis les `OfficialLineCard`. « Réserver » est un bouton visible mais inactif, avec la mention « bientôt » (TR7).
- Toutes les animations passent par la variante `motion-safe:` de Tailwind : un téléphone qui demande moins d'animations n'en voit aucune. Tout élément qu'on touche a la classe `min-h-11`, soit 44 px.

## 3. Données

On ne stocke rien : les écrans lisent les routes existantes. La fausse API garde ses données en mémoire dans `fixture.ts`, remises à zéro après chaque test. Aucune migration.

## 4. Erreurs

Chaque refus de la spec garde le code et le statut de l'API ; l'écran n'en crée aucun. Le seul cas de la spec est une panne de chargement (AS5), qui s'affiche quel que soit le statut reçu.

| Code AppError       | Catégorie  | HTTP | Quand                                                                              | Scénario |
| ------------------- | ---------- | ---- | ---------------------------------------------------------------------------------- | -------- |
| `VALIDATION_FAILED` | VALIDATION | 400  | Un site ou une date mal formés dans l'adresse, refusés par la fausse API et l'API. | AS5      |

Toute réponse qui n'est pas un succès, y compris une panne 500 simulée, affiche le message d'erreur en rouge latérite et « Réessayer » (AS5).

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test d'écran, sur la fausse API. Deux mesures ne se font pas dans jsdom, qui n'applique ni CSS ni mise en page : le contraste est prouvé par le calcul sur les paires de la charte, et le temps d'affichage par le poids des fichiers et une mesure manuelle.

| Scénario | Fichier de test                                                   | Niveau   | Ce que le test vérifie                                                                                                                                               |
| -------- | ----------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/web/src/features/home/components/home-page.test.tsx`        | écran    | L'accueil montre l'accroche en un titre, le logo et Ayo avec leur texte alternatif, deux liens « Voir les départs », trois étapes et trois réponses aux doutes.      |
| AS2      | `apps/web/src/mocks/handlers.test.ts`                             | unitaire | La fausse API trie les départs par heure, filtre par site et par jour, et refuse un site inconnu comme l'API.                                                        |
| AS2      | `apps/web/src/features/trips/components/departures-page.test.tsx` | écran    | Diamniadio le 10 novembre : 2 départs, 8 h en premier, avec véhicule, lieu, heure, prix en FCFA et places ; Saly absent ; la requête porte `site` et `date`.         |
| AS3      | `apps/web/src/features/trips/components/departures-page.test.tsx` | écran    | Sous la liste, la navette JOJ et la ligne Dakar Dem Dikk, chacune marquée « ne se réserve pas ici ».                                                                 |
| AS4      | `apps/web/src/features/trips/components/departures-page.test.tsx` | écran    | Saly le 12 novembre : « Aucun départ ce jour-là », l'invitation à changer de jour, et la ligne officielle vers Saly.                                                 |
| AS5      | `apps/web/src/features/trips/components/departures-page.test.tsx` | écran    | Une panne simulée affiche une alerte et « Réessayer » ; un toucher relance la requête et la liste apparaît.                                                          |
| AS6      | `apps/web/src/brand/palette.test.ts`                              | unitaire | Chaque paire texte sur fond de la charte atteint 4,5:1 ; le rouge latérite clair n'est jamais une couleur de texte.                                                  |
| AS6      | `apps/web/src/routes/home.a11y.test.tsx`, `departs.a11y.test.tsx` | écran    | L'audit axe ne relève rien sur l'accueil, la liste, le jour vide et l'erreur ; aucun élément n'a d'animation hors `motion-safe:` ; tout bouton et lien a `min-h-11`. |
| AS7      | `apps/web/src/brand/assets.test.ts`                               | unitaire | Le logo et Ayo sont en WebP et pèsent moins de 50 Ko chacun.                                                                                                         |

AS7 demande aussi moins de 3 secondes sur une 4G lente : cela se mesure dans un vrai navigateur (Lighthouse, profil « 4G lente »), à la main, avant `/converge`.

## 6. Tâches

Cinq tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [006-AS2, AS3] Écrire d'abord `apps/web/src/mocks/handlers.test.ts` (« 006-AS2: serves the trips of a site for a day, sorted by departure »), puis les données `trips` et `officialLines` de `fixture.ts` et les deux routes de `handlers.ts`
- [x] T02 [006-AS6, AS7] Écrire d'abord `apps/web/src/brand/palette.test.ts` et `assets.test.ts` (« 006-AS6: every text colour of the charter reaches AA », « 006-AS7: brand images are compressed WebP »), puis `palette.ts`, les jetons de `styles.css` et les polices hébergées
- [x] T03 [006-AS1] Écrire d'abord `apps/web/src/features/home/components/home-page.test.tsx` (« 006-AS1: says the service in one sentence and leads to the departures »), puis `lucide-react`, `SiteHeader`, `CarRapideFrieze`, `HomePage` et la route `/`
- [x] T04 [006-AS2, AS3, AS4, AS5] Écrire d'abord `apps/web/src/features/trips/components/departures-page.test.tsx` (« 006-AS4: says there is no departure that day, and still shows the official lines »), puis `trips.api.ts`, `trips.queries.ts`, `DeparturesPage`, `TripCard`, `OfficialLineCard` et la route `/departs`
- [x] T05 [006-AS6] Écrire d'abord `apps/web/src/routes/home.a11y.test.tsx` et `departs.a11y.test.tsx` (« 006-AS6: the departures page is clean when the day is empty »), puis corriger ce que l'audit, la règle `motion-safe:` et la règle `min-h-11` relèvent

## 7. Corrections

### Passage 1

Écarts bloquants relevés par le relecteur (base `50fad57^`).

- [x] T06 [006-AS6] Écrire d'abord `apps/web/src/brand/dark-mode.test.ts` (« 006-AS6: keeps the charter colours when the phone is in dark mode »), un test qui vérifie que la variante `dark:` de Tailwind ne dépend que d'une classe `.dark`, jamais posée, et pas du mode sombre du téléphone, puis remettre `@custom-variant dark (&:is(.dark *));` dans `styles.css` ; preuve : relecteur, `apps/web/src/styles.css:1-4` (en mode sombre, « Réessayer » tombe à 2,74:1, sous AA)
- [x] T07 [006-AS3, AS5] Écrire d'abord dans `apps/web/src/features/trips/components/departures-page.test.tsx` (« 006-AS3: shows the official lines in Atlantic blue », « 006-AS5: shows the error in laterite red »), des assertions sur les classes de la charte : `border-atlantique` et `text-atlantique` sur chaque carte de ligne officielle, `border-laterite` et `text-laterite-fonce` sur l'alerte ; preuve : relecteur, `departures-page.test.tsx`, tests 006-AS3 et 006-AS5 (la couleur demandée par l'« Alors » n'est pas vérifiée)
- [x] T08 [006-AS7] Noter la mesure Lighthouse demandée par le plan avant `/converge`, faite le 9 novembre 2026 : Lighthouse 13.6.0, profil mobile (4G lente simulée : 1,5 Mbit/s, 150 ms de latence, processeur ralenti 4 fois), version de production de l'accueil servie par `vite preview`, trois passages. Premier écran (FCP) : 1,8 s, 0,8 s, 0,8 s. Plus grand élément (LCP) : 1,8 s, 2,7 s, 2,7 s, sous les 3 s d'AS7, avec peu de marge. Score de performance : 63, 95, 96 ; le premier passage a 4,1 s de processeur bloqué, contre 0,1 s pour les deux autres. Poids transféré : 247 Ko, dont 141 Ko de JavaScript, 69 Ko de polices (Inter 47 Ko, Bricolage Grotesque 800 22 Ko), 30 Ko d'images et 6 Ko de CSS ; Lighthouse estime 69 Ko de JavaScript inutile au premier écran ; demande de l'humain après le relecteur (aucune trace de la mesure dans le dépôt)
- [x] T09 [006-AS6] Écrire d'abord dans `apps/web/src/brand/palette.test.ts` (« 006-AS6: covers every text colour used on screen »), un test qui exige les paires `lateriteFonce` sur `blanc` (alerte), `baobab` sur `blanc` (heure d'un départ) et `texte` sur `muted` (« Aucun départ »), puis les ajouter à `TEXT_PAIRS` et la couleur `muted` à `COLORS` dans `palette.ts` ; demande de l'humain après le relecteur
- [x] T10 [006-AS2] Écrire d'abord dans `apps/web/src/features/trips/components/departures-page.test.tsx` (« 006-AS2: changing the day in the date field updates the departures »), un test où le supporter change le jour dans le champ « Jour » et voit la liste du nouveau jour, puis corriger l'écran si besoin ; demande de l'humain après le relecteur (le jour n'arrivait que par l'adresse)

### Passage 2

Écart bloquant relevé par le second relecteur (base `50fad57^`).

- [x] T11 [006-AS2] Écrire d'abord dans `apps/web/src/features/trips/components/departures-page.test.tsx` (« 006-AS2: shows the vehicle, place, time, price and remaining seats of each departure »), des assertions sur les cinq valeurs du second départ (Ndiaga Ndiaye, Pikine, 10:00, 500 FCFA, 30 places restantes), comme pour le premier ; test de couverture, il peut passer d'emblée ; preuve : relecteur, `departures-page.test.tsx:28-29` (le lieu, le prix et les places du départ de 10 h ne sont pas vérifiés)
