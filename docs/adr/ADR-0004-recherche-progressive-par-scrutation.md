---
id: ADR-0004
titre: Recherche progressive : 202 puis scrutation chaque seconde
type: architecture
statut: acceptée
date: 2026-10-27
portee: projet
liens: [orga-global/contexts/in-stock/conceptions/2026-10-27-technique-socle.md]
---

# ADR-0004 — Recherche progressive : 202 puis scrutation chaque seconde

## Contexte

Une recherche interroge 13 boutiques ; certaines répondent en 1 s, d'autres en 20 s. L'utilisateur doit voir les premières offres sans attendre la plus lente.

## Décision

`POST /api/searches` répond 202 avec l'état initial ; le client appelle `GET /api/searches/:id` toutes les secondes jusqu'à `done`. Une même requête (casse et espaces ignorés) de moins de 15 min réutilise la recherche en mémoire ; après un redémarrage, `search_cache` (15 min par boutique) évite de relire les boutiques.

## Alternatives rejetées

- Server-Sent Events / WebSocket : plus réactif, mais connexion longue à tenir à travers Cloudflare et Traefik pour un gain d'une seconde.
- Requête synchrone de 20 s : rien à l'écran pendant la plus lente boutique.

## Conséquences

- Mono-instance (état en mémoire), voir ADR-0001.
