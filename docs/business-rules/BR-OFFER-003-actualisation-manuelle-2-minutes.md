---
id: BR-OFFER-003
domaine: OFFER
titre: Actualisation manuelle au plus toutes les 2 minutes
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-consulter-un-produit.md
maj: 2026-10-27
---

# BR-OFFER-003 — Actualisation manuelle au plus toutes les 2 minutes

## Règle

« Actualiser » est refusé tant que toutes les offres du produit ont été relevées il y a moins de 2 minutes : « Les prix viennent d'être relevés. Réessayez dans 2 minutes. » Si une actualisation est déjà en cours, la demande l'attend au lieu d'être refusée.

## Application (code)

- `server/src/domain/rules/offers.ts::refreshCooldownLeft`
- `server/src/domain/usecases/product/refresh-product.usecase.ts::RefreshProductUseCase`

## Vérification

- Test : `server/src/domain/usecases/__tests__/product.test.ts::"should refuse a manual refresh within 2 minutes"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
