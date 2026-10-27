---
id: BR-SHOP-003
domaine: SHOP
titre: Le robot dit toujours qui il est
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-etat-des-boutiques.md
maj: 2026-10-27
---

# BR-SHOP-003 — Le robot dit toujours qui il est

## Règle

Chaque requête porte « Mozilla/5.0 (compatible; InStockBot/1.0; +<origine publique>/robot) » ; la page /robot explique les règles suivies et comment interdire le robot.

## Application (code)

- `server/src/config/index.ts::loadConfig (HORS DOMAIN : configuration)`

## Vérification

- Test : `Vérification manuelle : npm run probe puis journaux d'accès d'un site de test`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
