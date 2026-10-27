---
id: BR-FOLLOW-002
domaine: FOLLOW
titre: 100 produits suivis au plus
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-suivre-un-produit.md
maj: 2026-10-27
---

# BR-FOLLOW-002 — 100 produits suivis au plus

## Règle

Un compte suit au plus 100 produits : « Vous suivez déjà 100 produits. Retirez-en un pour en suivre un nouveau. »

## Application (code)

- `server/src/domain/rules/follows.ts::canFollowMore`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should cap follows at 100"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
