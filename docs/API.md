# Contrat de l'API REST

- Base URL : `/api`
- Format : JSON (`Content-Type: application/json`)
- Dates : ISO 8601 en UTC (`2026-10-07T07:00:00.000Z`). Le front les affiche en heure de Paris.
- Authentification : cookie `httpOnly` `token` (JWT), posé par `/auth/login`.

## Légende des accès

| Accès | Signification |
|---|---|
| Public | Aucune authentification |
| Patient | Utilisateur connecté (rôle `PATIENT` ou `ADMIN`) |
| Admin | Rôle `ADMIN` uniquement |

## Format des erreurs

```json
{
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "Ce créneau n'est plus disponible."
  }
}
```

| HTTP | Cas |
|---|---|
| 400 | Données invalides (`VALIDATION_ERROR`, avec le détail des champs) |
| 401 | Non connecté ou token invalide (`UNAUTHENTICATED`) |
| 403 | Rôle insuffisant ou ressource d'un autre utilisateur (`FORBIDDEN`) |
| 404 | Ressource introuvable (`NOT_FOUND`) |
| 409 | Conflit métier (`EMAIL_TAKEN`, `SLOT_ALREADY_BOOKED`, `ONE_PER_WEDNESDAY`) |
| 422 | Règle métier non respectée (`TOO_LATE`, `NOT_A_SLOT`, `DAY_CLOSED`) |
| 500 | Erreur serveur (`INTERNAL_ERROR`) |

---

## Santé

### `GET /api/health` (public)

Utilisé par la CI et le déploiement.

```json
200 { "status": "ok", "db": "ok" }
503 { "status": "error", "db": "error" }
```

---

## Authentification

### `POST /api/auth/register` (public)

```json
{
  "firstName": "Léa",
  "lastName": "Martin",
  "email": "lea@example.com",
  "phone": "0612345678",
  "password": "motdepasse1"
}
```

- `201` : utilisateur créé (sans `passwordHash`), cookie posé.
- `400` : validation. `409` : `EMAIL_TAKEN`.

### `POST /api/auth/login` (public)

```json
{ "email": "lea@example.com", "password": "motdepasse1" }
```

