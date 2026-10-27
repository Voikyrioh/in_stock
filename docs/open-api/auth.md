# API — Comptes et sessions

Session : cookie `__Host-instock_session` (production) / `instock_session` (dev), HttpOnly, Secure, SameSite=Lax, Path=/, 30 jours glissants (BR-ACCOUNT-005). Limite : 10 tentatives / 15 min / visiteur sur register, login et suppression (BR-ACCOUNT-004).

## `POST /api/auth/register`

Corps `{ "email", "password" }`. **201** `{ "user": { "id", "email", "createdAt" } }` + cookie.

| HTTP | code | reason | Quand |
|---|---|---|---|
| 400 | invalid-payload | — | `details[0].field` = `email` ou `password` (10 à 128 caractères) |
| 409 | conflict | email-taken | email déjà utilisé (BR-ACCOUNT-001) |
| 429 | rate-limited | auth | trop de tentatives |

## `POST /api/auth/login`

Corps `{ "email", "password" }`. **200** `{ "user" }` + cookie. **401** `unauthorized` / `bad-credentials` (même réponse pour email inconnu, BR-ACCOUNT-003).

## `POST /api/auth/logout`

**204**, session supprimée, cookie effacé.

## `GET /api/auth/me`

**200** `{ "user" }` ; **401** `unauthorized` / `no-session`.

## `DELETE /api/account`

Session requise. Corps `{ "password" }`. **204** : compte, suivis et sessions effacés (BR-ACCOUNT-006). **401** `bad-password`.
