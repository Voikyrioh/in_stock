---
id: BR-SEARCH-005
domaine: SEARCH
titre: Tri : disponibilité puis prix
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-005 — Tri : disponibilité puis prix

## Règle

Tri par défaut : état de stock dans l'ordre de BR-STOCK-001, puis prix croissant, prix inconnus en dernier. Les tris « Prix croissant » et « Prix décroissant » ignorent le stock, prix inconnus toujours en dernier.

## Application (code)

- `server/src/domain/rules/offers.ts::compareOffers`
- `web/src/lib/sort.ts::sortOffers (même règle côté client après filtre)`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-SEARCH-005 / BR-OFFER-005 offers"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
