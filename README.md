# Naturo RDV

Application web de prise de rendez-vous pour un cabinet de naturopathie.
Les patients créent un compte et réservent une consultation **le mercredi**, seul jour d'ouverture du cabinet. La naturopathe gère son planning depuis un espace dédié.

Projet réalisé dans le cadre du cours CI/CD : l'accent est mis sur le découpage en lots, les tests automatisés et le pipeline d'intégration / déploiement continus.

## Fonctionnalités

- Inscription, connexion, déconnexion
- Gestion du profil et suppression du compte (RGPD)
- Consultation des créneaux libres du mercredi
- Réservation et annulation d'un rendez-vous
- Espace naturopathe : planning, fermeture d'un mercredi, annulation, liste des patients

## Stack

| Couche | Technologie |
|---|---|
| Front | React + Vite |
| API | Node.js 20 + Express |
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

## Démarrage (à partir du lot 0)

```bash
cp .env.example .env
docker compose up -d db     # PostgreSQL
npm ci
npm run db:generate
npm run db:migrate
npm run dev --workspace=api # API sur :3000
# Dans un autre terminal : npm run dev --workspace=web

# Tests sur une base dédiée : voir docs/LOT1.md
```

## Workflow git

- `main` : version stable, déployée en production. Aucun commit direct.
- `dev` : branche d'intégration. Toutes les features y sont mergées.
- `feature/<nom>` : une branche par tâche, créée depuis `dev` et mergée dans `dev` via pull request.

Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/fr/) : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `ci:`.

## Documentation

Voir le dossier [docs/](docs/) et le [journal de bord](journal.md).

Guide base de données : [lot 1](docs/LOT1.md).
