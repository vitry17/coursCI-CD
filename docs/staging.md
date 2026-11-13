# Staging Vercel + Supabase

## État et architecture

- Dépôt : vitry17/coursCI-CD.
- Projet Vercel existant : courscicd, équipe projet-ci-cd.
- Projet Supabase choisi pour le staging : bognyfqwmkiuxyyzxlie.
- main correspond à la production ; dev au staging (Preview Vercel).
- Les branches feature/* ont des previews indépendantes.
- React est servi depuis web/dist ; Express via api/index.js.
- Le front appelle /api/health sur la même origine, sans clé Supabase publique.
- Prisma reste le seul accès aux tables applicatives depuis le serveur.

Le serveur MCP Supabase sert à administrer le projet. Son authentification OAuth
ne configure pas la connexion PostgreSQL utilisée par l'application.

## Connexions Supabase

Dans Supabase → Connect, récupérer les deux URL du projet :

| Variable | Usage | Connexion |
| --- | --- | --- |
| DATABASE_URL | API serverless | Transaction pooler, port 6543 |
| DIRECT_URL | Migrations Prisma | Session pooler, port 5432 |

Exemples de structure (remplacer HOST par l'hôte exact affiché dans Supabase,
ne pas deviner la région ; encoder les caractères spéciaux du mot de passe) :

```dotenv
DATABASE_URL=postgresql://postgres.bognyfqwmkiuxyyzxlie:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
DIRECT_URL=postgresql://postgres.bognyfqwmkiuxyyzxlie:PASSWORD@HOST:5432/postgres?sslmode=require
```

Le pooler session est utilisable en IPv4 pour les migrations.
Le script Prisma utilise DIRECT_URL si elle est définie, sinon DATABASE_URL
pour rester compatible avec PostgreSQL local et la CI.
Le client API continue d'utiliser DATABASE_URL.

Références : [Supabase / Prisma](https://www.prisma.io/docs/orm/v6/overview/databases/supabase)
et [diagnostic Supabase Prisma](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting).

## Configuration Vercel

Dans le projet existant, conserver la racine du dépôt et main comme branche
de production. Définir DATABASE_URL et DIRECT_URL pour **Preview, branche dev**.
Ne pas réutiliser ces secrets pour la production ou les previews des autres branches.

Le dépôt prépare :
1. npm postinstall génère le client Prisma à chaque installation.
2. Le moteur rhel-openssl-3.0.x est généré et inclus dans le bundle API.
3. Le script vercel-build du front applique prisma migrate deploy uniquement
   lorsque VERCEL=1, VERCEL_ENV=preview et VERCEL_GIT_COMMIT_REF=dev.
4. Le build staging échoue si DIRECT_URL manque ou si une migration échoue.
5. Les previews feature/* et la production ne déclenchent pas ces migrations.
6. Vite construit le front.

Ne pas utiliser prisma db push ou migrate reset pour initialiser Supabase :
les migrations SQL versionnées contiennent les CHECK et l'index partiel.

Le seed administrateur reste une action explicite, jamais une étape de build.
Configurer ADMIN_EMAIL et ADMIN_PASSWORD puis lancer npm run db:seed avec la
connexion du staging uniquement quand la base est prête. Aucun mot de passe
par défaut n'est créé.

## Accès aux tables

La migration 20261113010000_enable_rls active RLS sur les trois tables.
Aucune policy publique n'est créée : les rôles anon/authenticated de l'API
Supabase ne peuvent pas lire les patients ni les hachages de mots de passe.
La connexion Prisma doit utiliser le propriétaire des tables ou un rôle serveur
autorisé à contourner RLS. Les règles d'authentification de l'application
restent dans Express (lot 2).

Voir [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Validation après déploiement

```sh
curl --fail https://URL-STAGING/api/health
```

Réponse attendue : HTTP 200 avec {"status":"ok","db":"ok"}.
HTTP 503 avec {"status":"error","db":"error"} signifie que la connexion DB
est indisponible. Ce healthcheck vérifie la connexion, pas la présence des tables :
la réussite de migrate deploy doit aussi être vérifiée dans les logs du build.

La CI GitHub conserve sa propre base PostgreSQL éphémère. Elle n'utilise jamais
la base Supabase et ne déploie pas sur Vercel.

## Reprise du raccordement

Le code peut être validé localement sans accès aux comptes externes.
Pour finaliser le staging, il reste à inspecter le projet Supabase, configurer
les deux URL dans Vercel, déployer dev puis vérifier le healthcheck distant.
Ces opérations ne sont pas attestées par une simple authentification MCP.
## Validation locale du raccordement — 13 novembre 2026

31 tests API réussis, dont l'isolation RLS et le contrôle des migrations par
branche. Installation npm ci, lint sans erreur, build web et image Docker validés.
Le build staging a été simulé avec une DATABASE_URL invalide et une DIRECT_URL
locale valide : migrations et build réussis, confirmant le choix de connexion.
La base Supabase distante et les variables Vercel restent à configurer.
