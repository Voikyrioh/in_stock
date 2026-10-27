---
id: BR-SHOP-002
domaine: SHOP
titre: Une boutique inconnue est nommée par son domaine
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SHOP-002 — Une boutique inconnue est nommée par son domaine

## Règle

Une offre d'une boutique absente du catalogue est rattachée à son nom de domaine sans « www. » (ex. boutique-pc.fr) ; elle n'a pas d'état de santé.

## Application (code)

- `server/src/domain/rules/url.ts::shopNameFromHost`

## Vérification

- Test : `server/src/domain/usecases/__tests__/product.test.ts::"should name an unlisted shop by its domain"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
