---
id: BR-ACCOUNT-002
domaine: ACCOUNT
titre: Mot de passe de 10 à 128 caractères, jamais en clair
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-creer-un-compte.md
maj: 2026-10-27
---

# BR-ACCOUNT-002 — Mot de passe de 10 à 128 caractères, jamais en clair

## Règle

Un mot de passe fait de 10 à 128 caractères ; seul son hachage argon2id est conservé.

## Application (code)

- `server/src/domain/rules/account.ts::isValidPassword`
- `server/src/data-access/security/argon2-hasher.ts::Argon2PasswordHasher`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should validate email and password"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
