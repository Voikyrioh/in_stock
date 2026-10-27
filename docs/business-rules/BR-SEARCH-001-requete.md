---
id: BR-SEARCH-001
domaine: SEARCH
titre: Une recherche fait 2 à 100 caractères
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-001 — Une recherche fait 2 à 100 caractères

## Règle

Après suppression des espaces en trop, une recherche fait de 2 à 100 caractères. La casse et les espaces multiples ne changent pas son sens (même clé de cache). Un texte qui commence par http:// ou https:// n'est pas une recherche mais un ajout par lien.

## Application (code)

- `server/src/domain/rules/query.ts::cleanQuery`
- `server/src/domain/rules/query.ts::queryKey`
- `server/src/domain/rules/query.ts::looksLikeUrl`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-SEARCH-001 query"`

## Cas limites

- « a » → refusée
- « RTX  4070 » = « rtx 4070 »

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
