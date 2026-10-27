---
id: BR-SCRAPE-001
domaine: SCRAPE
titre: robots.txt selon qui demande la lecture
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SCRAPE-001 — robots.txt selon qui demande la lecture

## Règle

Le robot télécharge le robots.txt de chaque site (cache 12 h).
- **Relevé planifié des produits suivis** (personne n'attend la réponse : c'est un robot au sens de RFC 9309) : tout le fichier s'applique, groupe « InStockBot » sinon « * ». Fichier absent (4xx) : tout est permis. Fichier injoignable (5xx, réseau) : rien n'est lu pendant 2 minutes. Une page interdite n'est jamais téléchargée.
- **Lecture demandée par une personne** (recherche, complétion des fiches d'une recherche, ajout par lien, fiche ouverte, « Actualiser ») : seuls les groupes qui nomment « InStockBot » s'appliquent ; les groupes « * » sont ignorés, comme pour un navigateur. Fichier absent ou injoignable : la page est lue.
- Dans tous les cas, une règle qui nomme InStockBot est respectée.

## Application (code)

- `server/src/domain/rules/robots.ts::robotsScope` — qui demande → quelles règles
- `server/src/data-access/scraping/robots.ts::RobotsPolicy` et `::namedGroupsOnly` — lecture du fichier
- `server/src/data-access/scraping/http-scraper.ts::HttpScraper.fetch` — appliqué à chaque requête selon `ReadOptions.trigger`

## Vérification

- Tests : `server/src/data-access/scraping/__tests__/robot.test.ts::"BR-SCRAPE-001 robots.txt"` et `::"BR-SCRAPE-001 who asked for the page"`, `server/src/domain/rules/__tests__/rules.test.ts::"BR-SCRAPE-001 robots.txt scope"`

## Cas limites

- `User-agent: *` + `Disallow: /recherche/` → la recherche d'une personne est lue, le relevé planifié d'une page /recherche/ ne le serait pas
- `User-agent: InStockBot` + `Disallow: /` → plus rien n'est lu sur ce site → boutique « Lecture interdite par la boutique » (BR-SHOP-001)

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
- 2026-10-27 — révision : robots.txt complet pour le relevé planifié, groupes nommant InStockBot seulement pour les lectures demandées par une personne (ADR-0003, décision Voiky)
