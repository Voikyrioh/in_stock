---
id: BR-FOLLOW-003
domaine: FOLLOW
titre: Relevé automatique des produits suivis
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-suivre-un-produit.md
maj: 2026-10-27
---

# BR-FOLLOW-003 — Relevé automatique des produits suivis

## Règle

Les offres d'un produit suivi par au moins un compte sont relues dès qu'elles ont 30 minutes : chaque minute, les 20 offres suivies les plus anciennes sont relues (étalement pour ménager les boutiques).

## Application (code)

- `server/src/domain/usecases/refresh/refresh-due-offers.usecase.ts::RefreshDueOffersUseCase`
- `server/src/domain/rules/offers.ts::isDue`

## Vérification

- Test : `server/src/domain/usecases/__tests__/account-follow.test.ts::"should read followed offers older than 30 minutes"`

## Cas limites

- plus de 600 offres suivies → le délai dépasse 30 min (augmenter batchSize)

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
