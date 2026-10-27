---
id: BR-FOLLOW-004
domaine: FOLLOW
titre: Ordre de « Mes suivis »
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-suivre-un-produit.md
maj: 2026-10-27
---

# BR-FOLLOW-004 — Ordre de « Mes suivis »

## Règle

Les produits avec au moins une offre commandable d'abord, puis par meilleur prix croissant (prix inconnus après), puis du plus récemment suivi au plus ancien.

## Application (code)

- `server/src/domain/rules/follows.ts::compareFollows`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"should sort follows"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
