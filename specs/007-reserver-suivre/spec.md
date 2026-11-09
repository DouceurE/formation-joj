# 007 — Réserver et suivre

**Statut** : Implémentée
**PRD** : specs/prd-covoiturage.md, TR7

## Contexte

Depuis TR6, le supporter voit les départs vers son site, mais « Réserver » ne mène encore nulle part, et un code noté à la va-vite se perd. Cette tranche lui fait réserver en quelques touches, lui remet un billet qu'il peut copier ou s'envoyer sur WhatsApp, et lui fait retrouver ses réservations dans « Mes trajets », même après avoir fermé la page.

## User stories

- En tant que supporter, je veux réserver une place depuis un départ et recevoir un billet avec mon code, afin d'être sûr d'avoir ma place et de pouvoir la retrouver.
- En tant que supporter, je veux retrouver mes réservations dans « Mes trajets » et les annuler, afin de savoir si mon trajet tient et de rendre ma place si je ne viens plus.

## Scénarios d'acceptation

### AS1 — Ouvrir la réservation en 3 touches

- **Étant donné** un supporter sur l'accueil, et un Ndiaga Ndiaye Pikine → Diamniadio à 10 h, 500 FCFA, 30 places restantes
- **Quand** il touche « Voir les départs », choisit Diamniadio, puis « Réserver » sur ce départ
- **Alors** il voit, en 3 touches, la route de Pikine à Diamniadio qui se dessine avec le véhicule qui la parcourt, l'heure 10:00, Ndiaga Ndiaye, 500 FCFA, « 30 places restantes » en grand, et un formulaire nom et téléphone

### AS2 — Réserver sa place et retourner le billet

- **Étant donné** l'écran de réservation d'AS1
- **Quand** Moussa saisit son nom et le 78 555 66 77, touche « Réserver ma place », puis touche le billet
- **Alors** le compteur passe à 29 places restantes, un billet « Votre place est gardée » apparaît, puis se retourne et montre le code de réservation, le point et l'heure de départ, le téléphone du chauffeur et « Jërëjëf ! »

### AS3 — Copier le code ou l'envoyer sur WhatsApp

- **Étant donné** le billet retourné d'AS2
- **Quand** Moussa touche « Copier le code », puis « Envoyer sur WhatsApp »
- **Alors** le code est copié et l'écran confirme « Code copié » ; WhatsApp s'ouvre avec un message qui contient le code, le point et l'heure de départ

### AS4 — Les refus en clair

- **Étant donné** l'écran de réservation d'un départ
- **Quand** l'API refuse parce que le trajet est complet, que ce téléphone a déjà réservé ce trajet, ou que le trajet est déjà parti ; ou que le nom ou le téléphone manque
- **Alors** l'écran affiche, sans jargon, « Ce trajet est complet. », « Ce téléphone a déjà réservé ce trajet. », « Ce trajet est déjà parti. », ou le champ à remplir ; aucun billet n'apparaît et le compteur ne change pas

### AS5 — Retrouver ses trajets, ou les oublier

- **Étant donné** Moussa a réservé, puis fermé la page
- **Quand** il ouvre « Mes trajets », ou y saisit un code de réservation
- **Alors** il voit sa réservation avec son statut « Confirmée », l'heure et le point de départ ; un code inconnu affiche « Aucune réservation avec ce code. » ; « Oublier ce trajet » la retire de la liste du téléphone sans l'annuler

### AS6 — Annuler, ou voir un trajet annulé

- **Étant donné** une réservation dans « Mes trajets »
- **Quand** Moussa touche « Annuler » et confirme ; ou que le conducteur a annulé le trajet
- **Alors** sa réservation passe à « Annulée » et la place revient au trajet ; si c'est le conducteur, « Trajet annulé » s'affiche en rouge latérite avec un lien vers les autres départs

### AS7 — Accessible et sobre en animations

- **Étant donné** un téléphone qui demande moins d'animations
- **Quand** Moussa réserve, retourne son billet et ouvre « Mes trajets »
- **Alors** ni la route, ni le compteur, ni le billet ne s'animent, mais toutes les informations s'affichent ; l'audit d'accessibilité ne relève aucune erreur à chaque étape, et chaque cible tactile mesure au moins 44 px

## Hors périmètre

- Publier un trajet (TR8), vérifier l'identité au moment d'annuler (un téléphone en main suffit), notifications, carte réelle (la route est un dessin), nouvelle dépendance.

## Questions ouvertes

- Les 3 touches comptent la navigation jusqu'au formulaire (« Voir les départs », site, « Réserver ») ; la saisie et « Réserver ma place » n'en font pas partie. Décision retenue.
