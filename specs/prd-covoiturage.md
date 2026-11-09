# PRD — Covoiturage JOJ

**Statut** : Validé

## Problème

Pendant les JOJ Dakar 2026, un supporter doit rejoindre un site (Dakar, Diamniadio, Saly) à une heure précise, alors que les navettes sont pleines et les taxis chers. Des conducteurs de voitures, de taxis et de Ndiaga Ndiaye partent vers le même site avec des places vides. Ils se cherchent aujourd'hui sur des groupes WhatsApp où les annonces se perdent dans le flot des messages.

## Utilisateurs

- Supporter sans véhicule : trouver un départ vers son site, à l'heure de son épreuve, et y réserver une place.
- Conducteur qui se rend sur un site (particulier, chauffeur de taxi ou de Ndiaga Ndiaye) : proposer ses places vides sans relancer son annonce dans plusieurs groupes.

## Proposition

Une application web mobile gratuite, ouverte par un lien partagé sur WhatsApp, sans installation : elle part de l'outil que conducteurs et supporters utilisent déjà. Le conducteur publie son trajet en précisant son type de véhicule (voiture, taxi, Ndiaga Ndiaye) ; le supporter trouve les départs d'une journée vers son site. Contrairement à un groupe de discussion, chaque trajet reste visible, classé par site et par heure, avec ses places restantes. Aucun paiement ne passe par l'application : le conducteur affiche un prix par place (participation aux frais pour un particulier, tarif pour un taxi ou un Ndiaga Ndiaye), réglé à la descente en espèces ou par Wave. Les lignes officielles (navettes JOJ, Dakar Dem Dikk) sont affichées comme alternatives, sans réservation. Plus tard, le conducteur pourra coller son annonce WhatsApp telle quelle : un assistant IA en extrait le trajet. Une interface Dem, pensée pour WhatsApp sur Android, qu'on sent sénégalaise : logo JOJ et mascotte Ayo (apps/web/public/cojoj1.webp, mascotte.webp), frise des cars rapides, touches de wolof.

## Mesure du succès

Pendant la démo, je publie un Ndiaga Ndiaye de 38 places Pikine → Diamniadio, il apparaît dans les départs du jour avec les navettes JOJ et Dakar Dem Dikk en alternative ; une voiture à 5 places et un départ passé sont refusés ; un supporter réserve, les places restantes baissent, une double réservation est refusée ; il annule et la place revient ; enfin un message WhatsApp collé devient un trajet publié. Sur l'interface : un visiteur arrivé par le lien réserve un départ en 3 touches au plus (accueil, « Voir les départs », « Réserver ») ; le premier écran s'affiche en moins de 3 secondes sur un réseau 4G lent simulé ; après avoir fermé la page, il retrouve sa réservation dans « Mes trajets ».

## Tranches

### TR1 — Publier un trajet et lister les départs vers un site : Le conducteur publie un trajet : type de véhicule (voiture, taxi, Ndiaga Ndiaye), lieu de départ, site parmi les trois sites des JOJ, heure de départ, nombre de places, prix par place (affiché tel quel) et son téléphone. La publication lui renvoie un code de gestion du trajet. Le supporter consulte les trajets vers un site pour une journée, triés par heure de départ, avec les places restantes. Règles : le nombre de places dépend du véhicule (voiture et taxi : 1 à 4, Ndiaga Ndiaye : 1 à 38) ; un départ dans le passé est refusé.

### TR2 — Réserver une place : Le supporter réserve une place avec son nom et son téléphone. Il reçoit un code de réservation et voit le téléphone du conducteur pour fixer le rendez-vous. Règles : un trajet complet est refusé ; un même téléphone ne réserve pas deux fois le même trajet ; un trajet déjà parti ne peut pas être réservé.

### TR3 — Annuler : Le supporter annule sa réservation avec son code : la place redevient disponible. Le conducteur annule son trajet avec son code de gestion : il disparaît de la liste, et ses passagers voient « trajet annulé » en consultant leur réservation.

### TR4 — Alternatives officielles : Sous la liste des départs vers un site, l'application affiche les lignes officielles qui y vont (navettes JOJ, Dakar Dem Dikk), depuis une liste fixe. Elles ne se réservent pas dans l'application.

### TR5 — Publier un trajet depuis un message libre : Le conducteur colle un message libre (« je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places »). Un assistant IA en extrait le trajet. L'assistant ne publie jamais directement : il propose le trajet extrait (type de véhicule, lieu de départ, site, heure, places, prix), que le conducteur relit, corrige si besoin, puis confirme. La publication passe alors par celle de TR1, avec ses règles. Un message dont l'assistant ne peut pas extraire un site parmi les trois ou une heure de départ est refusé avec un message clair, sans rien publier.

### TR6 — Accueil et départs : Une page d'accueil Dem (accroche en une phrase, action principale « Voir les départs » répétée en bas, « comment ça marche » en trois étapes, réponses aux doutes : gratuit, sans installation, prix réglé au chauffeur), puis les départs d'un site pour un jour avec les lignes officielles en alternative. Le premier écran s'affiche en moins de 3 secondes sur une 4G lente ; les images sont en WebP compressé.

### TR7 — Réserver et suivre : Le supporter réserve en 3 touches au plus depuis l'accueil ; un billet se retourne pour révéler son code, avec « Jërëjëf ! », « Copier le code » et « Envoyer sur WhatsApp ». Le code est gardé dans le téléphone : « Mes trajets » retrouve la réservation même si la page a été fermée, montre si elle tient ou si le trajet est annulé, et permet de l'annuler.

### TR8 — Publier : Le conducteur publie par un formulaire où il choisit son véhicule, ou en collant son annonce WhatsApp, qu'il relit et corrige avant de confirmer ; « Dem na ! » salue la publication et lui remet son code de gestion, avec lequel il peut annuler son trajet.

## Hors périmètre

- Paiement dans l'application, commission ; notifications SMS ou push, suivi en temps réel, notation des conducteurs, messagerie ; réservation dans les navettes JOJ ou les bus Dakar Dem Dikk ; application à installer, comptes et mots de passe, mode hors connexion, traduction complète en wolof.

## Hypothèses et risques

- Hypothèses : les sites se limitent à Dakar, Diamniadio et Saly ; un Ndiaga Ndiaye compte au plus 38 places, une voiture ou un taxi au plus 4 passagers ; le supporter est reconnu par son téléphone pour empêcher la double réservation ; les chauffeurs de Ndiaga Ndiaye publieraient leur départ pour être vus et se remplir plus vite, même si peu de places sont réservées à l'avance ; le détail de la charte de l'interface (couleurs, polices, frise, animations) est fixé dans les specs de TR6 à TR8. Risques : les chauffeurs de taxi et de Ndiaga Ndiaye doivent accepter de publier leurs départs, et sans offre il n'y a rien à réserver ; sans notification, un passager ne voit l'annulation que s'il consulte sa réservation ; si l'assistant interprète mal une heure (« demain », « 8h »), le trajet proposé serait faux : la revalidation ne détecte qu'un départ passé ou un nombre de places invalide, mais la relecture par le conducteur avant confirmation réduit ce risque ; le logo officiel des JOJ et la mascotte Ayo sont des marques, dont l'usage au-delà de l'atelier demande une autorisation ; un code gardé dans le téléphone se perd si le supporter change d'appareil ou efface ses données de navigation.
