---
id: BR-ACCOUNT-003
domaine: ACCOUNT
titre: La connexion ne révèle pas si l'email existe
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-creer-un-compte.md
maj: 2026-10-27
---

# BR-ACCOUNT-003 — La connexion ne révèle pas si l'email existe

## Règle

Email inconnu et mauvais mot de passe donnent le même message « Email ou mot de passe incorrect. » et le même coût de vérification.

## Application (code)

- `server/src/domain/usecases/account/account.usecases.ts::LoginUseCase`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should answer the same for unknown email and wrong password"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
