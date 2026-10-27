---
id: BR-OFFER-005
domaine: OFFER
titre: Meilleur prix en stock
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-consulter-un-produit.md
maj: 2026-10-27
---

# BR-OFFER-005 — Meilleur prix en stock

## Règle

Le « Meilleur prix en stock » est l'offre En stock ou Stock limité, au prix connu, en euros, la moins chère. Une offre sans prix ou dans une autre devise n'est jamais mise en avant.

## Application (code)

- `server/src/domain/rules/offers.ts::bestOffer`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"should pick the cheapest available offer in euros"`

## Cas limites

- aucune offre commandable → « Aucune boutique ne l'a en stock pour le moment. »

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
