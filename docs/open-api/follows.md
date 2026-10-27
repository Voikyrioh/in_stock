# API — Suivis

Session requise (sinon **401** `unauthorized` / `no-session`).

## `GET /api/follows`

**200** `{ "follows": [FollowView] }`, triés BR-FOLLOW-004.

`FollowView = { product: ProductSummary, bestOffer: OfferView | null, inStockCount, lastCheckedAt, followedAt }`.

## `PUT /api/follows/:productId`

Idempotent. **204**. **404** `not-found` / `product` ; **409** `conflict` / `follow-limit` au-delà de 100 (BR-FOLLOW-002).

## `DELETE /api/follows/:productId`

Idempotent. **204**.
