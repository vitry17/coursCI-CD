# Staging Vercel + Supabase

## Environnements

- Dépôt : vitry17/coursCI-CD.
- Projet Vercel : courscicd, équipe projet-ci-cd.
- Projet Supabase de staging : bognyfqwmkiuxyyzxlie (pooler eu-central-1).
- dev : Preview Vercel de staging ; main : production.
- Les branches feature/* ont des previews sans accès à la base partagée.
- Node 24 est fixé dans package.json, .nvmrc, la CI, Docker et Vercel.
  [Versions prises en charge par Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

React est servi depuis web/dist ; Express via api/index.js.
Le front appelle /api/* sur la même origine, sans clé Supabase publique.

## Connexions et secrets

| Variable | Usage | Rôle PostgreSQL | Pooler |
| --- | --- | --- | --- |
| DATABASE_URL | API Express | naturo_app | Transaction, 6543 |
| DIRECT_URL | Prisma Migrate | naturo_migrator | Session, 5432 |
| JWT_SECRET | Authentification du lot 2 | — | Secret propre au staging |

Ces trois variables sont des secrets Vercel limités à Preview / branche dev.
Aucune variable de production n'a été définie.

Les identifiants locaux sont dans .env.staging, ignoré par Git et les builds Docker.
Ne jamais afficher ni commiter ce fichier. Il n'est pas chargé automatiquement :
les commandes locales habituelles continuent d'utiliser .env.

Exemple de structure uniquement :

```dotenv
DATABASE_URL=postgresql://naturo_app.bognyfqwmkiuxyyzxlie:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://naturo_migrator.bognyfqwmkiuxyyzxlie:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Le script Prisma privilégie DIRECT_URL pour les migrations et utilise DATABASE_URL
en l'absence de DIRECT_URL (local et CI). Le client API utilise DATABASE_URL.

Références : [connexion Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
et [Prisma avec Supabase](https://supabase.com/docs/guides/database/prisma).

## Droits et isolation

- naturo_migrator possède les tables et types applicatifs, et peut créer des
  objets dans public. Il ne peut créer ni bases, ni rôles, ni nouveaux schémas.
- naturo_app peut lire, insérer, modifier et supprimer dans users, appointments
  et closed_days. Il ne possède aucune table et ne peut pas exécuter de DDL.
- Aucun des deux comptes n'est superutilisateur et aucun ne possède BYPASSRLS.
- RLS est activée sur les quatre tables, y compris _prisma_migrations.
- Les policies des trois tables applicatives autorisent uniquement le rôle
  serveur naturo_app. Ce rôle n'est attribué ni à anon ni à authenticated.
- Les rôles publics n'ont aucun accès aux tables. L'autorisation des patients
  et des administrateurs reste gérée par Express, dans le lot 2.
- L'API ne peut pas lire ni modifier _prisma_migrations.

Les mots de passe des rôles ont été générés aléatoirement. Les opérations de
provisionnement n'ont transmis que leurs vérificateurs SCRAM à PostgreSQL.

## Migrations et build

1. Le builder statique part du package.json racine pour installer les deux workspaces.
   npm postinstall génère le client Prisma ; la sortie statique est web/dist.
2. Le moteur rhel-openssl-3.0.x est inclus dans la fonction Vercel.
3. Le script vercel-build applique prisma migrate deploy uniquement pour
   VERCEL=1, VERCEL_ENV=preview et VERCEL_GIT_COMMIT_REF=dev.
4. DIRECT_URL est obligatoire dans ce cas ; une erreur de migration arrête le build.
5. Les previews feature/* et la production ne lancent pas ces migrations.
6. Vite construit le front.

Migrations applicatives installées :
- 20261113000000_init : modèle et contraintes ;
- 20261113010000_enable_rls : activation RLS ;
- 20261113020000_server_access : droits du serveur et protection du registre Prisma.

Ne pas utiliser prisma db push ou migrate reset sur Supabase.

### Initialisation d'une nouvelle base avec un rôle restreint

Le provisionnement des rôles est une opération d'administration distincte.
Ne jamais ajouter leurs mots de passe aux migrations.

Sur ce projet, public existait déjà. L'instruction CREATE SCHEMA IF NOT EXISTS
de la migration initiale exigeait un privilège de niveau base non accordé au
migrateur. Le SQL initial a donc été exécuté via l'administration Supabase dans
public, sous le rôle naturo_migrator, en omettant uniquement cette instruction
déjà satisfaite. La migration a ensuite été enregistrée avec
prisma migrate resolve --applied 20261113000000_init. Les deux suivantes ont été
appliquées normalement avec Prisma. Le registre conserve les tentatives échouées
comme annulées ; il n'y a aucune migration non résolue.

Les prochains déploiements utilisent simplement migrate deploy.

## Vérifications

Depuis api/, avec Node 24 :

```sh
node --env-file=../.env.staging scripts/prisma.js migrate status
```

Après déploiement :

```sh
curl --fail https://URL-STAGING/api/health
```

Réponse attendue : HTTP 200 et {"status":"ok","db":"ok"}.
Un HTTP 503 indique une connexion DB indisponible.
Le healthcheck vérifie la connexion ; les logs du build attestent les migrations.

La CI utilise exclusivement PostgreSQL éphémère. Avant les migrations, elle crée
les rôles sans login définis dans api/tests/fixtures/database-roles.sql.
Les tests vérifient les contraintes, le CRUD serveur, l'absence d'accès public,
l'interdiction du DDL et la protection du registre Prisma.

## État vérifié le 13 novembre 2026

- Tables créées dans Supabase ; trois migrations applicatives à jour.
- Connexion réelle du rôle naturo_app testée, base encore sans patients.
- 32 tests API réussis ; build web réussi.
- Aucun avertissement ni erreur de sécurité Supabase. Deux informations attendues :
  registre Prisma sans policy publique, et index encore inutilisé sur une base vide.
  [RLS sans policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [index inutilisé](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- Aucun compte administrateur par défaut : le seed nécessite un email et un
  mot de passe choisis explicitement et ne s'exécute jamais pendant le build.