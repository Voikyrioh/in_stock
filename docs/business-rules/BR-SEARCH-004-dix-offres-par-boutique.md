---
id: BR-SEARCH-004
domaine: SEARCH
titre: 10 offres par boutique, 4 complétées
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-SEARCH-004 — 10 offres par boutique, 4 complétées

## Règle

Au plus 10 offres par boutique et par recherche. Quand la page de résultats ne donne ni prix ni stock, les 4 premières offres incomplètes sont complétées en lisant leur fiche (dans le délai de la boutique).

## Application (code)

- `server/src/data-access/scraping/http-scraper.ts::HttpScraper.searchWithDiagnostics (HORS DOMAIN : borne technique du robot)`

## Vérification

- Test : `server/src/data-access/scraping/__tests__/extraction.test.ts::"should cap the offers per shop"`

## Cas limites

- fiche lente pendant la complétion → l'offre garde ce que la liste donnait

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
