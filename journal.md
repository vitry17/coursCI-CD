# Journal de bord

Suivi de l'avancement du projet, lot par lot. Le détail de chaque lot est dans [docs/ROADMAP.md](docs/ROADMAP.md).

Statuts : ⬜ À faire · 🟨 En cours · ✅ Terminé

| Lot | Intitulé | Statut | Début | Fin |
|---|---|---|---|---|
| 0 | Socle projet et CI | 🟨 En cours | 2026-09-25 | |
| 1 | Base de données | 🟨 Implémenté, à intégrer | 2026-11-13 | |
| 2 | Authentification | ⬜ À faire | | |
| 3 | Profil utilisateur | ⬜ À faire | | |
| 4 | Créneaux et prise de rendez-vous | ⬜ À faire | | |
| 5 | Espace naturopathe | ⬜ À faire | | |
| 6 | Déploiement continu | ⬜ À faire | | |
| 7 | Bonus : notifications et confort | ⬜ À faire | | |

---

## Lot 0 : Socle projet et CI

**Statut** : 🟨 En cours

### Tâches

- [x] Initialisation du dépôt git
- [x] Création de la branche `dev`
- [x] Branche `feature/docs_spec` créée depuis `dev`
- [x] README.md
- [x] docs/SPEC.md, ARCHITECTURE.md, API.md, DATABASE.md, ROADMAP.md
- [x] journal.md
- [x] Création de la branche `main` (sur le commit initial)
- [ ] Monorepo npm workspaces `api/` + `web/`
- [ ] ESLint + Prettier
- [ ] Route `GET /api/health` et son test
- [ ] `docker-compose.yml` (PostgreSQL) et `Dockerfile` de l'API
- [ ] `.env.example` et `.gitignore`
- [ ] Workflow GitHub Actions `ci.yml`
- [ ] Protection des branches `main` et `dev`

### Journal

**2026-09-25**
- Rédaction des spécifications et découpage en 8 lots (0 à 7).
- Décisions :
  - consultations d'1 h, le mercredi de 9h à 12h et de 14h à 18h, soit 7 créneaux ;
  - stack Node/Express + PostgreSQL/Prisma + React/Vite ;
  - créneaux calculés à la volée, non stockés en base ;
  - double réservation empêchée par un index unique partiel en base.

### Difficultés / points à revoir

- 

---

## Lot 1 : Base de données

**Statut** : 🟨 Implémenté et validé localement ; PR et intégration dans dev à faire.

### Tâches

- [x] Installation de Prisma et schema.prisma
- [x] Première migration + contraintes SQL manuelles
- [x] Seed du compte admin
- [x] Healthcheck base de données
- [x] Service PostgreSQL dans la CI
- [x] Tests des contraintes

### Journal

**2026-11-13**
- Branche feature/lot-1-base-donnees, worktree isolé pour préserver le staging.
- Branche créée depuis dev, puis avance rapide sur le socle lot 0 existant (dev ne le contenait pas encore).
- Prisma, migration SQL, seed bcrypt idempotent, healthcheck DB et CI PostgreSQL.
- 26 tests API réussis : contraintes, concurrence, fuseau Paris, seed et healthcheck.
- Installation avec npm ci, migrations réappliquées sans changement, lint sans erreur et build web validés.
- Guide d'utilisation : [docs/LOT1.md](docs/LOT1.md).
- Le statut du lot 0 reste inchangé : protection des branches et intégration à vérifier.

---

## Lot 2 : Authentification

**Statut** : ⬜ À faire

### Tâches

- [ ] Routes register / login / logout / me
- [ ] bcrypt + JWT en cookie httpOnly
- [ ] Middlewares `requireAuth` / `requireRole`
- [ ] Validation Zod + gestion d'erreurs commune
- [ ] Rate limiting sur le login
- [ ] Pages Inscription / Connexion
- [ ] Tests

### Journal

- 

---

## Lot 3 : Profil utilisateur

**Statut** : ⬜ À faire

### Tâches

- [ ] `PATCH /users/me` et `DELETE /users/me`
- [ ] Page Profil
- [ ] Tests

### Journal

- 

---

## Lot 4 : Créneaux et prise de rendez-vous

**Statut** : ⬜ À faire

### Tâches

- [ ] Service de génération des créneaux
- [ ] `GET /slots`
- [ ] Réservation, liste, annulation
- [ ] Règles R1 à R6
- [ ] Front : calendrier, réservation, « Mes rendez-vous »
- [ ] Tests unitaires et d'intégration

### Journal

- 

---

## Lot 5 : Espace naturopathe

**Statut** : ⬜ À faire

### Tâches

- [ ] Planning d'un mercredi et annulation admin
- [ ] Fermeture / réouverture d'un mercredi
- [ ] Liste des patients
- [ ] Tableau de bord admin
- [ ] Tests des droits

### Journal

- 

---

## Lot 6 : Déploiement continu

**Statut** : ⬜ À faire

### Tâches

- [ ] Choix de l'hébergeur
- [ ] Images Docker
- [ ] Workflow `cd.yml`
- [ ] Secrets GitHub
- [ ] Smoke test post-déploiement
- [ ] Tests end-to-end Playwright
- [ ] Badge CI dans le README

### Journal

- 

---

## Lot 7 (bonus) : Notifications et confort

**Statut** : ⬜ À faire

### Tâches

- [ ] Emails de confirmation / annulation
- [ ] Rappel la veille
- [ ] Mot de passe oublié
- [ ] Export iCal

### Journal

- 

## Reprise du staging avec Supabase — 2026-11-13

- Branche feature/staging-supabase créée depuis dev.
- Serveur MCP Supabase configuré pour bognyfqwmkiuxyyzxlie et OAuth confirmé.
- DIRECT_URL réservée au CLI Prisma, DATABASE_URL conservée pour l'API.
- Client Prisma généré à l'installation et moteur Vercel inclus dans le bundle.
- Migrations automatiques limitées à dev/Preview ; autres branches inchangées.
- RLS activée sur les tables applicatives pour bloquer les accès publics Supabase.
- 31 tests API, lint sans erreur, build web, simulation du build staging et Docker validés.
- À terminer : charger les outils MCP dans la session, connecter Vercel, inspecter
  Supabase, définir les variables de staging et vérifier le déploiement distant.
