---
id: BR-ACCOUNT-005
domaine: ACCOUNT
titre: Session de 30 jours glissants
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-creer-un-compte.md
maj: 2026-10-27
---

# BR-ACCOUNT-005 — Session de 30 jours glissants

## Règle

Une session dure 30 jours après sa dernière utilisation (prolongée au plus une fois par jour) ; la déconnexion la rend immédiatement invalide ; une session expirée est supprimée.

## Application (code)

- `server/src/domain/rules/account.ts::SESSION_TTL_MS`
- `server/src/domain/usecases/account/session-service.ts::SessionService`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should expire sessions after 30 days"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
