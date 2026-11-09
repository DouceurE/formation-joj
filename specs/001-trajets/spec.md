# 001 — Publier un trajet et lister les départs vers un site

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR1

## Contexte

Pendant les JOJ, supporters et conducteurs se cherchent sur des groupes WhatsApp où les annonces se perdent. Cette tranche donne à chaque trajet une place durable : le conducteur le publie une fois, et le supporter retrouve les départs d'une journée vers son site, classés par heure.

## User stories

- En tant que conducteur (particulier, taxi ou Ndiaga Ndiaye), je veux publier mon trajet vers un site, afin que les supporters voient mes places vides sans que je relance mon annonce.
- En tant que supporter sans véhicule, je veux voir les départs d'une journée vers mon site, triés par heure, afin de trouver celui qui m'amène à l'heure de mon épreuve.

## Scénarios d'acceptation

### AS1 — Publier un trajet et recevoir son code de gestion

- **Étant donné** nous sommes le 9 novembre 2026 à 9 h
- **Quand** un conducteur publie un Ndiaga Ndiaye de 38 places, de Pikine vers Diamniadio, le 10 novembre 2026 à 8 h, prix 500 FCFA, téléphone 77 123 45 67
- **Alors** le trajet est enregistré avec 38 places restantes, et la réponse donne au conducteur un code de gestion du trajet

### AS2 — Nombre de places refusé selon le véhicule

- **Étant donné** un conducteur qui publie un trajet à venir
- **Quand** il indique 5 places pour une voiture ou un taxi, 39 places pour un Ndiaga Ndiaye, ou 0 place pour n'importe quel véhicule
- **Alors** la publication est refusée : refus 400 avec le code SEATS_OUT_OF_RANGE, et aucun trajet n'est créé ; 4 places pour une voiture et 38 pour un Ndiaga Ndiaye sont acceptées

### AS3 — Départ dans le passé refusé

- **Étant donné** nous sommes le 9 novembre 2026 à 9 h
- **Quand** un conducteur publie un trajet qui part le 9 novembre 2026 à 8 h 59
- **Alors** la publication est refusée : refus 422 avec le code DEPARTURE_IN_PAST, et aucun trajet n'est créé ; un départ le 9 novembre 2026 à 9 h pile est accepté

### AS4 — Site, véhicule ou champ obligatoire refusé

- **Étant donné** un conducteur qui publie un trajet à venir
- **Quand** le site n'est ni Dakar, ni Diamniadio, ni Saly, ou le véhicule n'est ni une voiture, ni un taxi, ni un Ndiaga Ndiaye, ou le lieu de départ, le prix ou le téléphone manque, ou le prix est négatif ou non entier
- **Alors** la publication est refusée : refus 400 avec le code VALIDATION_FAILED, le format d'erreur de validation du module de référence, qui nomme le champ en cause, et aucun trajet n'est créé ; un prix de 0 FCFA (gratuit) est accepté

### AS5 — Lister les départs d'une journée vers un site

- **Étant donné** nous sommes le 10 novembre 2026 à 9 h, avec des trajets vers Diamniadio le 10 novembre à 10 h et à 8 h (déjà parti), un vers Diamniadio le 11 novembre et un vers Saly le 10 novembre
- **Quand** un supporter consulte les départs vers Diamniadio du 10 novembre (date du calendrier à Dakar, heure GMT)
- **Alors** il voit 2 trajets, celui de 8 h en premier même s'il est déjà parti, chacun avec son véhicule, son lieu de départ, son heure, son prix en FCFA et ses places restantes ; ni le téléphone du conducteur ni le code de gestion n'y figurent

### AS6 — Journée sans départ

- **Étant donné** aucun trajet vers Saly le 12 novembre
- **Quand** un supporter consulte les départs vers Saly du 12 novembre
- **Alors** il reçoit une liste vide, sans erreur

## Hors périmètre

- Réserver (TR2), annuler un trajet avec son code de gestion (TR3), lignes officielles (TR4), publication depuis un message libre (TR5), écran.
- Tout calcul sur le prix : c'est un nombre entier de FCFA, 0 ou plus (0 = gratuit), affiché tel quel avec « FCFA ».

## Questions ouvertes

- Aucune : les décisions sur le prix, la journée et le départ à l'instant même sont reportées dans les scénarios.
