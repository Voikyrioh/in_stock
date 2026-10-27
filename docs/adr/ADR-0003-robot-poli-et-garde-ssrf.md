---
id: ADR-0003
titre: Un robot poli, déclaré, et une garde d'adresse universelle
type: architecture
statut: acceptée
date: 2026-10-27
portee: projet
liens: [orga-global/contexts/in-stock/conceptions/2026-10-27-technique-socle.md]
---

# ADR-0003 — Un robot poli, déclaré, et une garde d'adresse universelle

## Contexte

Le robot lit des sites tiers et des liens collés par des inconnus, depuis un conteneur qui partage des réseaux docker avec PostgreSQL et SigNoz.

## Décision

- **Politesse** (BR-SCRAPE-001/002) : robots.txt respecté (RFC 9309, `robots-parser`, cache 12 h), une requête à la fois par site et 2 s minimum entre deux, pause de 10 min (ou `Retry-After`) sur 429/503 ou page anti-robot.
- **Déclaré** (BR-SHOP-003) : `User-Agent: Mozilla/5.0 (compatible; InStockBot/1.0; +<PUBLIC_ORIGIN>/robot)`, page publique `/robot`.
- **Aucun contournement** : pas de CAPTCHA, pas de rotation d'IP ou d'empreinte, pas de compte. Une boutique qui bloque est affichée « indisponible ».
- **Garde SSRF** (BR-SCRAPE-003) pour TOUTES les requêtes : http(s), port standard, pas d'identifiants dans l'URL, IP littérale publique, et vérification de chaque adresse résolue au moment du `connect` (hook `lookup` d'undici : pas de DNS rebinding), 3 redirections revérifiées, 10 s, 3 Mo.

## Alternatives rejetées

- Vérifier l'adresse avant la requête seulement : contournable par DNS rebinding.
- User-Agent de navigateur : plus de pages lues, mais trompeur ; contraire à l'image voulue.

## Conséquences

- Certaines boutiques (Amazon, Fnac, Cdiscount) peuvent rester « interdites » ou « indisponibles ». Évolution possible : API partenaires (affiliation).
