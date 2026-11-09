# 004 — Alternatives officielles

**Statut** : Validée
**PRD** : specs/prd-covoiturage.md, TR4

## Contexte

Depuis TR1, le supporter voit les départs en covoiturage vers son site, mais rien quand il n'y en a pas, ou qu'ils sont complets. Cette tranche lui montre aussi les lignes officielles qui desservent ce site (navettes JOJ, Dakar Dem Dikk), pour qu'il ait toujours une solution, sans les réserver dans l'application.

## User stories

- En tant que supporter sans véhicule, je veux voir les lignes officielles qui vont à mon site à côté des covoiturages, afin d'avoir une solution même quand aucun conducteur ne part.

## Scénarios d'acceptation

### AS1 — Voir les lignes officielles d'un site

- **Étant donné** la liste fixe contient deux lignes vers Diamniadio, une navette JOJ et une ligne Dakar Dem Dikk, et une navette JOJ vers Saly
- **Quand** un supporter consulte les départs vers Diamniadio du 10 novembre
- **Alors** il voit, avec les trajets en covoiturage, les 2 lignes officielles vers Diamniadio, chacune avec son exploitant, son nom et son point de départ ; la navette vers Saly n'y est pas

### AS2 — Lignes officielles sans aucun covoiturage

- **Étant donné** aucun trajet en covoiturage vers Diamniadio le 12 novembre
- **Quand** un supporter consulte les départs vers Diamniadio du 12 novembre
- **Alors** il voit une liste de trajets vide, et les 2 lignes officielles vers Diamniadio

### AS3 — Site sans ligne officielle

- **Étant donné** la liste fixe ne contient aucune ligne vers Dakar
- **Quand** un supporter consulte les départs vers Dakar
- **Alors** il voit les trajets en covoiturage et une liste de lignes officielles vide, sans erreur

### AS4 — Une ligne officielle ne se réserve pas

- **Étant donné** une ligne officielle de la liste
- **Quand** un supporter tente d'y réserver une place avec son identifiant
- **Alors** la réservation est refusée avec un message « trajet introuvable », comme pour un trajet inconnu, et rien n'est enregistré

## Hors périmètre

- Horaires, fréquence ou temps réel des lignes officielles ; réserver ou payer une ligne officielle ; modifier la liste depuis l'application ; écran.

## Questions ouvertes

- Contenu de la liste : je n'ai pas les vraies lignes. Les scénarios utilisent des lignes d'exemple (« Navette JOJ Dakar → Diamniadio », « Dakar Dem Dikk vers Diamniadio »), à remplacer par les données officielles que tu fourniras. Hypothèse retenue en attendant.
- Chaque ligne donne son exploitant (navette JOJ ou Dakar Dem Dikk), son nom, son point de départ et le site desservi. Hypothèse retenue.
- Les lignes officielles s'affichent quelle que soit la date demandée, faute d'horaires. Hypothèse retenue.
