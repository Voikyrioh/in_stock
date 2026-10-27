# API — Produits

## `POST /api/products/from-url`

Ajoute (ou retrouve) le produit d'une fiche, de n'importe quelle boutique (us-ajouter-par-lien). Limite : 10 / min / visiteur (BR-ADD-001).

Corps : `{ "url": "https://www.ldlc.com/fiche/PB00561234.html" }` (≤ 2000 caractères).

**200** `{ "productId": "01J…", "created": true }` — `created: false` si le lien (normalisé, BR-SCRAPE-005) était connu.

| HTTP | code | reason | Quand |
|---|---|---|---|
| 400 | invalid-payload | url-format | pas un lien http(s) |
| 400 | invalid-payload | url-forbidden | port non standard, identifiants, adresse non publique (BR-SCRAPE-003) |
| 400 | invalid-payload | no-product | aucune donnée produit (BR-SCRAPE-004) |
| 403 | forbidden | robots | robots.txt interdit la page à InStockBot nommément (BR-SCRAPE-001) |
| 503 | service-unavailable | blocked | la boutique bloque le robot |
| 503 | service-unavailable | unreachable | site injoignable, trop lent, page trop lourde |
| 429 | rate-limited | add | plus de 10 ajouts / min |

## `GET /api/products/:id`

**200** `ProductResponse` :

```json
{
  "product": { "id": "01J…", "name": "…", "brand": "MSI", "gtin": "04711377157834", "mpn": "912-V513-618", "imageUrl": "https://…" },
  "offers": [OfferView],
  "bestOffer": OfferView | null,
  "followed": false,
  "refreshing": true
}
```

Relit en arrière-plan les offres de plus de 30 min (BR-OFFER-002) : `refreshing: true`, le client rappelle toutes les 2 s. `bestOffer` : BR-OFFER-005.

| HTTP | code | reason | Quand |
|---|---|---|---|
| 400 | invalid-payload | — | id qui n'est pas un ULID |
| 404 | not-found | product | produit inconnu |

## `POST /api/products/:id/refresh`

Relit toutes les offres et renvoie le `ProductResponse` à jour (25 s max par offre).

| HTTP | code | reason | Quand |
|---|---|---|---|
| 429 | rate-limited | refresh-too-soon | toutes les offres relevées il y a moins de 2 min (BR-OFFER-003), `details.retryAfterSeconds` |
| 429 | rate-limited | refresh | plus de 10 actualisations / min / visiteur |
| 404 | not-found | product | produit inconnu |
