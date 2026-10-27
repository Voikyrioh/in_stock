---
id: BR-SCRAPE-001
domaine: SCRAPE
titre: Le robots.txt de chaque site est respecté
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SCRAPE-001 — Le robots.txt de chaque site est respecté

## Règle

Avant toute page, le robot lit le robots.txt du site (cache 12 h) et applique le groupe « InStockBot », sinon « * ». Fichier absent (4xx) : tout est permis. Fichier injoignable (5xx, réseau) : rien n'est lu pendant 2 minutes (signalé comme site injoignable). Une page interdite n'est jamais téléchargée.

## Application (code)

- `server/src/data-access/scraping/robots.ts::RobotsPolicy (HORS DOMAIN : protocole technique, règle invariante du robot)`

## Vérification

- Test : `server/src/data-access/scraping/__tests__/robot.test.ts::"BR-SCRAPE-001 robots.txt"`

## Cas limites

- recherche interdite → boutique « Lecture interdite par la boutique » (BR-SHOP-001)

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
