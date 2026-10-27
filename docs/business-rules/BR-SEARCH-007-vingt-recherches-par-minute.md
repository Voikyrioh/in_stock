---
id: BR-SEARCH-007
domaine: SEARCH
titre: 20 recherches par minute
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-007 — 20 recherches par minute

## Règle

Un visiteur lance au plus 20 recherches par minute ; au-delà : « Trop de recherches d'affilée. Réessayez dans une minute. »

## Application (code)

- `server/src/entry-points/routes/api.routes.ts::apiRoutes (searchLimit — HORS DOMAIN : limite d'accès)`

## Vérification

- Test : `server/src/entry-points/__tests__/http.test.ts::"limits searches to 20 per minute"`

## Cas limites

- le visiteur est identifié par cf-connecting-ip, jamais stocké

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
