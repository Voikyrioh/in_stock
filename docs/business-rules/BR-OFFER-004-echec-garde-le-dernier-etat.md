---
id: BR-OFFER-004
domaine: OFFER
titre: Un relevé en échec garde le dernier état connu
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-consulter-un-produit.md
maj: 2026-10-27
---

# BR-OFFER-004 — Un relevé en échec garde le dernier état connu

## Règle

Quand la lecture d'une offre échoue, son prix et son stock ne changent pas ; elle est marquée « Relevé impossible, dernier état connu » jusqu'au prochain relevé réussi.

## Application (code)

- `server/src/domain/entities/offer.ts::Offer.withFailure`
- `server/src/domain/usecases/product/product-refresher.ts::ProductRefresher.refreshOffer`

## Vérification

- Test : `server/src/domain/usecases/__tests__/product.test.ts::"should keep the last known state when a reading fails"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
