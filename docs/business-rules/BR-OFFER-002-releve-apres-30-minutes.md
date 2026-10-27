---
id: BR-OFFER-002
domaine: OFFER
titre: Une fiche ouverte relit les offres de plus de 30 minutes
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-consulter-un-produit.md
maj: 2026-10-27
---

# BR-OFFER-002 — Une fiche ouverte relit les offres de plus de 30 minutes

## Règle

À l'ouverture d'une fiche produit, si une offre a été relevée il y a 30 minutes ou plus, toutes les offres du produit sont relues en arrière-plan ; la page indique l'actualisation et se met à jour.

## Application (code)

- `server/src/domain/rules/offers.ts::isDue`
- `server/src/domain/usecases/product/get-product.usecase.ts::GetProductUseCase`

## Vérification

- Test : `server/src/domain/usecases/__tests__/product.test.ts::"should refresh in the background after 30 minutes"`

## Cas limites

- une seule actualisation à la fois par produit

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
