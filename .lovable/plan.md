# Plan backend MEL (Supabase) — analyse et proposition

Aucune modification de la base ni migration ne sera exécutée avant votre approbation.

## 1. État actuel (analyse)

- Pages : Accueil, Classement, Matchmaking, Équipes, Profil d'équipe (`/equipes/$teamId`), Historique, Profil. Toutes alimentées par des données fictives locales.
- Données fictives : 10 équipes, 3 joueurs chacune (tags `#DEMO…`), 20 matchs BO3 ; ELO, bilans et rangs dérivés de l'historique.
- Règles ELO locales (`elo.ts`) : départ 0, plancher 0, K=40 puis 24 après 10 matchs, gains/pertes calculés séparément depuis les ELO d'avant match. Testées (10 tests).
- Aucun compte, aucune sauvegarde, aucun matchmaking réel. La base Supabase est vide.

## 2. Schéma proposé

```text
auth.users 1─1 profiles
profiles 1─n team_members n─1 teams
profiles 1─n brawl_accounts (tags Brawl Stars)
teams 1─n roster_changes (journal)
teams 1─1 team_ratings (ELO, matchs validés)  ← serveur seulement
matches n─1 teams (team_a, team_b) 1─n match_rounds
matches 1─n match_reports (déclarations de chaque capitaine)
matches 1─n match_disputes
matches 1─n elo_history (une ligne par équipe et par match)
queue_entries n─1 teams (une entrée active max par équipe)
user_roles (admin, moderator)
```

Tables :
- **profiles** : id (= auth.users), pseudo unique, avatar, région (EMEA par défaut), créé/modifié.
- **user_roles** : user_id, role (`admin`, `moderator`) — table séparée, jamais sur le profil.
- **brawl_accounts** : profile_id, tag Brawl Stars (normalisé, unique), statut `non_verifie` / `verifie`.
- **teams** : nom unique, tag unique (3-4 lettres), région (`EMEA`), couleur, logo, capitaine (profile_id), statut actif/archivé.
- **team_members** : team_id, profile_id, rôle `titulaire` / `remplacant`, capitaine oui/non, date d'arrivée, date de départ. Contraintes : un joueur dans une seule équipe active ; 3 titulaires max ; remplaçants max (ex. 2).
- **roster_changes** : team_id, profile_id, action (ajout, retrait, passage titulaire/remplaçant, changement de capitaine), auteur, date. Rempli automatiquement, non modifiable.
- **team_ratings** : team_id, elo (≥ 0, défaut 0), matchs validés, victoires, défaites, version (verrou optimiste).
- **matches** : team_a, team_b (différentes), format `BO3`, statut (`planifie`, `en_cours`, `en_attente_resultat`, `conteste`, `valide`, `annule`), vainqueur, score, date, source (`matchmaking`), version.
- **match_rounds** : match_id, numéro (1-3), mode, carte, vainqueur. Cohérence BO3 vérifiée (arrêt à 2 manches gagnées).
- **match_reports** : match_id, team_id, auteur, manches déclarées, date. Une déclaration par équipe et par match.
- **match_disputes** : match_id, team_id, motif, preuves (liens), statut (`ouvert`, `resolu`, `rejete`), modérateur, décision.
- **elo_history** : match_id, team_id, elo_avant, variation, elo_apres, K utilisé. Unique (match, équipe). Non modifiable.
- **queue_entries** : team_id, lancé par, plage ELO, statut (`en_attente`, `apparie`, `annule`, `expire`), date. Une seule entrée `en_attente` par équipe.

## 3. Sécurité (RLS)

