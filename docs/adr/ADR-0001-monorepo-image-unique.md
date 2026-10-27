---
id: ADR-0001
titre: Un monorepo, une image : Hono sert l'API, le client et le planificateur
type: architecture
statut: acceptée
date: 2026-10-27
portee: projet
liens: [orga-global/contexts/in-stock/conceptions/2026-10-27-technique-socle.md]
---

# ADR-0001 — Un monorepo, une image : Hono sert l'API, le client et le planificateur

## Contexte

L'ancien projet (Fastify, un fichier par site) n'avait ni client ni persistance. La refonte doit tenir sur l'infra Scaleway (Docker Compose, Traefik, PostgreSQL partagé, SigNoz) avec un minimum de pièces.

## Décision

- Monorepo npm `shared/` (types d'API), `server/` (Hono), `web/` (Vue 3). Une seule image Docker : le serveur sert le client construit (`STATIC_DIR`), l'API `/api` et exécute le planificateur de relevés. Même origine : pas de CORS.
- Clean architecture (ADR-0002 globale) : `domain/` (entités, règles pures, ports, use-cases), `data-access/`, `entry-points/`, racine de composition `container.ts`.
- Dérogation assumée à ADR-0002 globale : les use-cases dépendent de `@Voikyrioh/observability` (`UseCase`, `FunctionalError`), comme le demande ADR-0009 globale ; entités et règles n'importent que Zod.
- Mono-instance : recherches en cours, file de politesse et limites de débit en mémoire.

## Alternatives rejetées

- Deux images (API + nginx) : un second conteneur, du CORS ou un second routeur Traefik pour rien.
- Worker séparé pour les relevés : utile à grande échelle seulement ; le planificateur tient dans le process (1 lot de 20 offres par minute).

## Conséquences

- Mise en ligne en une fiche `apps/in-stock.yml`.
- Passer à plusieurs instances demandera un verrou partagé (Postgres advisory lock ou Redis) pour le planificateur et la file par site.
