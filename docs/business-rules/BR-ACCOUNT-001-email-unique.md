---
id: BR-ACCOUNT-001
domaine: ACCOUNT
titre: Un email, un compte
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-creer-un-compte.md
maj: 2026-10-27
---

# BR-ACCOUNT-001 — Un email, un compte

## Règle

Un email identifie un seul compte, sans tenir compte des majuscules ni des espaces autour (stocké en minuscules). Inscription avec un email pris : « Un compte existe déjà avec cet email. Connectez-vous. »

## Application (code)

- `server/src/domain/rules/account.ts::normaliseEmail`
- `server/src/domain/usecases/account/account.usecases.ts::RegisterUseCase`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should refuse a taken email"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
