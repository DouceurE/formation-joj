# 003 — Annuler une réservation ou un trajet

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR3

## Contexte

Depuis TR2, une place réservée reste prise même si le supporter ne vient plus, et un conducteur empêché n'a aucun moyen de prévenir ses passagers. Cette tranche permet d'annuler avec les codes remis en TR1 et TR2 : la place revient aux autres supporters, et le passager d'un trajet annulé le voit en consultant sa réservation.

## User stories

- En tant que supporter, je veux annuler ma réservation avec mon code, afin de rendre ma place à un autre.
- En tant que conducteur, je veux annuler mon trajet avec mon code de gestion, afin qu'il ne soit plus proposé ni réservé.
- En tant que supporter, je veux consulter ma réservation avec mon code, afin de savoir si mon trajet tient toujours.

## Scénarios d'acceptation

### AS1 — Annuler sa réservation

- **Étant donné** Moussa a réservé une place sur un Ndiaga Ndiaye de 38 places, qui affiche 37 places restantes
- **Quand** il annule sa réservation avec son code
- **Alors** la réservation est annulée, et le trajet affiche de nouveau 38 places restantes dans la liste des départs

### AS2 — Code inconnu

- **Étant donné** aucun code de réservation ni code de gestion « ZZZZ9999 »
- **Quand** un supporter annule ou consulte une réservation avec ce code, ou un conducteur annule un trajet avec ce code
- **Alors** la demande est refusée avec un message « introuvable », et aucun trajet ni aucune réservation ne change

### AS3 — Réservation déjà annulée

- **Étant donné** Moussa a déjà annulé sa réservation
- **Quand** il l'annule une seconde fois avec le même code
- **Alors** la demande est refusée avec un message de conflit « réservation déjà annulée », et le trajet garde 38 places restantes

### AS4 — Annuler son trajet

- **Étant donné** un trajet vers Diamniadio le 10 novembre, avec 2 réservations
- **Quand** son conducteur l'annule avec son code de gestion
- **Alors** le trajet est annulé et n'apparaît plus dans la liste des départs vers Diamniadio du 10 novembre

### AS5 — Trajet déjà annulé

- **Étant donné** un trajet déjà annulé par son conducteur
- **Quand** il l'annule une seconde fois avec le même code de gestion
- **Alors** la demande est refusée avec un message de conflit « trajet déjà annulé »

### AS6 — Consulter sa réservation

- **Étant donné** Moussa a réservé sur un trajet
- **Quand** il consulte sa réservation avec son code, avant puis après l'annulation du trajet par le conducteur
- **Alors** il voit d'abord le statut « confirmée » avec le lieu, l'heure de départ et le téléphone du conducteur, puis le statut « trajet annulé »

### AS7 — Réserver sur un trajet annulé

- **Étant donné** un trajet annulé par son conducteur, qui avait encore des places
- **Quand** un supporter y réserve une place
- **Alors** la réservation est refusée avec un message de règle métier « trajet annulé », et aucune réservation n'est enregistrée

## Hors périmètre

- Notifier les passagers par SMS ou push, rembourser, modifier un trajet ou une réservation, réattribuer un code perdu, écran.

## Questions ouvertes

- Une réservation annulée par son supporter se consulte encore, avec le statut « annulée ». Hypothèse retenue.
- On peut annuler sa réservation ou son trajet même après l'heure de départ : la tranche ne l'interdit pas. Hypothèse retenue.
- AS7 découle de « le trajet annulé disparaît » sans être écrit dans le PRD : un trajet annulé n'accepte plus de réservation. Hypothèse retenue, à confirmer.
