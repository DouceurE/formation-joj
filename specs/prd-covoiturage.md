# PRD — Covoiturage JOJ

**Statut** : Validé

## Problème

Pendant les JOJ Dakar 2026, un supporter doit rejoindre un site (Dakar, Diamniadio, Saly) à une heure précise, alors que les navettes sont pleines et les taxis chers. Des conducteurs de voitures, de taxis et de Ndiaga Ndiaye partent vers le même site avec des places vides. Ils se cherchent aujourd'hui sur des groupes WhatsApp où les annonces se perdent dans le flot des messages.

## Utilisateurs

- Supporter sans véhicule : trouver un départ vers son site, à l'heure de son épreuve, et y réserver une place.
- Conducteur qui se rend sur un site (particulier, chauffeur de taxi ou de Ndiaga Ndiaye) : proposer ses places vides sans relancer son annonce dans plusieurs groupes.

## Proposition

Une application web mobile gratuite, ouverte par un lien partagé sur WhatsApp, sans installation : elle part de l'outil que conducteurs et supporters utilisent déjà. Le conducteur publie son trajet en précisant son type de véhicule (voiture, taxi, Ndiaga Ndiaye) ; le supporter trouve les départs d'une journée vers son site. Contrairement à un groupe de discussion, chaque trajet reste visible, classé par site et par heure, avec ses places restantes. Aucun paiement ne passe par l'application : le conducteur affiche un prix par place (participation aux frais pour un particulier, tarif pour un taxi ou un Ndiaga Ndiaye), réglé à la descente en espèces ou par Wave. Les lignes officielles (navettes JOJ, Dakar Dem Dikk) sont affichées comme alternatives, sans réservation. Plus tard, le conducteur pourra coller son annonce WhatsApp telle quelle : un assistant IA en extrait le trajet.

## Mesure du succès

Pendant la démo, je publie un Ndiaga Ndiaye de 38 places Pikine → Diamniadio, il apparaît dans les départs du jour avec les navettes JOJ et Dakar Dem Dikk en alternative ; une voiture à 5 places et un départ passé sont refusés ; un supporter réserve, les places restantes baissent, une double réservation est refusée ; il annule et la place revient ; enfin un message WhatsApp collé devient un trajet publié.

## Tranches

### TR1 — Publier un trajet et lister les départs vers un site

Le conducteur publie un trajet : type de véhicule (voiture, taxi, Ndiaga Ndiaye), lieu de départ, site parmi les trois sites des JOJ, heure de départ, nombre de places, prix par place (affiché tel quel) et son téléphone. La publication lui renvoie un code de gestion du trajet. Le supporter consulte les trajets vers un site pour une journée, triés par heure de départ, avec les places restantes. Règles : le nombre de places dépend du véhicule (voiture et taxi : 1 à 4, Ndiaga Ndiaye : 1 à 38) ; un départ dans le passé est refusé.

### TR2 — Réserver une place

Le supporter réserve une place avec son nom et son téléphone. Il reçoit un code de réservation et voit le téléphone du conducteur pour fixer le rendez-vous. Règles : un trajet complet est refusé ; un même téléphone ne réserve pas deux fois le même trajet ; un trajet déjà parti ne peut pas être réservé.

### TR3 — Annuler

Le supporter annule sa réservation avec son code : la place redevient disponible. Le conducteur annule son trajet avec son code de gestion : il disparaît de la liste, et ses passagers voient « trajet annulé » en consultant leur réservation.

### TR4 — Alternatives officielles

Sous la liste des départs vers un site, l'application affiche les lignes officielles qui y vont (navettes JOJ, Dakar Dem Dikk), depuis une liste fixe. Elles ne se réservent pas dans l'application.

### TR5 — Publier un trajet depuis un message libre

Le conducteur colle un message libre (« je pars de Pikine pour Diamniadio demain 8h, Ndiaga 38 places »). Un assistant IA en extrait le trajet. L'assistant ne publie jamais directement : il propose le trajet extrait (type de véhicule, lieu de départ, site, heure, places, prix), que le conducteur relit, corrige si besoin, puis confirme. La publication passe alors par celle de TR1, avec ses règles. Un message dont l'assistant ne peut pas extraire un site parmi les trois ou une heure de départ est refusé avec un message clair, sans rien publier.

## Hors périmètre

- Paiement dans l'application, commission ; notifications SMS ou push, suivi en temps réel, notation des conducteurs, messagerie ; réservation dans les navettes JOJ ou les bus Dakar Dem Dikk.

## Hypothèses et risques

- Hypothèses : les sites se limitent à Dakar, Diamniadio et Saly ; un Ndiaga Ndiaye compte au plus 38 places, une voiture ou un taxi au plus 4 passagers ; le supporter est reconnu par son téléphone pour empêcher la double réservation ; les chauffeurs de Ndiaga Ndiaye publieraient leur départ pour être vus et se remplir plus vite, même si peu de places sont réservées à l'avance. Risques : les chauffeurs de taxi et de Ndiaga Ndiaye doivent accepter de publier leurs départs, et sans offre il n'y a rien à réserver ; sans notification, un passager ne voit l'annulation que s'il consulte sa réservation ; si l'assistant interprète mal une heure (« demain », « 8h »), le trajet proposé serait faux : la revalidation ne détecte qu'un départ passé ou un nombre de places invalide, mais la relecture par le conducteur avant confirmation réduit ce risque.
