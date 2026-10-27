---
id: BR-SEARCH-002
domaine: SEARCH
titre: Toutes les boutiques en parallèle, 20 s chacune
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-002 — Toutes les boutiques en parallèle, 20 s chacune

## Règle

Une recherche interroge en parallèle toutes les boutiques actives qui savent chercher. Chaque boutique a 20 secondes au plus ; au-delà elle est marquée « trop lente, ignorée » pour cette recherche, sans retarder les autres.

## Application (code)

- `server/src/domain/usecases/search/search-runs.ts::SearchRuns.start`
- `server/src/domain/usecases/search/search-runs.ts::SearchShopUseCase.Execute`

## Vérification

- Test : `server/src/domain/usecases/__tests__/search.test.ts::"should not wait for a slow shop"`

## Cas limites

- boutique en échec ou bloquée → statut propre, les autres continuent

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
