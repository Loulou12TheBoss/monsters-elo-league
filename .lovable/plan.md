# Plan backend MEL (Supabase) — version complétée

Aucune modification de la base ni migration ne sera exécutée avant votre approbation explicite.

## 1. État actuel

- Pages : Accueil, Classement, Matchmaking, Équipes, Profil d'équipe, Historique, Profil — toutes alimentées par des données fictives locales (10 équipes, 30 joueurs `#DEMO…`, 20 matchs BO3).
- Règles ELO locales testées (10 tests). Aucun compte, aucune sauvegarde, aucun matchmaking réel. Base Supabase vide.

## 2. Schéma

```text
auth.users 1─1 profiles ─1─n brawl_accounts
profiles n─n teams via team_members ; team_invitations ; roster_changes (journal)
teams 1─1 team_ratings (ELO, serveur seulement)
matches (team_a, team_b) 1─n match_rounds, match_reports, match_disputes, elo_history
match_lineups (titulaires figés au lancement)
queue_entries n─1 teams
user_roles (admin, moderator) ; app_settings (limites d'effectif)
```

- **profiles** : pseudo unique, avatar, région (EMEA). Données privées (e-mail) restent dans auth, jamais copiées.
- **user_roles** : user_id, role — table séparée.
- **app_settings** : max_titulaires (3), max_remplacants (2), délai de déclaration, délai d'expiration des invitations. Modifiable par admin uniquement.
- **brawl_accounts** : tag normalisé unique, statut `non_verifie`/`verifie`.
- **teams** : nom et tag uniques, région EMEA, couleur, logo, capitaine, statut actif/archivé.
- **team_members** : rôle `titulaire`/`remplacant`, `joined_at`, `left_at`.
- **team_invitations** : team_id, invité (profile_id), invité par, statut (`en_attente`, `acceptee`, `refusee`, `annulee`, `expiree`), expiration.
- **roster_changes** : journal non modifiable (ajout, retrait, changement de rôle, transfert de capitaine, auteur, date).
- **team_ratings** : elo ≥ 0 (défaut 0), matchs classés validés, V, D.
- **matches** : statut (`en_cours`, `en_attente_resultat`, `conteste`, `valide`, `annule`, `forfait`), vainqueur, score, version.
- **match_lineups** : instantané des titulaires de chaque équipe au lancement.
- **match_rounds**, **match_reports** (une par équipe), **match_disputes**, **elo_history** (unique match+équipe, non modifiable), **queue_entries**.

## 3. Invitations et effectifs

- Le capitaine invite un joueur ; seul l'invité peut accepter ou refuser ; le capitaine peut annuler. Expiration automatique.
- Acceptation via fonction serveur : vérifie invitation valide, joueur sans équipe active, places disponibles ; ajoute en remplaçant (ou titulaire si place libre) ; journalise.
- Le capitaine change titulaire/remplaçant et retire un membre, dans les limites de `app_settings` ; impossible pendant un match actif de l'équipe.
- Un joueur peut quitter l'équipe (sauf capitaine sans transfert préalable).
- **Transfert de capitaine** : fonction serveur, réservée au capitaine actuel, vers un membre actif ; atomique, journalisée.
- **Une seule équipe active par joueur** : index unique partiel `team_members(profile_id) WHERE left_at IS NULL` — fiable même en simultané.

## 4. Matchs simultanés et concurrence

- **Un seul match classé actif par équipe** : table `active_match_slots(team_id PRIMARY KEY, match_id)` remplie à la création du match, vidée à la clôture. Deux créations simultanées → la seconde échoue sur la clé primaire.
- **Double appariement** : la fonction d'appariement verrouille les entrées de file (`FOR UPDATE SKIP LOCKED`), passe les deux à `apparie` et crée le match dans une seule transaction. Une seule entrée `en_attente` par équipe (index partiel). Une équipe en match ne peut pas rejoindre la file.
- **Validations concurrentes** : `validate_match` verrouille le match et les deux `team_ratings`, vérifie le statut ; un second appel échoue. `elo_history` unique (match, équipe) → jamais compté deux fois.
- Une équipe ne peut pas s'affronter elle-même (contrainte).

## 5. Résultats, abandons, annulations, contestations

- **Déclaration** : chaque équipe déclare les manches. Deux déclarations identiques et BO3 valide → validation automatique.
- **Divergence** → `conteste`. Un modérateur tranche : fixe le résultat (validation, ELO appliqué) ou annule.
- **Absence de déclaration adverse** après le délai configuré → l'équipe ayant déclaré peut ouvrir une contestation ; pas de validation automatique sur une seule déclaration.
- **Forfait** (abandon déclaré par une équipe ou constaté par modérateur) : compté comme victoire 2-0 de l'adversaire, ELO appliqué normalement, compte comme match classé validé.
- **Annulé** (accord des deux équipes avant toute manche, ou décision de modérateur) : aucun effet sur l'ELO ni le compteur K.
- Après validation, résultat et ELO verrouillés (déclencheurs). Correction exceptionnelle : admin uniquement, via fonction qui annule la ligne ELO par une écriture compensatoire journalisée (pas de modification silencieuse). Les matchs postérieurs ne sont pas recalculés (limite assumée, voir §10).

