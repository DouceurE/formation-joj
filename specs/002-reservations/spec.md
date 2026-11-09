# 002 — Réserver une place

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR2

## Contexte

Depuis TR1, le supporter voit les départs du jour vers son site, mais rien ne lui garde une place. Cette tranche lui permet d'en réserver une, et lui donne le téléphone du conducteur pour fixer le rendez-vous, sans passer par les groupes WhatsApp.

## User stories

- En tant que supporter sans véhicule, je veux réserver une place sur un départ vers mon site, afin d'être sûr d'y arriver à l'heure de mon épreuve.
- En tant que supporter, je veux recevoir un code de réservation et le téléphone du conducteur, afin de convenir du rendez-vous avec lui.

## Scénarios d'acceptation

### AS1 — Réserver une place

- **Étant donné** nous sommes le 9 novembre 2026 à 9 h, et un Ndiaga Ndiaye de 38 places part de Pikine vers Diamniadio le 10 novembre à 8 h, conducteur 77 123 45 67
- **Quand** Moussa (78 555 66 77) y réserve une place
- **Alors** il reçoit un code de réservation, le lieu et l'heure de départ et le téléphone du conducteur, et le trajet affiche 37 places restantes dans la liste des départs

### AS2 — Trajet complet refusé

- **Étant donné** un taxi d'une seule place, déjà réservée
- **Quand** un autre supporter y réserve une place
- **Alors** la réservation est refusée avec un message de conflit « trajet complet », et le trajet garde 1 réservation et 0 place restante

### AS3 — Deux réservations simultanées sur la dernière place

- **Étant donné** un trajet dont il reste 1 place
- **Quand** deux supporters la réservent au même instant
- **Alors** une seule réservation réussit, l'autre est refusée avec le message « trajet complet », et il reste 0 place

### AS4 — Même téléphone sur le même trajet refusé

- **Étant donné** Moussa a déjà réservé sur le Ndiaga Ndiaye avec le 78 555 66 77
- **Quand** il réserve à nouveau sur ce trajet avec le 785556677
- **Alors** la réservation est refusée avec un message de conflit, et le trajet garde 37 places restantes ; le même téléphone peut réserver sur un autre trajet

### AS5 — Trajet déjà parti refusé

- **Étant donné** nous sommes le 10 novembre 2026 à 9 h, et un trajet est parti le 10 novembre à 8 h 59
- **Quand** un supporter y réserve une place
- **Alors** la réservation est refusée avec un message de règle métier « trajet déjà parti », et aucune réservation n'est enregistrée ; un trajet qui part à 9 h pile est encore réservable

### AS6 — Trajet inconnu

- **Étant donné** aucun trajet avec cet identifiant
- **Quand** un supporter y réserve une place
- **Alors** la réservation est refusée avec un message « trajet introuvable », et rien n'est enregistré

### AS7 — Nom ou téléphone manquant

- **Étant donné** un trajet à venir avec des places libres
- **Quand** un supporter réserve sans nom, ou sans téléphone
- **Alors** la réservation est refusée avec un message de validation qui nomme le champ en cause, et les places restantes ne changent pas

## Hors périmètre

- Annuler une réservation avec son code (TR3), notifier le conducteur, payer, refuser au conducteur de réserver sur son propre trajet, écran.

## Questions ouvertes

- Téléphone : deux numéros sont le même une fois les espaces retirés (78 555 66 77 = 785556677). Hypothèse retenue.
- Code de réservation : 8 caractères, comme le code de gestion, distinct pour chaque réservation. Hypothèse retenue.
- Départ « parti » : seul un départ antérieur à l'instant de la réservation est refusé, comme la publication de TR1. Hypothèse retenue.
