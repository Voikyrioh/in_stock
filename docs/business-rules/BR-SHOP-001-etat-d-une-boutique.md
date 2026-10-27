---
id: BR-SHOP-001
domaine: SHOP
titre: État affiché d'une boutique
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-etat-des-boutiques.md
maj: 2026-10-27
---

# BR-SHOP-001 — État affiché d'une boutique

## Règle

« Lecture interdite par la boutique » si son robots.txt interdit la recherche ; « Indisponible » pendant une pause demandée par la boutique ou à partir de 3 échecs consécutifs ; « Perturbée » après 1 ou 2 échecs ; « Opérationnelle » si le dernier relevé a réussi ; « Pas encore interrogée » sinon. Seule une recherche réussie lève l'interdiction robots.txt.

## Application (code)

- `server/src/domain/rules/shop-state.ts::shopState`
- `server/src/domain/entities/shop-health.ts::ShopHealth`
- `server/src/domain/usecases/shared/shop-health-recorder.ts::ShopHealthRecorder`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-SHOP-001 shop state"`

## Cas limites

- robots.txt qui interdit une fiche (pas la recherche) → pas d'effet sur l'état

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
