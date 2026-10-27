# CLAUDE.md — In Stock

Lire `ARCHITECTURE.md` puis `docs/INDEX.md` avant toute tâche. Skills obligatoires : code-search, dev-task, bugfix, doc-update.

- Monorepo npm : `shared/` (types d'API), `server/` (Hono, clean archi ADR-0002 globale), `web/` (Vue 3, atomic design).
- Règles métier : `docs/business-rules/` (une fiche par règle, pointeur vers `server/src/domain/`). Aucune règle hors `domain/`.
- Robot : jamais de contournement d'anti-robot ; toute requête passe par `SafeHttpClient` (garde SSRF) et la file par site.
- Copy produit en français, vouvoiement, pas de tiret cadratin (ADR-0013 globale). Tous les textes : `web/src/lib/copy.ts`.
- Vérifier avant commit : `npm run lint && npm run typecheck && npm test && npm run build`.
- Commits : conventionnels, ticket `STK-nn` en scope (tickets dans `orga-global/contexts/in-stock/tickets/stk/`).
