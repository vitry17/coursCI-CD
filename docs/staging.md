# Staging & déploiement (Vercel)

Ce document décrit comment le projet **naturo-rdv** est déployé, avec un
environnement de **staging** (recette) distinct de la **production**.

## Principe : CI ≠ CD

On sépare les deux rôles pour ne rien dupliquer :

| Outil              | Rôle | Quand                              |
| ------------------ | ---- | ---------------------------------- |
| **GitHub Actions** | CI   | lint + tests + build de vérif      |
| **Vercel**         | CD   | déploie automatiquement à chaque push |

> GitHub Actions ne déploie rien, Vercel ne relit pas la qualité du code.
> GitHub = qualité du code, Vercel = livraison.

GitHub Actions est **gratuit** ici car le dépôt est **public** (runners
standard illimités). Vercel est utilisé en plan **Hobby** (gratuit,
usage non-commercial — OK pour un projet d'école).

## Modèle de branches → environnements

| Branche      | Environnement Vercel     | URL                                   |
| ------------ | ------------------------ | ------------------------------------- |
| `main`       | **Production**           | URL stable de prod                    |
| `dev`        | **Staging** (preview)    | URL stable de staging                 |
| `feature/*`  | **Preview** (éphémère)   | 1 URL générée automatiquement par PR  |

Flux : `feature/*` → PR (preview + CI verte) → merge dans `dev` (staging) →
merge `dev` → `main` (production).

## Architecture de déploiement (Pattern A : tout sur Vercel)

Le front (Vite/React) **et** l'API (Express) sont servis par **un seul projet
Vercel**, sur la **même origine** :

- le front statique est servi depuis `web/dist` ;
- l'API Express tourne en **fonction serverless** via `api/index.js`, exposée
  sous `/api/*`.

Tout est configuré dans [`vercel.json`](../vercel.json) :

- `@vercel/static-build` construit `web/` → `web/dist` ;
- `@vercel/node` empaquette `api/index.js` (qui réutilise `api/src/app.js`) ;
- les `routes` envoient `/api/*` vers la fonction, le reste vers le front.

Comme front et API partagent la même origine, **aucune variable `VITE_API_URL`
n'est nécessaire** et **CORS est inutile** entre les deux : le front appelle
simplement `/api/...` (voir `web/src/App.jsx` qui lit `/api/health`). Le proxy
Vite (`web/vite.config.js`) fait la même chose en local.

## Mise en place côté Vercel (à faire une fois, dans le dashboard)

Ces étapes se font sur https://vercel.com (je ne peux pas les faire à ta place) :

1. **Add New… → Project** → importer le dépôt `vitry17/coursCI-CD`.
2. **Root Directory** : laisser la **racine du dépôt** (c'est `vercel.json` qui
   pilote le build, pas un sous-dossier).
3. **Framework Preset** : `Other` (la config vient de `vercel.json`).
4. **Settings → Git → Production Branch** : `main`.
5. **Deploy**. Vercel crée l'URL de production (branche `main`) et génère une
   URL de preview pour chaque autre branche / PR.

### Variables d'environnement

À définir dans **Settings → Environment Variables**, en les **cloisonnant par
environnement** (Production vs Preview) — ne jamais mettre les secrets de prod
en staging :

| Variable        | Prod | Preview/Staging | Remarque                               |
| --------------- | ---- | --------------- | -------------------------------------- |
| `DATABASE_URL`  | ✅   | ✅ (autre base) | quand une vraie base sera branchée     |
| `JWT_SECRET`    | ✅   | ✅ (différent)  | secret distinct par environnement      |
| `CORS_ORIGIN`   | —    | —               | inutile en Pattern A (same-origin)     |

Tant que l'API n'a que `/api/health`, aucune variable n'est obligatoire.

## Tester que ça marche

- **En local** : `npm run dev` (lance front + API), ouvrir http://localhost:5173
  → la page doit afficher « API : ok » (le front appelle `/api/health` via le
  proxy Vite).
- **En preview/staging** : ouvrir l'URL Vercel de la branche → même affichage
  « API : ok », ce qui prouve que la fonction serverless répond.
- **Endpoint direct** : `https://<url-vercel>/api/health` doit renvoyer
  `{"status":"ok"}`.

## Évolutions possibles

- Ajouter un test front (Vitest) sur le composant `App` (ex. mock de `fetch`).
- Si l'API devient un vrai serveur long-running (websockets, jobs), envisager
  le **Pattern B** : front sur Vercel + API conteneurisée (le `Dockerfile`
  existe déjà) sur un hébergeur dédié.
