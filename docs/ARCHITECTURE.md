# Architecture technique

## 1. Vue d'ensemble

```
┌──────────────┐   HTTPS / JSON   ┌──────────────┐   SQL   ┌──────────────┐
│  web (React) │ ───────────────▶ │ api (Express)│ ──────▶ │  PostgreSQL  │
│  Vite, :5173 │ ◀─────────────── │    :3000     │ ◀────── │    :5432     │
└──────────────┘  cookie JWT      └──────────────┘ Prisma  └──────────────┘
```

Monorepo avec deux applications (`api/` et `web/`) gérées par les workspaces npm.

## 2. Choix techniques

| Besoin | Choix | Raison |
|---|---|---|
| API | Node.js 24 + Express | Simple, très répandu, facile à tester avec Supertest |
| ORM | Prisma | Schéma déclaratif, migrations versionnées, typage |
| BDD | PostgreSQL 16 | Contraintes fortes (index uniques partiels, CHECK) |
| Front | React + Vite | Build rapide, écosystème de tests |
| Auth | JWT en cookie `httpOnly` + bcrypt | Pas de token accessible en JS, pas de session serveur à stocker |
| Validation | Zod | Même schéma pour valider et typer |
| Dates | `date-fns-tz`, fuseau `Europe/Paris` | Calcul fiable des créneaux, heure d'été incluse |
| Tests | Vitest + Supertest | Un seul runner pour l'API et le front |
| Conteneurs | Docker Compose | Même environnement en local et en CI |
| CI/CD | GitHub Actions | Intégré au dépôt |

## 3. Organisation du code de l'API

```
api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js             # crée le compte naturopathe
├── src/
│   ├── app.js              # création de l'app Express (sans listen, pour les tests)
│   ├── server.js           # point d'entrée, listen
│   ├── config.js           # lecture et validation des variables d'environnement
│   ├── routes/             # définition des routes
│   ├── controllers/        # lecture de la requête, appel du service, réponse
│   ├── services/           # logique métier (règles R1 à R11)
│   ├── middlewares/        # auth, rôles, validation, gestion d'erreurs
│   └── lib/                # prisma client, génération des créneaux
└── tests/
    ├── unit/               # services, calcul des créneaux
    └── integration/        # routes + vraie base de test
```

Règle : la logique métier est dans `services/`, jamais dans les routes. Les services sont testés unitairement.

## 4. Organisation du front

```
web/src/
├── pages/        # Accueil, Connexion, Inscription, Réserver, MesRdv, Profil, Admin
├── components/
├── api/          # appels fetch vers l'API
├── hooks/        # useAuth, useSlots…
└── routes.jsx    # routes publiques, patient, admin
```

## 5. Créneaux

Les créneaux **ne sont pas stockés** en base. Ils sont calculés à la volée :

1. lister les mercredis entre aujourd'hui et +8 semaines ;
2. retirer les mercredis présents dans `closed_days` ;
3. générer les créneaux à partir de la configuration (plages horaires, durée) ;
4. marquer comme pris ceux qui ont un rendez-vous `BOOKED` ;
5. marquer comme indisponibles ceux qui commencent dans moins de 24 h.

La base garantit en dernier recours qu'un créneau n'est pas réservé deux fois (voir [DATABASE.md](DATABASE.md)).

## 6. Configuration

Variables d'environnement (fichier `.env`, modèle dans `.env.example`) :

| Variable | Exemple |
|---|---|
| `DATABASE_URL` | `postgresql://naturo:naturo@localhost:5432/naturo` |
| `JWT_SECRET` | chaîne aléatoire de 32 caractères minimum |
| `JWT_EXPIRES_IN` | `24h` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | utilisés par le seed |
| `OPENING_HOURS` | `09:00-12:00,14:00-18:00` |
| `SLOT_DURATION_MIN` | `60` |
| `BOOKING_MIN_NOTICE_H` | `24` |
| `BOOKING_MAX_WEEKS` | `8` |

Aucun secret n'est commité. En CI, ils sont fournis par les *secrets* GitHub.

## 7. Pipeline CI/CD

```
push / pull request
      │
      ▼
┌─────────┐   ┌────────┐   ┌─────────────────────────┐   ┌─────────┐
│ install │──▶│  lint  │──▶│ tests (service Postgres)│──▶│  build  │
└─────────┘   └────────┘   └─────────────────────────┘   └────┬────┘
                                                              │ merge sur main uniquement
                                                              ▼
                                                        ┌───────────┐
                                                        │  deploy   │
                                                        └───────────┘
```

- Sur chaque PR vers `dev` ou `main` : lint, tests, build. Le merge est bloqué si une étape échoue.
- Sur `main` : construction des images Docker puis déploiement (lot 6).

## 8. Environnements

| Environnement | Branche | Base |
|---|---|---|
| Local | `feature/*` | Postgres via Docker Compose |
| CI | toutes | Postgres éphémère (service GitHub Actions) |
| Production | `main` | Postgres hébergé (choix de l'hébergeur au lot 6) |
