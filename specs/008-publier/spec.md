# 008 — Publier

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR8

## Contexte

Depuis TR1 et TR5, l'API publie un trajet, et sait même lire une annonce WhatsApp, mais un conducteur n'a aucun écran pour le faire. Cette tranche lui donne un formulaire où il choisit son véhicule, ou la possibilité de coller son annonce et de relire ce que l'assistant en a compris, puis un code de gestion pour annuler son trajet s'il ne part plus.

## User stories

- En tant que conducteur (particulier, taxi ou Ndiaga Ndiaye), je veux publier mon trajet en quelques champs ou en collant mon annonce WhatsApp, afin que les supporters voient mes places sans que je relance les groupes.
- En tant que conducteur, je veux annuler mon trajet avec mon code de gestion, afin que les passagers sachent qu'il ne part plus.

## Scénarios d'acceptation

### AS1 — Publier par le formulaire

- **Étant donné** un conducteur sur l'écran « Publier un trajet »
- **Quand** il choisit Ndiaga Ndiaye, saisit Pikine, Diamniadio, le 10 novembre 2026 à 8 h, 38 places, 500 FCFA et le 77 123 45 67, puis touche « Publier »
- **Alors** il voit « Dem na ! » et son code de gestion, et le trajet apparaît dans les départs vers Diamniadio du 10 novembre avec 38 places restantes

### AS2 — Les règles de la publication, en clair

- **Étant donné** l'écran « Publier un trajet »
- **Quand** le conducteur choisit voiture ou taxi, puis Ndiaga Ndiaye ; ou que l'API refuse un nombre de places hors limites ou un départ dans le passé ; ou qu'un champ manque
- **Alors** le champ des places propose au plus 4 places pour une voiture ou un taxi et au plus 38 pour un Ndiaga Ndiaye ; un refus s'affiche sans jargon (« Une voiture ou un taxi a 4 places au plus. », « Ce départ est déjà passé. ») ; un champ manquant est nommé ; rien n'est publié

### AS3 — Publier depuis une annonce WhatsApp, après relecture

- **Étant donné** un conducteur qui colle « je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places »
- **Quand** il touche « Lire mon annonce »
- **Alors** le formulaire se remplit avec ce que l'assistant a compris (Ndiaga Ndiaye, Pikine, Diamniadio, l'heure, 38 places) ; rien n'est publié tant qu'il n'a pas relu, complété le prix et son téléphone, et touché « Publier », qui mène à « Dem na ! » comme en AS1

### AS4 — Annonce que l'assistant ne sait pas lire

- **Étant donné** un conducteur qui colle son annonce
- **Quand** l'assistant n'y trouve pas de site parmi Dakar, Diamniadio et Saly, ou pas d'heure de départ, ou ne répond pas
- **Alors** l'écran le dit en clair (« Je n'ai pas trouvé le site… », « Je n'ai pas trouvé l'heure… », « L'assistant ne répond pas, remplis le formulaire. »), le formulaire reste disponible et rien n'est publié

### AS5 — Annuler son trajet avec son code de gestion

- **Étant donné** un trajet publié avec son code de gestion
- **Quand** le conducteur saisit ce code sur « Annuler mon trajet » et confirme
- **Alors** il voit « Trajet annulé », et le trajet disparaît des départs ; un code inconnu affiche « Aucun trajet avec ce code. », et un trajet déjà annulé « Ce trajet est déjà annulé. »

### AS6 — Accessible et sobre en animations

- **Étant donné** un téléphone qui demande moins d'animations
- **Quand** le conducteur publie, lit une annonce et annule un trajet
- **Alors** rien ne s'anime mais tout s'affiche ; l'audit d'accessibilité ne relève aucune erreur à chaque étape, et chaque cible tactile mesure au moins 44 px

## Hors périmètre

- Modifier un trajet publié, voir ses passagers (vue « mes trajets » du conducteur), retrouver un code de gestion perdu, notifier les passagers, nouvelle dépendance.

## Questions ouvertes

- L'en-tête reçoit un lien « Publier » ; « Annuler mon trajet » est une partie de cet écran. Le code de gestion s'affiche avec « Copier le code », comme le billet de TR7, sans être gardé dans le téléphone. Hypothèses retenues.
