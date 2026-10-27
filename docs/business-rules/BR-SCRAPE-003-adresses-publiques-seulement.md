---
id: BR-SCRAPE-003
domaine: SCRAPE
titre: Le robot ne lit que des adresses publiques
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SCRAPE-003 — Le robot ne lit que des adresses publiques

## Règle

Un lien n'est lu que s'il est en http ou https, sur le port standard, sans identifiants, vers un nom qui se résout uniquement en adresses publiques d'Internet (jamais localhost, réseaux privés, lien local, métadonnées cloud, plages réservées). Vérifié à chaque redirection (3 au plus) et au moment de la connexion. 10 secondes et 3 Mo au plus par page.

## Application (code)

- `server/src/domain/rules/url.ts::checkUrlShape`
- `server/src/data-access/scraping/ssrf-guard.ts::isPublicAddress`
- `server/src/data-access/scraping/ssrf-guard.ts::guardedLookup`
- `server/src/data-access/scraping/http-client.ts::SafeHttpClient.get`

## Vérification

- Test : `server/src/data-access/scraping/__tests__/robot.test.ts::"BR-SCRAPE-003 address guard"`

## Cas limites

- IPv6 mappée IPv4 privée → refusée
- nom public résolu en 127.0.0.1 → refusé au connect

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
