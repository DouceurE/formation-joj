# 005 — Publier un trajet depuis un message libre : plan

**Statut** : Validé

## 1. Résumé

On ajoute au module de covoiturage `trips` une route qui transmet le message libre d'un conducteur à un assistant IA (Claude, par le SDK officiel d'Anthropic) et renvoie une proposition de trajet, sans rien publier. Une fois les tâches terminées, un conducteur colle son annonce WhatsApp et reçoit le trajet prérempli ; il le complète puis le confirme par la publication existante de TR1, qui applique ses règles ; un message sans site ou sans heure, et un assistant indisponible, sont refusés avec un message clair. Le travail est découpé en cinq tâches, dans l'ordre des couches : schémas partagés, domaine, cas d'usage avec un faux assistant, adaptateur Claude, puis route HTTP. Les tests n'appellent jamais le vrai assistant ; la publication sans confirmation, les messages vocaux ou photos, l'extraction du téléphone et tout écran sont laissés de côté.

Les mots de la spec et leur nom dans le code :

| Dans la spec               | Dans le code                    | Ce que c'est                                                                                    |
| -------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| message libre              | `message`                       | Le texte collé par le conducteur, de 1 à 1 000 caractères.                                      |
| assistant IA               | `TripExtractor`                 | Le port qui lit un message et en renvoie les champs reconnus ; implémenté par Claude.           |
| ce que l'assistant extrait | `ExtractedTrip`                 | Les champs bruts lus dans le message, chacun pouvant manquer.                                   |
| proposition                | `TripProposal`, `proposeTrip()` | Le trajet prérempli : site et départ toujours présents, les autres champs vides s'ils manquent. |
| proposer                   | `ProposeTripFromMessage`        | Le cas d'usage qui appelle l'assistant puis construit la proposition.                           |
| confirmer                  | `PublishTrip` (TR1)             | La publication de TR1, appelée avec la proposition complétée : rien de nouveau.                 |
| assistant indisponible     | `ASSISTANT_UNAVAILABLE`         | L'assistant n'a pas répondu, a refusé, ou a renvoyé une réponse illisible.                      |

## 2. Fichiers par couche

On étend le module `trips`, qui suit le module de référence `disciplines` de la branche `main` : un dossier par couche. La confirmation (AS2, AS3) ne demande aucun code : c'est la route `POST /api/trips` de TR1. On ajoute la dépendance `@anthropic-ai/sdk` à `apps/api`.

- **shared** : `packages/shared/src/trips.ts` reçoit `TRIP_MESSAGE_MAX_LENGTH` (1 000), `proposeTripSchema` (corps `{ message }`, non vide après suppression des espaces, 1 000 caractères au plus) et `tripProposalSchema`, la réponse (`vehicle`, `departurePlace`, `seats`, `priceFcfa`, chacun pouvant valoir `null` ; `site` et `departureAt` toujours présents).
- **domain** :
  - `apps/api/src/modules/trips/domain/trip-proposal.ts` contient `ExtractedTrip`, `TripProposal` et `proposeTrip(extracted)`. La fonction refuse un site absent ou hors des trois sites (`PROPOSAL_SITE_NOT_FOUND`) et une heure absente ou illisible (`PROPOSAL_DEPARTURE_NOT_FOUND`) ; elle met à `null` un véhicule inconnu, des places ou un prix qui ne sont pas des entiers. Elle ne vérifie pas les règles de TR1 : c'est la publication qui le fera, après relecture.
  - `apps/api/src/modules/trips/domain/trips.errors.ts` reçoit les trois codes de la section 4 et la fabrique `assistantUnavailable()`.
- **application** :
  - `apps/api/src/modules/trips/application/trip-extractor.ts` est le port `TripExtractor` : `extract(message, now)` renvoie un `ExtractedTrip`, ou lève `ASSISTANT_UNAVAILABLE`.
  - `apps/api/src/modules/trips/application/use-cases/propose-trip-from-message.ts` contient `ProposeTripFromMessage` : appelle `extract()` avec l'instant présent, puis `proposeTrip()`. Il n'écrit rien en base.
  - `apps/api/src/modules/trips/application/testing/fake-trip-extractor.ts` est le faux assistant des tests : il renvoie la réponse qu'on lui a donnée, ou lève `ASSISTANT_UNAVAILABLE` sur demande.
