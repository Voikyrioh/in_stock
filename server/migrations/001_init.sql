-- In Stock, initial schema (conception technique socle, section 6).
-- Applied at boot by src/data-access/database/migrate.ts (BR-DEPLOY-004).

CREATE TABLE products (
	id          text PRIMARY KEY,
	name        text NOT NULL,
	brand       text,
	gtin        text,
	mpn         text,
	image_url   text,
	created_at  timestamptz NOT NULL,
	updated_at  timestamptz NOT NULL
);
-- BR-SEARCH-006: one product per GTIN, one per brand + manufacturer reference.
CREATE UNIQUE INDEX products_gtin_key ON products (gtin) WHERE gtin IS NOT NULL;
CREATE UNIQUE INDEX products_brand_mpn_key ON products (lower(brand), mpn)
	WHERE gtin IS NULL AND brand IS NOT NULL AND mpn IS NOT NULL;

CREATE TABLE offers (
	id               text PRIMARY KEY,
	product_id       text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
	shop_id          text NOT NULL,
	url              text NOT NULL UNIQUE,
	title            text NOT NULL,
	price_cents      integer CHECK (price_cents > 0),
	currency         char(3) NOT NULL,
	stock            text NOT NULL CHECK (stock IN ('in_stock', 'limited', 'preorder', 'backorder', 'out_of_stock', 'discontinued', 'unknown')),
	last_checked_at  timestamptz,
	last_success_at  timestamptz,
	last_error       text,
	created_at       timestamptz NOT NULL
);
CREATE INDEX offers_product_idx ON offers (product_id);
CREATE INDEX offers_checked_idx ON offers (last_checked_at);

-- BR-OFFER-001: one row per change of price or stock (future price curves).
CREATE TABLE offer_snapshots (
	id           bigserial PRIMARY KEY,
	offer_id     text NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
	price_cents  integer,
	currency     char(3) NOT NULL,
	stock        text NOT NULL,
	recorded_at  timestamptz NOT NULL
);
CREATE INDEX offer_snapshots_offer_idx ON offer_snapshots (offer_id, recorded_at);

CREATE TABLE users (
	id             text PRIMARY KEY,
	email          text NOT NULL UNIQUE,
	password_hash  text NOT NULL,
	created_at     timestamptz NOT NULL
);

-- Only the SHA-256 of the session token is stored.
CREATE TABLE sessions (
	token_hash  text PRIMARY KEY,
	user_id     text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	created_at  timestamptz NOT NULL,
	expires_at  timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE follows (
	user_id     text NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	product_id  text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
	created_at  timestamptz NOT NULL,
	PRIMARY KEY (user_id, product_id)
);
CREATE INDEX follows_product_idx ON follows (product_id);

CREATE TABLE shop_health (
	shop_id               text PRIMARY KEY,
	last_success_at       timestamptz,
	last_failure_at       timestamptz,
	last_error            text,
	consecutive_failures  integer NOT NULL DEFAULT 0,
	paused_until          timestamptz,
	robots_forbidden      boolean NOT NULL DEFAULT false
);

-- BR-SEARCH-003: readings of a shop for a query, reused 15 minutes.
CREATE TABLE search_cache (
	query_key   text NOT NULL,
	shop_id     text NOT NULL,
	offers      jsonb NOT NULL,
	fetched_at  timestamptz NOT NULL,
	PRIMARY KEY (query_key, shop_id)
);
CREATE INDEX search_cache_fetched_idx ON search_cache (fetched_at);
