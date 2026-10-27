---
id: BR-STOCK-002
domaine: STOCK
titre: Correspondance des états publiés par les boutiques
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-consulter-un-produit.md
maj: 2026-10-27
---

# BR-STOCK-002 — Correspondance des états publiés par les boutiques

## Règle

schema.org : InStock/OnlineOnly → En stock ; LimitedAvailability → Stock limité ; PreOrder/PreSale → Précommande ; BackOrder/MadeToOrder → Réapprovisionnement ; OutOfStock/SoldOut/InStoreOnly/Reserved → Rupture ; Discontinued → Arrêté. Textes FR/EN : formulations négatives d'abord (« indisponible » contient « disponible »), puis précommande, réapprovisionnement (« disponible sous », « expédié sous N jours »), stock limité, en stock.

## Application (code)

- `server/src/domain/rules/stock.ts::stockFromAvailability`
- `server/src/domain/rules/stock.ts::stockFromText`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-STOCK-002 stock mapping"`

## Cas limites

- « Expédié sous 24h » → En stock
- classe LDLC stock-1/stock-9/autre → En stock/Rupture/Réapprovisionnement (listing.ts::stockFromCard, HORS DOMAIN : spécifique boutique)

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
