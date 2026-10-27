# Architecture

## Vue d'ensemble

```
Navigateur ─HTTPS─► Cloudflare ─► Traefik ─► conteneur in-stock (Hono, :3000)
                                               ├── /            client Vue (statique, CSP stricte)
                                               ├── /api/*       REST (recherche, produits, comptes, suivis)
                                               └── planificateur (relevé des suivis, toutes les 60 s)
                                                     │                      │
                                                     ▼                      ▼
                                   PostgreSQL (shared_postgres,      boutiques en ligne (HTTPS 443)
                                   base « in-stock »)                via le robot InStockBot
```

Mono-instance : les recherches en cours, la file de politesse par site et les limites
de débit vivent dans le process (ADR-0001).

## Dossiers

```
shared/src/        types d'API partagés (StockState, SearchView, ProductResponse…), LIMITS
server/
  migrations/      SQL appliqué au démarrage (verrou consultatif)
  src/
    config/        variables d'environnement validées par Zod au boot
    domain/
      entities/    Product, Offer, User/Session, ShopHealth (immuables, Zod)
      rules/       règles pures BR-* (prix, stock, liens, regroupement, état boutique, comptes, suivis)
      ports/       interfaces : repositories, Scraper + ShopCatalog, Clock/Ids/Hasher/Tokens
      usecases/    search/ (SearchRuns, recherche progressive), product/, account/, follow/,
                   shop/, refresh/, shared/ (OfferRecorder, ShopHealthRecorder, vues)
    data-access/
      database/    pool pg, runner de migrations
      repository/  pg/ (SQL paramétré) et memory/ (tests, STORAGE=memory), même contrat
      scraping/    robot : ssrf-guard, http-client (undici), host-queue (politesse),
                   robots (RFC 9309), extract/ (fiche produit, page de résultats),
                   shops/ (catalogue des boutiques), http-scraper
      security/    argon2id, jetons de session
      system/      horloge, ULID
    entry-points/  app.ts (Hono, CSP, statique), routes/, middlewares/ (session, origine,
                   limites), jobs/ (planificateur)
    container.ts   racine de composition : seul endroit qui choisit les adaptateurs
    tools/probe.ts sonde d'une boutique depuis la machine du robot
web/src/
  api/             fetch typé, ApiError (code + reason), endpoints
  stores/          Pinia : session, search (scrutation), follows, toasts
  lib/             copy (tous les textes), format, sort, titre, redirections
  components/      atoms/ → molecules/ → organisms/ (ADR-0004 globale)
  pages/           une page par route (router.ts)
  styles/base.css  tokens du design system (clair/sombre)
```

Sens des dépendances : `entry-points → usecases → (entities, rules, ports)` ; `data-access`
implémente les ports. Le domaine n'importe que Zod et `@Voikyrioh/observability`
(UseCase, erreurs), voir ADR-0001.

## Le robot de lecture

```
Scraper.search / readProduct
  └─ RobotsPolicy.assertAllowed (robots.txt en cache 12 h, téléchargé via la file)
  └─ HostQueue.run(site)           1 requête à la fois par site, ≥ 2 s d'écart, pause 10 min si 429/503
       └─ SafeHttpClient.get       http(s), port standard, IP publique (vérifiée au connect),
                                   3 redirections, 10 s, 3 Mo, charset, détection anti-robot
  └─ extraction                    fiche : JSON-LD → microdonnées → OpenGraph → sélecteurs → texte
                                   recherche : ItemList JSON-LD → cartes de la boutique → liens de fiches
                                   + complétion des 4 premières offres sans prix/stock
```

## Recherche progressive

`POST /api/searches` démarre une recherche (ou réutilise celle de la même requête
de moins de 15 min) et répond tout de suite ; chaque boutique est interrogée en
parallèle (20 s max) ou servie depuis `search_cache`. Le client interroge
`GET /api/searches/:id` chaque seconde jusqu'à `done` (ADR-0004).

## Données

Schéma : `server/migrations/001_init.sql`. `offer_snapshots` garde un relevé à chaque
changement de prix ou de stock (futures courbes et alertes).

## Sécurité

Garde SSRF universelle, Zod aux entrées, SQL paramétré, argon2id, cookie `__Host-`
HttpOnly Secure SameSite=Lax, contrôle `Origin` des mutations, limites de débit,
corps ≤ 16 Ko, CSP stricte, image non root avec healthcheck. Détails : ADR-0003, ADR-0005.
