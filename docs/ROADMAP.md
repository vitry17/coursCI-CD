# Roadmap : découpage en lots

Chaque lot est livré sur une ou plusieurs branches `feature/*` créées depuis `dev`, puis mergé dans `dev` par pull request avec une CI verte. Un lot terminé et validé peut être mergé de `dev` vers `main`.

Le suivi de l'avancement se fait dans [journal.md](../journal.md).

## Définition de « terminé » (commune à tous les lots)

- [ ] Code relu et mergé dans `dev`
- [ ] Tests écrits pour les nouvelles règles, pipeline CI vert
- [ ] Lint sans erreur
- [ ] Documentation (`docs/`) à jour si le contrat change
- [ ] Entrée complétée dans `journal.md`

---

## Lot 0 : Socle projet et CI

**Objectif** : avoir un projet vide mais qui s'installe, se lance, se teste et passe en CI.

- Initialisation du dépôt, branches `main` / `dev`, convention de nommage des branches et des commits
- Documentation initiale : README, SPEC, ARCHITECTURE, API, DATABASE, ROADMAP, journal
- Monorepo npm workspaces : `api/` (Express) et `web/` (React + Vite)
- ESLint + Prettier, scripts `lint`, `test`, `build`, `dev`
- Route `GET /api/health` et son premier test (Supertest)
- `docker-compose.yml` avec PostgreSQL, et `Dockerfile` pour l'API
- `.env.example`, `.gitignore`
- Workflow GitHub Actions `ci.yml` : install → lint → test → build, sur push et PR vers `dev` / `main`
- Protection des branches `main` et `dev` (merge uniquement par PR avec CI verte)

**Livrable** : `npm test` passe en local et en CI, `docker compose up` démarre la base.

---

## Lot 1 : Base de données

**Objectif** : le modèle de données est en place et migrable.

- Installation de Prisma, `schema.prisma` (users, appointments, closed_days)
- Première migration, avec les contraintes SQL ajoutées à la main (index partiel, CHECK)
- Seed du compte admin
- `/api/health` vérifie aussi la connexion à la base
- CI : service PostgreSQL, `prisma migrate deploy` avant les tests
- Tests : les contraintes refusent bien un double booking et un jour autre que mercredi

---

## Lot 2 : Authentification

**Objectif** : un utilisateur peut s'inscrire, se connecter et se déconnecter.

- `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`
- Hachage bcrypt, JWT en cookie `httpOnly`
- Middlewares `requireAuth` et `requireRole('ADMIN')`
- Validation Zod, middleware d'erreurs au format commun
- Rate limiting sur `/auth/login`
- Front : pages Inscription et Connexion, contexte `useAuth`, routes protégées
- Tests : inscription (email pris, mot de passe faible), connexion (mauvais mot de passe), accès refusé sans token

---

## Lot 3 : Profil utilisateur

**Objectif** : le patient gère son compte.

- `PATCH /users/me`, `DELETE /users/me`
- Front : page Profil (modification, suppression avec confirmation)
- Tests : modification, suppression en cascade des rendez-vous, l'admin ne peut pas se supprimer

---

## Lot 4 : Créneaux et prise de rendez-vous

**Objectif** : le cœur de l'application, réserver un mercredi.

- Service de génération des créneaux (configuration, fuseau Europe/Paris)
- `GET /slots`
- `POST /appointments`, `GET /appointments/me`, `PATCH /appointments/:id/cancel`
- Règles R1 à R6 dans le service, transaction pour la réservation
- Front : calendrier des mercredis, réservation, page « Mes rendez-vous », annulation
- Tests unitaires du calcul des créneaux (passage à l'heure d'été / d'hiver, 24 h, 8 semaines)
- Tests d'intégration : double réservation concurrente, un seul rendez-vous par mercredi

---

## Lot 5 : Espace naturopathe

**Objectif** : la naturopathe pilote son planning.

- `GET /admin/appointments`, `PATCH /admin/appointments/:id/cancel`
- `GET /closed-days`, `POST /admin/closed-days`, `DELETE /admin/closed-days/:id`
- `GET /admin/users` (pagination, recherche)
- Front : tableau de bord admin (planning du mercredi, fermetures, patients)
- Tests : un patient reçoit un 403 sur toutes les routes admin, fermeture d'un jour avec rendez-vous

---

## Lot 6 : Déploiement continu

**Objectif** : chaque merge sur `main` est déployé automatiquement.

- Choix de l'hébergeur (API + base + front statique)
- Build et publication des images Docker
- Workflow `cd.yml` : déploiement sur merge dans `main`, migrations appliquées automatiquement
- Secrets GitHub (`DATABASE_URL`, `JWT_SECRET`…)
- Smoke test post-déploiement sur `/api/health`
- Tests end-to-end (Playwright) du parcours : inscription → réservation → annulation
- Badge CI dans le README

---

## Lot 7 (bonus) : Notifications et confort

- Email de confirmation et d'annulation de rendez-vous
- Rappel automatique la veille
- Mot de passe oublié (token de réinitialisation à durée limitée)
- Export du planning (iCal)
