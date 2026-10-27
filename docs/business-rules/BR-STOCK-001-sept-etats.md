---
id: BR-STOCK-001
domaine: STOCK
titre: Sept états de stock
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-STOCK-001 — Sept états de stock

## Règle

Toute offre a un état parmi : En stock, Stock limité, Précommande, Réapprovisionnement, Inconnu, Rupture, Arrêté. Cet ordre est l'ordre de priorité d'affichage. Seuls En stock et Stock limité sont « commandables ».

## Application (code)

- `shared/src/stock.ts::STOCK_STATES`
- `shared/src/stock.ts::isAvailable`

## Vérification

- Test : `web/src/__tests__/lib.test.ts::"sort and filter"`

## Cas limites

- état non reconnu → Inconnu

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
