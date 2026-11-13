# Naturo RDV

Application web de prise de rendez-vous pour un cabinet de naturopathie.
Objectif final : permettre aux patients de réserver une consultation **le mercredi** et à la naturopathe de gérer son planning. Le rendu actuel couvre le socle, la base de données et l'authentification ; la réservation reste à développer.

Projet réalisé dans le cadre du cours CI/CD : l'accent est mis sur le découpage en lots, les tests automatisés et le pipeline d'intégration / déploiement continus.

## État du rendu — 13 novembre 2026

[![CI](https://github.com/vitry17/coursCI-CD/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/vitry17/coursCI-CD/actions/workflows/ci.yml)

| Périmètre | État |
|---|---|
| Lot 0 : monorepo, Docker, lint et CI GitHub Actions | Réalisé |
| Lot 1 : modèle PostgreSQL, migrations Prisma, contraintes et seed admin | Réalisé |
| Lot 2 : inscription, connexion, déconnexion, cookies sécurisés et routes protégées | Réalisé et relu |
| Lot 3 : modification et suppression du profil | À livrer |
| Lot 4 : créneaux, réservation et annulation | À développer |
| Lot 5 : espace naturopathe | À développer |
| Lot 6 : déploiement | Staging Vercel/Supabase opérationnel ; production et E2E à finaliser |
| Lot 7 : notifications et confort | Non réalisé |

**Validation du lot 2 : 54 tests réussis (51 API et 3 front), lint sans erreur, build réussi et CI verte après fusion dans dev.** Les commits ultérieurs sont vérifiés par les checks de leur PR.

- Code intégré : [branche dev](https://github.com/vitry17/coursCI-CD/tree/dev).
- Traçabilité : [pull requests](https://github.com/vitry17/coursCI-CD/pulls?q=is%3Apr), [exécutions CI](https://github.com/vitry17/coursCI-CD/actions) et [journal](journal.md).
- [Staging](https://courscicd-git-dev-projet-ci-cd.vercel.app) : accès protégé par l'authentification Vercel, donc pas une démonstration publique anonyme.
- Le rendu est un incrément fonctionnel, pas l'application complète décrite dans les spécifications.
- Les limites de sécurité connues sont consignées dans [le contrat API](docs/API.md#précisions-de-sécurité-du-lot-2).

## Stack

| Couche | Technologie |
|---|---|
| Front | React + Vite |
| API | Node.js 24 + Express |
| Base de données | PostgreSQL 16 (ORM Prisma) |
| Tests | Vitest, Supertest |
| Qualité | ESLint, Prettier |
| Conteneurs | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Structure du dépôt

```
coursCI-CD/
├── api/              # API Express + Prisma
├── web/              # Front React
├── docs/
│   ├── SPEC.md          # Spécifications fonctionnelles
│   ├── ARCHITECTURE.md  # Architecture technique
│   ├── API.md           # Contrat de l'API REST
│   ├── DATABASE.md      # Modèle de données
│   └── ROADMAP.md       # Découpage en lots
├── journal.md        # Journal de bord, lot par lot
└── README.md
```

## Démarrage local

```bash
cp .env.example .env
# Remplacer JWT_SECRET dans .env par une clé aléatoire (commande ci-dessous).
docker compose up -d db     # PostgreSQL
npm ci
npm run db:generate
npm run db:migrate
npm run dev --workspace=api # API sur :3000
# Dans un autre terminal : npm run dev --workspace=web

# Tests sur une base dédiée : voir docs/LOT1.md
```

Avant de démarrer l'API, générer une clé avec la commande suivante et copier sa sortie dans JWT_SECRET du fichier .env :

    node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"

La valeur exemple est volontairement refusée par l'API. Ne pas versionner .env et ne pas communiquer sa clé. Node.js 24 et Docker sont nécessaires. Le seed administrateur est facultatif pour tester l'inscription d'un patient ; son utilisation est détaillée dans le guide du lot 1.

## Workflow git

- `main` : branche de livraison stable. La configuration de production reste à finaliser ; le staging suit dev. Aucun commit direct.
- `dev` : branche d'intégration. Toutes les features y sont mergées.
- `feature/<nom>` : une branche par tâche, créée depuis `dev` et mergée dans `dev` via pull request.

Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`.

## Documentation

Voir le dossier [docs/](docs/) et le [journal de bord](journal.md).

Guide base de données : [lot 1](docs/LOT1.md).
