---
id: BR-ACCOUNT-004
domaine: ACCOUNT
titre: 10 tentatives par 15 minutes
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-creer-un-compte.md
maj: 2026-10-27
---

# BR-ACCOUNT-004 — 10 tentatives par 15 minutes

## Règle

Un visiteur fait au plus 10 tentatives de connexion, d'inscription ou de suppression de compte par 15 minutes : « Trop de tentatives. Réessayez dans 15 minutes. »

## Application (code)

- `server/src/entry-points/routes/api.routes.ts::apiRoutes (authLimit — HORS DOMAIN : limite d'accès)`

## Vérification

- Test : `server/src/entry-points/__tests__/http.test.ts::"wrong credentials answer 401 bad-credentials, then 429"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
