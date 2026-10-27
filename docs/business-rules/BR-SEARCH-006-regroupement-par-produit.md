---
id: BR-SEARCH-006
domaine: SEARCH
titre: Deux offres sont le même produit si elles partagent un EAN ou marque + référence
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-006 — Deux offres sont le même produit si elles partagent un EAN ou marque + référence

## Règle

Deux offres sont regroupées sous un même produit si elles ont le même GTIN/EAN valide (clé de contrôle vérifiée, complété à 14 chiffres), sinon la même marque (casse ignorée) et la même référence fabricant (majuscules, sans espaces). Sans ces informations, une offre forme son propre produit (pas de regroupement hasardeux sur le nom).

## Application (code)

- `server/src/domain/rules/grouping.ts::groupingKey`
- `server/src/domain/usecases/shared/offer-recorder.ts::OfferRecorder.productFor`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-SEARCH-006 grouping"`

## Cas limites

- EAN à clé fausse → ignoré
- EAN déjà porté par un autre produit lors d'un enrichissement → non ajouté

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
