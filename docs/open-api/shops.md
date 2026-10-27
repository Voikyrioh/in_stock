# API — Boutiques et santé

## `GET /api/shops`

**200** `{ "shops": [ShopView] }`

`ShopView = { id, name, country, homepage, capabilities: ("search" | "url")[], state, lastSuccessAt }`, `state` = `operational` · `degraded` · `down` · `forbidden` · `unknown` (BR-SHOP-001).

## `GET /api/health`

**200** `{ "status": "ok" }` — healthcheck Docker (BR-STATUS-008 infra).
