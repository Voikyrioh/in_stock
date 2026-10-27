---
id: BR-FOLLOW-001
domaine: FOLLOW
titre: Suivre demande un compte, une seule fois
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-suivre-un-produit.md
maj: 2026-10-27
---

# BR-FOLLOW-001 — Suivre demande un compte, une seule fois

## Règle

Suivre un produit demande d'être connecté ; un produit est suivi une seule fois par compte (suivre deux fois ne change rien).

## Application (code)

- `server/src/domain/usecases/follow/follow.usecases.ts::FollowUseCase`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should follow once"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
