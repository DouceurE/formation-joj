# 006 — Accueil et départs

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR6

## Contexte

Les supporters arrivent depuis un lien WhatsApp, sur un Android d'entrée de gamme, et décident en quelques secondes s'ils font confiance à Dem. Cette tranche leur donne le premier écran du service : un accueil qui dit à quoi il sert, puis les départs du jour vers leur site, avec les lignes officielles en recours.

## User stories

- En tant que supporter arrivé par un lien WhatsApp, je veux comprendre tout de suite ce que propose Dem, afin de décider de l'utiliser.
- En tant que supporter sans véhicule, je veux voir les départs d'un jour vers mon site et les lignes officielles, afin de choisir comment y aller.

## Charte

Vert baobab #0B5D3B dominant, jaune soleil #F2B51D en accent, rouge latérite #D64933 pour les erreurs (#B83A27 sous du texte blanc), bleu Atlantique #1C6E8C pour les lignes officielles, fond sable #FBF7EF, texte #14261C ; titres en Bricolage Grotesque 800, texte en Inter ; une frise de triangles inspirée des cars rapides sous l'en-tête ; logo JOJ Dakar 2026 et mascotte Ayo affichés sans modification.

## Scénarios d'acceptation

### AS1 — L'accueil dit le service en une phrase

- **Étant donné** un supporter qui ouvre le lien de Dem
- **Quand** l'accueil s'affiche
- **Alors** il voit le logo JOJ, la mascotte Ayo, la frise, une accroche d'une seule phrase, l'action « Voir les départs » en haut et répétée en bas, « comment ça marche » en trois étapes, et trois réponses aux doutes : gratuit, sans installation, prix réglé au chauffeur

### AS2 — Voir les départs d'un site pour un jour

- **Étant donné** deux trajets vers Diamniadio le 10 novembre, à 10 h et à 8 h, et un vers Saly
- **Quand** le supporter touche « Voir les départs », choisit Diamniadio et le 10 novembre
- **Alors** il voit 2 départs, celui de 8 h en premier, chacun avec son véhicule, son lieu de départ, son heure, son prix en FCFA et ses places restantes ; le trajet vers Saly n'y est pas

### AS3 — Les lignes officielles en alternative

- **Étant donné** les départs vers Diamniadio affichés
- **Quand** le supporter descend sous la liste
- **Alors** il voit la navette JOJ et la ligne Dakar Dem Dikk vers Diamniadio, en bleu Atlantique, chacune marquée « ne se réserve pas ici »

### AS4 — Journée sans départ

- **Étant donné** aucun covoiturage vers Saly le 12 novembre
- **Quand** le supporter consulte Saly pour le 12 novembre
- **Alors** il lit « Aucun départ ce jour-là », une invitation à choisir un autre jour, et voit toujours les lignes officielles vers Saly

### AS5 — Départs impossibles à charger

- **Étant donné** le service des départs ne répond pas
- **Quand** le supporter consulte un site
- **Alors** il voit un message d'erreur en rouge latérite et un bouton « Réessayer », jamais un écran blanc ; « Réessayer » relance le chargement

### AS6 — Accessible et sobre en animations

- **Étant donné** un téléphone qui demande moins d'animations
- **Quand** le supporter parcourt l'accueil et les départs
- **Alors** aucun élément ne s'anime et tout le contenu reste visible ; sur chaque écran, l'audit d'accessibilité ne relève aucune erreur, les textes respectent le contraste AA et chaque cible tactile mesure au moins 44 px

### AS7 — Premier écran rapide

- **Étant donné** un réseau 4G lent simulé
- **Quand** le supporter ouvre le lien
- **Alors** l'accueil s'affiche en moins de 3 secondes, et les images sont en WebP compressé

## Hors périmètre

- Réserver une place et « Mes trajets » (TR7), publier un trajet (TR8), choisir une autre langue que le français avec touches de wolof, mode hors connexion.

## Questions ouvertes

- Accroche proposée : « Trouve une place vers ton site des JOJ, partagée sur WhatsApp. » Hypothèse retenue, à remplacer par ta phrase.
- Le jour proposé par défaut est aujourd'hui, à Dakar, et le site n'a pas de valeur par défaut ; chaque départ affiche déjà « Réserver », qui mènera à TR7 sans encore réserver. Hypothèses retenues.