## 6. Règles ELO (serveur)

- Départ 0, plancher 0.
- K = 40 si l'équipe a moins de 10 matchs classés **validés** (forfaits inclus, annulés exclus), sinon 24 — K propre à chaque équipe.
- Gain et perte calculés depuis les ELO d'avant match ; plancher appliqué séparément à chaque équipe.
- Seuls `valide` et `forfait` modifient l'ELO, uniquement via `validate_match` (`SECURITY DEFINER`).

## 7. Administrateurs et modérateurs

- Aucune politique d'écriture sur `user_roles` pour les utilisateurs : impossible de s'attribuer un rôle.
- **Premier admin** : inséré manuellement par vous dans l'éditeur SQL Supabase (une ligne, avec votre identifiant utilisateur) — procédure documentée, pas de bouton dans l'app.
- Ensuite : fonction `grant_role` / `revoke_role` réservée aux admins (vérifiée via `has_role` en base), journalisée. Un admin ne peut pas retirer le dernier admin.
- Toutes les vérifications d'autorisation en base ou dans les fonctions serveur, jamais dans le navigateur.

## 8. Séparation démo / réel

- Les données fictives restent dans le code de l'application, jamais insérées en base.
- Le classement officiel lit uniquement `team_ratings` ; les équipes fictives n'y figurent jamais.
- Les pages affichent la démo tant qu'aucune donnée réelle n'existe, avec les badges actuels ; les données réelles seront étiquetées « Officiel ». Design inchangé.

## 9. Politiques RLS par table

| Table | Visiteur | Connecté | Capitaine | Modérateur | Admin |
|---|---|---|---|---|---|
| profiles | lire pseudo/avatar | modifier le sien | — | — | — |
| user_roles | — | lire les siens | — | lire | via fonction |
| app_settings | lire | lire | — | — | modifier |
| brawl_accounts | lire tags vérifiés | gérer les siens | — | vérifier | vérifier |
| teams | lire actives | créer (devient capitaine) | modifier son équipe | archiver | archiver |
| team_members | lire actifs | quitter (fonction) | gérer (fonction) | — | — |
| team_invitations | — | lire/répondre aux siennes | créer/annuler | lire | lire |
| roster_changes | lire | lire | — | lire | lire |
| team_ratings, elo_history | lire | lire | — | — | — (fonction seule) |
| matches, rounds, lineups | lire validés | lire ceux de son équipe | — | lire tout | lire tout |
| match_reports | — | lire ceux de son équipe | déclarer (fonction) | lire | lire |
| match_disputes | — | ouvrir/lire ceux de son équipe | — | trancher | trancher |
| queue_entries | lire anonymisé (nombre) | — | rejoindre/quitter (fonction) | lire | lire |

Toute écriture sensible passe par des fonctions qui vérifient l'appelant. La clé secrète (service role) reste uniquement côté serveur ; le navigateur n'utilise que la clé publique.

## 10. Limites techniques

- Pas de vérification automatique des résultats via l'API Brawl Stars à ce stade : la validation repose sur les déclarations et la modération.
- La vérification des tags Brawl Stars est manuelle (modérateur).
- Corriger un ancien match ne recalcule pas les ELO des matchs suivants.
- Délais (expiration d'invitation, absence de déclaration) traités à la prochaine action ou par une tâche planifiée à ajouter plus tard.
- E-mails d'invitation non prévus : invitations visibles dans l'application.

## 11. Migrations prévues

1. Profils, rôles, `has_role`, `grant_role`/`revoke_role`, `app_settings`, création du profil à l'inscription.
2. Comptes Brawl Stars, équipes, membres, invitations, journal + fonctions d'effectif et transfert de capitaine.
3. `team_ratings`, `elo_history`.
4. Matchs, manches, compositions, déclarations, contestations, `active_match_slots`, contraintes BO3.
5. `validate_match`, forfait, annulation, résolution de contestation, verrouillages post-validation.
6. File d'attente et appariement.
Chaque table : droits explicites, RLS activée, politiques, horodatages. Contrôle de sécurité Supabase après chaque migration.

## 12. Implémentation progressive

1. Comptes et Profil réel (démo conservée).
2. Équipes, invitations, effectifs.
3. Classement officiel séparé de la démo.
4. Déclaration, contestation, validation, historique ELO.
5. Matchmaking réel.
6. Écran de modération.
Les tests ELO existants serviront de référence pour le calcul serveur.
