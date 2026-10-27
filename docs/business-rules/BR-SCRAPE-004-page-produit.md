---
id: BR-SCRAPE-004
domaine: SCRAPE
titre: Une page est un produit si elle a un nom et un prix ou un stock
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SCRAPE-004 — Une page est un produit si elle a un nom et un prix ou un stock

## Règle

Une page devient une offre si l'extraction donne au moins un nom et (un prix ou un état de stock connu). Sinon : « Nous n'avons pas trouvé de produit sur cette page. »

## Application (code)

- `server/src/domain/rules/product.ts::isReadableProduct`
- `server/src/data-access/scraping/extract/product-page.ts::isProduct` (appel depuis le robot)

## Vérification

- Test : `server/src/data-access/scraping/__tests__/extraction.test.ts::"should refuse a page without product"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
