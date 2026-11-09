# 005 — Publier un trajet depuis un message libre

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR5

## Contexte

Les conducteurs écrivent déjà leurs annonces dans les groupes WhatsApp. Remplir un formulaire champ par champ les freine. Cette tranche leur laisse coller ce message : un assistant IA en propose le trajet, que le conducteur relit et confirme. Rien n'est publié sans sa confirmation ni sans les règles de TR1.

## User stories

- En tant que conducteur, je veux coller mon annonce WhatsApp telle quelle, afin d'obtenir un trajet prérempli sans tout ressaisir.
- En tant que conducteur, je veux relire et corriger le trajet proposé avant de le publier, afin que rien de faux ne soit publié à mon nom.

## Scénarios d'acceptation

### AS1 — Proposer un trajet extrait du message

- **Étant donné** nous sommes le 9 novembre 2026 à 9 h
- **Quand** un conducteur colle « je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places »
- **Alors** il reçoit une proposition : véhicule Ndiaga Ndiaye, lieu de départ Pikine, site Diamniadio, départ le 10 novembre 2026 à 8 h, 38 places ; aucun trajet n'est publié, et la liste des départs vers Diamniadio du 10 novembre ne change pas

### AS2 — Confirmer la proposition corrigée

- **Étant donné** la proposition d'AS1
- **Quand** le conducteur y ajoute un prix de 500 FCFA et son téléphone, puis la confirme
- **Alors** le trajet est publié comme en TR1 : il reçoit un code de gestion, et le trajet apparaît dans les départs vers Diamniadio du 10 novembre avec 38 places restantes

### AS3 — La confirmation suit les règles de TR1

- **Étant donné** une proposition « voiture, 5 places » extraite d'un message
- **Quand** le conducteur la confirme sans la corriger
- **Alors** la publication est refusée comme en TR1 : refus 400 avec le code SEATS_OUT_OF_RANGE, et aucun trajet n'est créé ; de même, un départ passé est refusé avec le refus 422 et le code DEPARTURE_IN_PAST

### AS4 — Message sans site reconnu

- **Étant donné** un conducteur
- **Quand** il colle « je vais à Thiès demain 8h, 3 places »
- **Alors** la demande est refusée avec un message clair qui dit qu'aucun site parmi Dakar, Diamniadio et Saly n'a été trouvé, et rien n'est proposé ni publié

### AS5 — Message sans heure de départ

- **Étant donné** un conducteur
- **Quand** il colle « je pars de Pikine pour Diamniadio, 3 places »
- **Alors** la demande est refusée avec un message clair qui dit qu'aucune heure de départ n'a été trouvée, et rien n'est proposé ni publié

### AS6 — Assistant indisponible

- **Étant donné** l'assistant IA ne répond pas
- **Quand** un conducteur colle son message
- **Alors** la demande est refusée avec un message qui l'invite à remplir le formulaire de TR1, et rien n'est publié

## Hors périmètre

- Publier sans confirmation, comprendre un message vocal ou une photo, extraire le téléphone du message, apprendre des corrections du conducteur, écran.

## Questions ouvertes

- Ce que le message ne dit pas (prix, véhicule, places) reste vide dans la proposition, et le conducteur le complète ; le téléphone est toujours saisi par lui. Hypothèse retenue.
- « Demain », « ce soir » et une heure sans date se lisent par rapport au jour où le message est collé, à l'heure de Dakar (GMT). Hypothèse retenue.
- Un message vide ou trop long (plus de 1 000 caractères) est refusé avec un message de validation, avant d'appeler l'assistant. Hypothèse retenue.
