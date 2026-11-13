# Lot 1 : base de données

## Démarrage local

Depuis la racine du dépôt, avec Node.js 20 et Docker :

```sh
cp .env.example .env
docker compose up -d db
npm ci
npm run db:generate
npm run db:migrate
# Renseigner ADMIN_EMAIL et ADMIN_PASSWORD dans .env avant cette commande :
npm run db:seed
npm run dev --workspace=api
```

Le fichier `.env` racine est chargé même quand npm exécute une commande dans
le workspace API. Les variables déjà présentes dans l'environnement ont priorité.

- `db:migrate` applique les migrations versionnées sans réinitialiser la base.
- `db:migrate:dev --workspace=api -- --name nom` crée une migration en développement.
- `db:generate` régénère le client Prisma après modification du schéma.
- Le seed crée uniquement le compte administrateur. Les données de démonstration
  ne sont pas incluses dans ce lot.
- Le mot de passe doit avoir au moins 12 caractères et au plus 72 octets UTF-8
  (limite bcrypt). Il est haché avec un coût de 12.
- Relancer le seed ne change ni le profil ni le mot de passe existant.
  Un email appartenant à un patient est refusé.
- `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_PHONE` sont facultatifs.

## Migrations et contraintes

Prisma 6 est utilisé pour rester compatible avec le socle Node.js 20.
Les index partiels et CHECK sont conservés dans le SQL de la migration,
selon la [documentation Prisma 6](https://docs.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features).
Ne pas remplacer les migrations par `prisma db push` : ces contraintes SQL
font partie du modèle et doivent être appliquées.

La base garantit l'unicité des créneaux BOOKED, le mercredi en Europe/Paris,
une fin postérieure au début, la cohérence des annulations, les fermetures
uniquement le mercredi et la suppression en cascade des rendez-vous.
Les règles horaires et le maximum d'un rendez-vous par patient et mercredi
restent à implémenter dans le lot 4.

Le healthcheck renvoie :
- HTTP 200 : `{ "status": "ok", "db": "ok" }` ;
- HTTP 503 : `{ "status": "error", "db": "error" }` si PostgreSQL est indisponible,
  sans exposer les détails de connexion.

## Tests

Utiliser une base dédiée dont le nom se termine par `_test`.
Les tests créent leurs propres utilisateurs et suppriment seulement leurs
données, sans TRUNCATE global.

```sh
docker run --rm -d --name naturo-lot1-test \
  -e POSTGRES_USER=naturo -e POSTGRES_PASSWORD=naturo \
  -e POSTGRES_DB=naturo_test -p 127.0.0.1:55432:5432 postgres:16-alpine
export DATABASE_URL=postgresql://naturo:naturo@localhost:55432/naturo_test
npm run db:migrate
npm run lint
npm test
npm run build
docker stop naturo-lot1-test
```

Attendre que PostgreSQL soit prêt avant d'appliquer les migrations.
La CI démarre PostgreSQL 16 avec un healthcheck puis exécute `npm ci`,
la génération Prisma, les migrations, le lint, les tests et le build.

## Image API

```sh
docker build -f api/Dockerfile -t naturo-api .
```

L'image contient le client généré et les migrations. Appliquer celles-ci avant
le démarrage via `npm run db:migrate` avec DATABASE_URL configurée.
Le déploiement staging est géré séparément.
## Validation locale et limites

Validé le 13 novembre 2026 : 26 tests API réussis sur PostgreSQL 16, également
dans l'image Node 20 ; npm ci, lint sans erreur, build web et image Docker réussis.
Migration appliquée puis réappliquée sans changement. Smoke test réel :
HTTP 200 avec la base disponible, HTTP 503 après son arrêt.

Points restants du socle :
- Deux avertissements ESLint dans web/src/main.jsx (imports JSX).
- jsdom manque au runner web ; il n'existe pas encore de tests front.
- npm audit signale 9 alertes (3 modérées, 4 élevées, 2 critiques).
  L'audit avec --omit=dev signale 3 entrées élevées dans la chaîne
  prisma → @prisma/config → deepmerge-ts. La correction proposée impose
  une version majeure de Prisma : cette migration n'est pas incluse ici.
  L'image conserve le CLI Prisma et les outils de test pour permettre les
  migrations et la validation ; une image de production allégée reste à prévoir.

La CI distante et la PR ne sont pas encore exécutées ; le lot reste à intégrer
dans dev. Le staging doit reprendre la configuration DATABASE_URL et le nouveau
contrat du healthcheck lors de l'intégration.