- `200` : `{ "user": { ... } }` et cookie posé.
- `401` : identifiants invalides (même message que l'email existe ou non).

### `POST /api/auth/logout` (public, idempotent)

- `204` : cookie supprimé, même si la session est absente ou expirée.

### `GET /api/auth/me` (patient)

```json
200 {
  "user": {
    "id": "uuid",
    "firstName": "Léa",
    "lastName": "Martin",
    "email": "lea@example.com",
    "phone": "0612345678",
    "role": "PATIENT"
  }
}
```

---

## Profil

### `PATCH /api/users/me` (patient)

Champs modifiables : `firstName`, `lastName`, `phone`.

- `200` : utilisateur mis à jour.

### `DELETE /api/users/me` (patient)

Supprime le compte et ses rendez-vous (R11). Interdit pour le compte admin.

- `204`, cookie supprimé, même si la session est absente ou expirée.

---

## Créneaux

### `GET /api/slots?from=2026-10-01&to=2026-10-31` (public)

`from` et `to` sont facultatifs : par défaut, d'aujourd'hui à +8 semaines.

```json
200 {
  "days": [
    {
      "date": "2026-10-07",
      "closed": false,
      "slots": [
        { "startAt": "2026-10-07T07:00:00.000Z", "endAt": "2026-10-07T08:00:00.000Z", "available": true },
        { "startAt": "2026-10-07T08:00:00.000Z", "endAt": "2026-10-07T09:00:00.000Z", "available": false }
      ]
    },
    { "date": "2026-10-14", "closed": true, "reason": "Congés", "slots": [] }
  ]
}
```

Aucune information sur le patient n'est exposée.

---

## Rendez-vous (patient)

### `POST /api/appointments` (patient)

```json
{ "startAt": "2026-10-07T07:00:00.000Z", "reason": "Fatigue chronique" }
```

- `201` : rendez-vous créé (`status: "BOOKED"`).
- `409` : `SLOT_ALREADY_BOOKED`, `ONE_PER_WEDNESDAY`.
- `422` : `NOT_A_SLOT` (pas un mercredi ou pas un horaire de créneau), `TOO_LATE` (< 24 h ou > 8 semaines), `DAY_CLOSED`.

### `GET /api/appointments/me?scope=upcoming|past` (patient)

```json
200 {
  "appointments": [
    { "id": "uuid", "startAt": "...", "endAt": "...", "status": "BOOKED", "reason": "..." }
  ]
}
```

### `PATCH /api/appointments/:id/cancel` (patient)

- `200` : `status: "CANCELLED"`.
- `403` : le rendez-vous n'appartient pas à l'utilisateur.
- `422` : `TOO_LATE` (moins de 24 h avant, R6).

---

## Administration

### `GET /api/admin/appointments?date=2026-10-07` (admin)

Planning d'un mercredi, avec les coordonnées des patients.

```json
200 {
  "date": "2026-10-07",
  "appointments": [
    {
      "id": "uuid",
      "startAt": "...",
      "status": "BOOKED",
      "reason": "...",
      "patient": { "id": "uuid", "firstName": "Léa", "lastName": "Martin", "phone": "0612345678", "email": "lea@example.com" }
    }
  ]
}
```

### `PATCH /api/admin/appointments/:id/cancel` (admin)

Annulation sans contrainte de délai (R7). `200`.

### `GET /api/admin/users` (admin)

Liste paginée des patients : `?page=1&limit=20&search=martin`.

### `GET /api/closed-days` (public)

Liste des mercredis fermés à venir.

### `POST /api/admin/closed-days` (admin)

```json
{ "date": "2026-10-14", "reason": "Congés" }
```

- `201`.
- `422` si la date n'est pas un mercredi.
- `409` si des rendez-vous `BOOKED` existent ce jour-là, sauf avec `?force=true`, qui les annule.

### `DELETE /api/admin/closed-days/:id` (admin)

Rouvre le mercredi. `204`.

## Précisions de sécurité du lot 2

- Les réponses d'authentification portent Cache-Control: no-store.
- JWT HS256 uniquement, expiration et identifiant utilisateur obligatoires ; le rôle est relu en base à chaque requête protégée.
- JWT_SECRET doit être aléatoire, contenir au moins 32 octets et différer de la valeur exemple. L'API refuse de démarrer sinon. Génération : node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))".
- Validation Zod : email normalisé, mot de passe de 8 caractères minimum avec lettre et chiffre, limité à 72 octets UTF-8 pour éviter la troncature bcrypt.
- Deux inscriptions concurrentes avec le même email donnent 201 et 409 EMAIL_TAKEN.
- Connexion : 10 requêtes par IP et par fenêtre de 15 minutes, puis 429 TOO_MANY_REQUESTS et Retry-After. Limitation active aussi pendant les tests.
- Le store du limiteur est en mémoire par instance. Un store partagé ou une règle de pare-feu adaptée est requis avant une ouverture en production multi-instance ; le staging reste protégé par Vercel.
- Sur Vercel seulement, Express fait confiance au proxy de la plateforme, qui réécrit X-Forwarded-For ([documentation](https://vercel.com/docs/headers/request-headers#x-forwarded-for)). En local, les en-têtes proxy du client ne sont pas fiables.
- Déconnexion : effacement du cookie navigateur, pas de révocation serveur des JWT déjà copiés ; ils restent valides jusqu'à expiration. La suppression du compte invalide immédiatement l'accès grâce à la relecture en base.
- JSON malformé : 400 VALIDATION_ERROR. Corps trop volumineux : 413 PAYLOAD_TOO_LARGE.

Vérifications des bibliothèques : [JWT](https://github.com/auth0/node-jsonwebtoken), [Zod](https://zod.dev/api), [limiteur](https://express-rate-limit.mintlify.app/reference/configuration).
