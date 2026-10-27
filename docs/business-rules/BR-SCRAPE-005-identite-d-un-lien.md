---
id: BR-SCRAPE-005
domaine: SCRAPE
titre: Un lien sans ses paramètres de suivi
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-ajouter-par-lien.md
maj: 2026-10-27
---

# BR-SCRAPE-005 — Un lien sans ses paramètres de suivi

## Règle

L'identité d'une offre est son lien normalisé : hôte en minuscules, sans fragment, sans paramètres de suivi (utm_*, gclid, fbclid, ref, tag…), paramètres restants triés ; un lien Amazon est réduit à /dp/<ASIN>. Le même produit collé deux fois donne une seule offre.

## Application (code)

- `server/src/domain/rules/url.ts::normaliseOfferUrl`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"should drop tracking parameters and fragments"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
