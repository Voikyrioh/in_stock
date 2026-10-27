# API — Recherches

Base : `/api`. Erreurs : `{ code, message, reason?, details? }` (`handleHttpErrors` d'observability) ; le client choisit le texte selon `code` + `reason`. Mutations : JSON, même origine (`Origin` contrôlé en production).

## `POST /api/searches`

Démarre une recherche dans toutes les boutiques qui savent chercher (BR-SEARCH-002), ou renvoie celle de la même requête lancée il y a moins de 15 min (BR-SEARCH-003). Limite : 20 / min / visiteur (BR-SEARCH-007).

Corps : `{ "query": "rtx 4070" }` (2 à 100 caractères après nettoyage).

**202** `{ "search": SearchView }`

```json
{
  "id": "01M5YJY9Y1MHEPTJXKW5BB4SME",
  "query": "rtx 4070",
  "startedAt": "2026-10-27T11:46:44.801Z",
  "done": false,
  "shops": [{ "shopId": "ldlc", "name": "LDLC", "status": "pending", "offerCount": 0, "fetchedAt": null }],
  "results": [{ "product": ProductSummary, "offers": [OfferView] }]
}
```

`status` : `pending` · `done` · `cached` · `failed` · `timeout` · `forbidden` (robots.txt) · `blocked` (anti-robot / 429).
`results` : regroupés par produit (BR-SEARCH-006), triés disponibilité puis prix (BR-SEARCH-005).

| HTTP | code | reason | Quand |
|---|---|---|---|
| 400 | invalid-payload | query-length | moins de 2 ou plus de 100 caractères |
| 400 | invalid-payload | — | corps invalide (`details[].field`) |
| 403 | forbidden | origin | mutation depuis une autre origine |
| 429 | rate-limited | search | plus de 20 recherches / min (`Retry-After`) |

## `GET /api/searches/:id`

**200** `{ "search": SearchView }` — à appeler chaque seconde jusqu'à `done: true`.

| HTTP | code | reason | Quand |
|---|---|---|---|
| 400 | invalid-payload | — | id qui n'est pas un ULID |
| 404 | not-found | search | inconnue ou plus de 30 min |

## Types

`OfferView = { id, shopId, shopName, url, title, priceCents | null, currency, stock, lastCheckedAt, lastSuccessAt, stale }` — `shared/src/api.ts`.
`ProductSummary = { id, name, brand | null, imageUrl | null }`.
