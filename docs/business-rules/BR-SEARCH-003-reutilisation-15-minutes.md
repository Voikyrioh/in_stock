---
id: BR-SEARCH-003
domaine: SEARCH
titre: Résultats réutilisés 15 minutes
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-003 — Résultats réutilisés 15 minutes

## Règle

Le résultat d'une boutique pour une même recherche est réutilisé pendant 15 minutes (en mémoire, puis table search_cache après un redémarrage). L'heure du relevé est affichée.

## Application (code)

- `server/src/domain/usecases/search/search-runs.ts::SearchRuns.start`
- `server/src/domain/usecases/search/search-runs.ts::SearchShopUseCase.Execute`

## Vérification

- Test : `server/src/domain/usecases/__tests__/search.test.ts::"should reuse the same search and the cache"`

## Cas limites

- au-delà de 15 min → nouvelle lecture

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
