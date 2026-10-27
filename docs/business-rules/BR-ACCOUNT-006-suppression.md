---
id: BR-ACCOUNT-006
domaine: ACCOUNT
titre: Suppression du compte confirmée par le mot de passe
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-creer-un-compte.md
maj: 2026-10-27
---

# BR-ACCOUNT-006 — Suppression du compte confirmée par le mot de passe

## Règle

La suppression du compte demande le mot de passe et efface immédiatement le compte, ses suivis et ses sessions.

## Application (code)

- `server/src/domain/usecases/account/account.usecases.ts::DeleteAccountUseCase`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should delete the account with its follows and sessions"`

## Cas limites

- mauvais mot de passe → « Mot de passe incorrect. », rien n'est supprimé

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
