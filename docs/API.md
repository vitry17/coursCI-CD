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

### `POST /api/auth/logout` (patient)

- `204` : cookie supprimé.

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

- `204`, cookie supprimé.

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