- **infra** : `apps/api/src/modules/trips/infra/claude-trip-extractor.ts` implémente le port avec le client `Anthropic` du SDK, reçu par son constructeur pour être remplaçable en test. Il appelle `messages.parse()` avec `output_config.format: zodOutputFormat(<schéma de l'extraction>)` sur le modèle `claude-opus-5-5`, effort `low` (extraction simple), et la reprise automatique en cas de refus (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Le prompt système donne la date et l'heure du jour à Dakar (GMT), pour que « demain 8h » devienne une date ; il demande de laisser vide ce que le message ne dit pas. Une erreur du SDK, un `stop_reason` « refusal » ou une sortie illisible deviennent `ASSISTANT_UNAVAILABLE`. La clé est lue par le SDK dans `ANTHROPIC_API_KEY` (`apps/api/.env`, ignoré par git) ; `apps/api/.env.example` l'annonce, vide.
- **http** : `apps/api/src/modules/trips/http/trips.controller.ts` reçoit la route ; `apps/api/src/modules/trips/trips.module.ts` relie `TripExtractor` à `ClaudeTripExtractor` et déclare le client `Anthropic` et `ProposeTripFromMessage` ; `apps/api/test/create-test-app.ts` remplace `TripExtractor` par le faux assistant, pour qu'aucun test n'appelle Claude. Route :
  - `POST /api/trips/proposals` lit le message et renvoie 200 et la proposition ; rien n'est publié.
- **web** : rien, car la spec exclut l'écran.

## 3. Données

On ne stocke rien de nouveau : la proposition n'est pas enregistrée, et la confirmation crée un trajet dans la table `trips` de TR1. Aucune migration n'est créée.

## 4. Erreurs

Chaque refus de la spec devient une erreur métier (`AppError`), avec un code stable et un statut HTTP. AS3 reprend tels quels les codes de TR1. Un message vide ou trop long est arrêté par la validation Zod, qui répond 400 avec le code commun `VALIDATION_FAILED`.

| Code AppError                  | Catégorie     | HTTP | Quand                                                                                                                  | Scénario |
| ------------------------------ | ------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `SEATS_OUT_OF_RANGE`           | VALIDATION    | 400  | La proposition confirmée a trop ou trop peu de places (code de TR1).                                                   | AS3      |
| `DEPARTURE_IN_PAST`            | BUSINESS_RULE | 422  | La proposition confirmée part dans le passé (code de TR1).                                                             | AS3      |
| `PROPOSAL_SITE_NOT_FOUND`      | BUSINESS_RULE | 422  | L'assistant ne trouve ni Dakar, ni Diamniadio, ni Saly dans le message.                                                | AS4      |
| `PROPOSAL_DEPARTURE_NOT_FOUND` | BUSINESS_RULE | 422  | L'assistant ne trouve pas d'heure de départ dans le message.                                                           | AS5      |
| `ASSISTANT_UNAVAILABLE`        | BUSINESS_RULE | 422  | L'assistant ne répond pas, refuse ou renvoie une réponse illisible ; le message invite à remplir le formulaire de TR1. | AS6      |

## 5. Tests par scénario

Chaque scénario de la spec est prouvé par au moins un test, au niveau le plus bas qui suffit. Aucun test n'appelle le vrai assistant : le faux le remplace, et l'adaptateur Claude est testé avec un client du SDK simulé.

| Scénario | Fichier de test                                                    | Niveau      | Ce que le test vérifie                                                                                                                        |
| -------- | ------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| AS1      | `apps/api/src/modules/trips/domain/trip-proposal.spec.ts`          | unitaire    | `proposeTrip()` sur l'extraction du message de la spec donne Ndiaga Ndiaye, Pikine, Diamniadio, le 10 novembre à 8 h, 38 places, prix `null`. |
| AS1      | `apps/api/src/modules/trips/application/trips.application.spec.ts` | application | `ProposeTripFromMessage` passe le message et l'instant au faux assistant, renvoie la proposition, et la liste du jour reste vide.             |
| AS1      | `apps/api/src/modules/trips/infra/claude-trip-extractor.spec.ts`   | unitaire    | Avec un client simulé, l'adaptateur envoie le modèle `claude-opus-5-5`, met la date du jour dans le prompt et renvoie la sortie lue.          |
| AS1      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | `POST /api/trips/proposals` renvoie 200 et la proposition, et `GET /api/trips` du jour reste vide.                                            |
| AS2      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | La proposition complétée (prix 500, téléphone) envoyée à `POST /api/trips` renvoie 201 et un code de gestion ; la liste montre 38 places.     |
| AS3      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | Une proposition « voiture, 5 places » confirmée renvoie 400 `SEATS_OUT_OF_RANGE` ; un départ passé renvoie 422 `DEPARTURE_IN_PAST`.           |
| AS4      | `apps/api/src/modules/trips/domain/trip-proposal.spec.ts`          | unitaire    | Sans site, ou avec « thies », `proposeTrip()` lève `PROPOSAL_SITE_NOT_FOUND`.                                                                 |
| AS4      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | Le message vers Thiès renvoie 422 `PROPOSAL_SITE_NOT_FOUND`.                                                                                  |
| AS5      | `apps/api/src/modules/trips/domain/trip-proposal.spec.ts`          | unitaire    | Sans heure, ou avec une heure illisible, `proposeTrip()` lève `PROPOSAL_DEPARTURE_NOT_FOUND`.                                                 |
| AS5      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | Le message sans heure renvoie 422 `PROPOSAL_DEPARTURE_NOT_FOUND`.                                                                             |
| AS6      | `apps/api/src/modules/trips/application/trips.application.spec.ts` | application | Quand le faux assistant échoue, `ProposeTripFromMessage` lève `ASSISTANT_UNAVAILABLE` et rien n'est publié.                                   |
| AS6      | `apps/api/src/modules/trips/infra/claude-trip-extractor.spec.ts`   | unitaire    | Une erreur du client simulé, un `stop_reason` « refusal » ou une sortie `null` deviennent `ASSISTANT_UNAVAILABLE`.                            |
| AS6      | `apps/api/test/trips.e2e.spec.ts`                                  | e2e         | Assistant en panne : 422 `ASSISTANT_UNAVAILABLE`, avec un message qui renvoie au formulaire.                                                  |

## 6. Tâches

Cinq tâches, dans l'ordre des couches. Chaque tâche nomme le test à écrire d'abord et cite les scénarios qu'elle couvre ; elle tient dans un commit.

- [x] T01 [005-AS1] Écrire d'abord dans `packages/shared/src/trips.spec.ts` (« 005-AS1: accepts a message of at most 1000 characters »), puis `TRIP_MESSAGE_MAX_LENGTH`, `proposeTripSchema` et `tripProposalSchema`
- [x] T02 [005-AS1, AS4, AS5] Écrire d'abord `domain/trip-proposal.spec.ts` (« 005-AS4: refuses a message without a known site », « 005-AS5: refuses a message without a departure time »), puis `trip-proposal.ts` et les nouveaux codes de `trips.errors.ts`
- [x] T03 [005-AS1, AS6] Écrire d'abord dans `application/trips.application.spec.ts` (« 005-AS1: proposes a trip without publishing it », « 005-AS6: refuses when the assistant is unavailable »), puis le port `TripExtractor`, le faux assistant et `ProposeTripFromMessage`
- [x] T04 [005-AS1, AS6] Écrire d'abord `infra/claude-trip-extractor.spec.ts` (« 005-AS6: turns a refusal into ASSISTANT_UNAVAILABLE »), puis la dépendance `@anthropic-ai/sdk`, `ClaudeTripExtractor` et la ligne `ANTHROPIC_API_KEY` de `.env.example`
- [x] T05 [005-AS1, AS2, AS3, AS4, AS5, AS6] Écrire d'abord dans `apps/api/test/trips.e2e.spec.ts` (« 005-AS2: publishes the completed proposal through TR1 »), puis la route `POST /api/trips/proposals`, les déclarations dans `trips.module.ts` et le faux assistant dans `create-test-app.ts`

## 7. Corrections

### Passage 1

Écarts bloquants relevés par le relecteur (base `a19ad6e^`). Ce sont des tests de couverture : ils peuvent passer d'emblée.

- [x] T06 [005-AS3] Écrire d'abord dans `apps/api/test/trips.e2e.spec.ts` (« 005-AS3: creates no trip when the confirmed proposal breaks a rule of TR1 »), un test qui relit la liste des départs du jour après les refus 400 `SEATS_OUT_OF_RANGE` et 422 `DEPARTURE_IN_PAST` et la trouve vide ; preuve : relecteur, `apps/api/test/trips.e2e.spec.ts:466` (« aucun trajet n'est créé » non vérifié)
- [x] T07 [005-AS4, AS5] Écrire d'abord dans `domain/trip-proposal.spec.ts` et `apps/api/test/trips.e2e.spec.ts` (« 005-AS4: says that none of Dakar, Diamniadio and Saly was found », « 005-AS5: says that no departure time was found »), des assertions sur le message (`detail`) : il nomme les trois sites pour AS4, et dit qu'aucune heure n'a été trouvée pour AS5 ; preuve : relecteur, `trips.e2e.spec.ts:483`, `:488`, `trip-proposal.spec.ts:34`, `:38` (le message clair n'est pas vérifié)
- [x] T08 [005-AS4, AS5, AS6] Écrire d'abord dans `application/trips.application.spec.ts` (« 005-AS6: publishes nothing when the assistant is unavailable ») et dans `apps/api/test/trips.e2e.spec.ts`, des assertions qui relisent la liste des départs après les refus d'AS4, AS5 et AS6 et la trouvent vide ; preuve : relecteur, `trips.e2e.spec.ts:483`, `:488`, `:493`, `trips.application.spec.ts:284` (« rien n'est publié » non vérifié)

### Passage 2

Écart bloquant relevé par le second relecteur (base `a19ad6e^`).

- [x] T09 [005-AS6] Écrire d'abord dans `infra/claude-trip-extractor.spec.ts` (« 005-AS6: turns a missing API key into ASSISTANT_UNAVAILABLE »), un test où le client simulé lève une simple `Error` (« Could not resolve authentication method »), comme le SDK quand aucune clé n'est configurée, puis faire de toute erreur de l'appel à l'assistant une `ASSISTANT_UNAVAILABLE` dans `claude-trip-extractor.ts` ; preuve : relecteur, `apps/api/src/modules/trips/infra/claude-trip-extractor.ts:56-57` (sans clé, la réponse est 500 `INTERNAL_ERROR` au lieu de 422)
- [x] T10 [005-AS5] Écrire d'abord dans `domain/trip-proposal.spec.ts` (« 005-AS5: refuses a date without a time »), un test où l'assistant renvoie `2026-11-10` sans heure, refusé avec `PROPOSAL_DEPARTURE_NOT_FOUND` (422) et jamais lu comme minuit, puis exiger une heure dans `requiredDeparture()` de `trip-proposal.ts` ; demande de l'humain après le second relecteur (`domain/trip-proposal.ts`, `requiredDeparture`)
- [ ] T11 [005-AS6] Écrire d'abord dans `infra/claude-trip-extractor.spec.ts` (« 005-AS6: gives up after 15 seconds without retrying »), un test où le client simulé reçoit un délai de 15 000 ms et aucun nouvel essai, puis lève une `APIConnectionTimeoutError` transformée en `ASSISTANT_UNAVAILABLE`, sans appel réseau ; puis passer `{ timeout: 15_000, maxRetries: 0 }` à l'appel dans `claude-trip-extractor.ts` ; demande de l'humain après le second relecteur (client créé sans délai, environ 10 minutes par défaut)
