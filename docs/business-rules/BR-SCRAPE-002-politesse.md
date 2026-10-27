---
id: BR-SCRAPE-002
domaine: SCRAPE
titre: Une requête à la fois par site, 2 s d'écart, pause sur demande
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SCRAPE-002 — Une requête à la fois par site, 2 s d'écart, pause sur demande

## Règle

Une seule requête à la fois par site (www et sans www confondus), au moins 2 secondes entre deux débuts de requête au même site, 8 requêtes simultanées au plus en tout. Une réponse 429/503 ou une page anti-robot met le site en pause 10 minutes (ou la durée de Retry-After, entre 1 min et 1 h).

## Application (code)

- `server/src/data-access/scraping/host-queue.ts::HostQueue (HORS DOMAIN : invariant du robot)`

## Vérification

- Test : `server/src/data-access/scraping/__tests__/robot.test.ts::"BR-SCRAPE-002 per-site queue"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
