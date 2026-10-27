---
id: BR-ADD-001
domaine: ADD
titre: 10 ajouts par lien par minute
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-ADD-001 — 10 ajouts par lien par minute

## Règle

Un visiteur ajoute au plus 10 produits par lien par minute ; au-delà : « Trop d'ajouts d'affilée. Réessayez dans une minute. »

## Application (code)

- `server/src/entry-points/routes/api.routes.ts::apiRoutes (addLimit — HORS DOMAIN : limite d'accès)`

## Vérification

- Test : `Vérification : même mécanisme que BR-SEARCH-007 (http.test.ts)`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
