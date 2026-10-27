# In Stock

Chercher un produit informatique dans toutes les boutiques en ligne, voir où il est
en stock et à quel prix, et le suivre. Refonte 2026 du petit programme de 2021
(Fastify, LDLC seul) : API **Hono**, client **Vue 3**, PostgreSQL, un seul conteneur
déployé sur l'infra Scaleway (`in-stock.voikyrioh.fr`).

- Recherche dans 13 boutiques françaises en même temps, résultats au fil de l'eau
- Ajout de n'importe quel produit par son lien (toute boutique qui publie ses données produit schema.org)
- Fiche produit comparée par boutique, actualisation, historique des prix enregistré
- Comptes, suivis relevés automatiquement toutes les 30 minutes
- Robot poli et déclaré (`InStockBot`) : robots.txt, une requête à la fois par boutique

## Démarrer en local

```bash
export GITHUB_TOKEN=ghp_xxx                 # read:packages (@Voikyrioh/observability)
npm install
docker compose -f compose.dev.yml up -d     # PostgreSQL local
DATABASE_URL=postgres://in_stock:in_stock@127.0.0.1:5432/in_stock npm run dev
# client http://localhost:5173 (Vite proxifie /api vers :3000)
```

Sans base : `STORAGE=memory npm run dev -w server` (tout est perdu au redémarrage).

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur (tsx watch) + client (Vite) |
| `npm run lint` / `format` | Biome |
| `npm run typecheck` | tsc + vue-tsc |
| `npm test` | Mocha (serveur) + Vitest (client) ; `TEST_DATABASE_URL=…` ajoute le contrat Postgres |
| `npm run build` | client (`web/dist`) puis serveur (`server/dist`) |
| `npm run probe -- ldlc "rtx 4070"` | sonde une boutique avec le vrai robot (`all`, ou `url <lien>`) |

Variables : [`.env.example`](./.env.example) et `server/src/config/index.ts`.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — carte du code
- [docs/INDEX.md](./docs/INDEX.md) — ADR, règles métier, contrats d'API, composants, runbooks
- Cadrage produit (épic, stories, specs, maquettes) : `orga-global/contexts/in-stock/`

## Déploiement

Fiche infra `apps/in-stock.yml` (repo `infra-as-code`), puis `Deploy` (commit courant)
ou `Release` + `deploy-version.yml`. Pas à pas : runbook infra
`docs/runbooks/mettre-en-ligne-in-stock.md`.