- **Lecture publique** (visiteurs) : équipes, effectifs actifs, classement (team_ratings), matchs validés, manches, elo_history, pseudos publics.
- **profiles / brawl_accounts** : chacun modifie uniquement les siens ; le statut « vérifié » est réservé aux modérateurs.
- **teams / team_members** : création par un utilisateur connecté (devient capitaine) ; modifications d'effectif par le capitaine uniquement, via fonctions serveur qui écrivent aussi `roster_changes`.
- **matches / match_rounds** : aucune écriture directe par les utilisateurs ; création par le matchmaking côté serveur.
- **match_reports** : seul un membre de l'équipe concernée peut déclarer, et seulement si le match est `en_attente_resultat`.
- **match_disputes** : ouverture par un membre d'une équipe du match ; décision par modérateur/admin.
- **team_ratings, elo_history** : lecture seule pour tous ; écriture uniquement par une fonction serveur sécurisée. Aucune politique d'écriture pour les utilisateurs.
- **queue_entries** : capitaine de l'équipe peut rejoindre/quitter ; l'appariement est fait côté serveur.
- Rôles vérifiés par une fonction `has_role` en base, jamais côté navigateur.

## 4. Calcul ELO côté serveur

Fonction en base `validate_match(match_id)`, seule autorisée à modifier l'ELO :
1. Verrouille le match et les deux `team_ratings` (`SELECT … FOR UPDATE`).
2. Vérifie statut `en_attente_resultat`, deux déclarations identiques, BO3 valide.
3. Calcule K par équipe (40 si moins de 10 matchs validés, sinon 24), gain et perte depuis les ELO d'avant match, plancher à 0 séparé.
4. Écrit `elo_history`, met à jour `team_ratings`, passe le match en `valide`.
Déclarations divergentes → statut `conteste`, résolution par modérateur qui appelle la même fonction.

## 5. Protections anti-fraude et concurrence

- Doublons : une seule entrée active en file par équipe ; un seul match non terminé par paire d'équipes ; une seule déclaration par équipe et par match ; elo_history unique (match, équipe) → un match ne peut compter deux fois.
- Validations concurrentes : verrous de ligne + contrôle de statut dans la fonction ; un second appel échoue proprement.
- Fraude : résultats et ELO non modifiables après validation (déclencheurs refusant toute modification) ; journal des effectifs et des décisions ; une équipe ne peut pas s'affronter elle-même ; un joueur ne peut pas jouer pour deux équipes.
- Membres figés au lancement du match (instantané des titulaires) pour éviter les changements d'effectif en cours de match.

## 6. Migrations prévues (dans l'ordre)

1. Profils, rôles, `has_role`, création automatique du profil à l'inscription.
2. Comptes Brawl Stars, équipes, membres, journal des effectifs + règles d'effectif.
3. `team_ratings` (ELO 0 par défaut, ≥ 0) et `elo_history`.
4. Matchs, manches, déclarations, contestations + contraintes BO3.
5. Fonction `validate_match` et verrouillage post-validation.
6. File d'attente et fonction d'appariement par plage ELO.
Chaque table : droits d'accès explicites, RLS activée, politiques, horodatages.

## 7. Implémentation progressive

1. **Comptes** : inscription/connexion e-mail, page Profil réelle (la démo reste visible pour les visiteurs).
2. **Équipes** : création, invitations, titulaires/remplaçants ; affichées à côté des équipes fictives, clairement distinguées.
3. **Classement réel** : lecture de `team_ratings` ; onglet « Démo » conservé.
4. **Matchs** : déclaration des résultats, contestation, validation serveur, historique ELO.
5. **Matchmaking réel** : file d'attente, appariement, aucune promesse de vérification automatique des matchs.
6. **Modération** : écran admin pour contestations et vérification des tags.
Les règles ELO actuelles et leurs tests seront réutilisés pour vérifier le calcul serveur. Le design et les données fictives restent inchangés.

## Détails techniques

- Logique applicative via fonctions serveur TanStack (`createServerFn`) avec authentification ; calcul ELO en fonction SQL `SECURITY DEFINER` pour l'atomicité.
- Validations temporelles via déclencheurs, pas de contraintes CHECK dépendantes du temps.
- Tags normalisés (majuscules, sans `#`) avec index unique.
- Index partiels : `queue_entries(team_id) WHERE status='en_attente'`, `team_members(profile_id) WHERE left_at IS NULL`.
