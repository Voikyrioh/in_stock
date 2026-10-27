# Règles métier — In Stock

Une fiche par règle (skill `business-rule`). Source : specs fonctionnelles `orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-*.md`.

| Domaine | Sujet |
|---|---|
| `PRICE` | Prix |
| `STOCK` | Stock |
| `SEARCH` | Recherche |
| `OFFER` | Offres et relevés |
| `SCRAPE` | Robot de lecture |
| `SHOP` | Boutiques |
| `ADD` | Ajout par lien |
| `ACCOUNT` | Comptes |
| `FOLLOW` | Suivis |

- [BR-PRICE-001](./BR-PRICE-001-prix-en-centimes.md) — Un prix est en centimes, un prix illisible est inconnu — `parsePrice` — ✓
- [BR-PRICE-002](./BR-PRICE-002-formats-de-prix.md) — Formats de prix des boutiques françaises — `parsePrice` — ✓
- [BR-STOCK-001](./BR-STOCK-001-sept-etats.md) — Sept états de stock — `STOCK_STATES` — —
- [BR-STOCK-002](./BR-STOCK-002-correspondance-des-etats.md) — Correspondance des états publiés par les boutiques — `stockFromAvailability` — —
- [BR-SEARCH-001](./BR-SEARCH-001-requete.md) — Une recherche fait 2 à 100 caractères — `cleanQuery` — —
- [BR-SEARCH-002](./BR-SEARCH-002-toutes-les-boutiques-en-parallele.md) — Toutes les boutiques en parallèle, 20 s chacune — `SearchRuns.start` — —
- [BR-SEARCH-003](./BR-SEARCH-003-reutilisation-15-minutes.md) — Résultats réutilisés 15 minutes — `SearchRuns.start` — —
- [BR-SEARCH-004](./BR-SEARCH-004-dix-offres-par-boutique.md) — 10 offres par boutique, 4 complétées — `HttpScraper.searchWithDiagnostics` — —
- [BR-SEARCH-005](./BR-SEARCH-005-tri-disponibilite-puis-prix.md) — Tri : disponibilité puis prix — `compareOffers` — —
- [BR-SEARCH-006](./BR-SEARCH-006-regroupement-par-produit.md) — Deux offres sont le même produit si elles partagent un EAN ou marque + référence — `groupingKey` — —
- [BR-SEARCH-007](./BR-SEARCH-007-vingt-recherches-par-minute.md) — 20 recherches par minute — `apiRoutes` — —
- [BR-OFFER-001](./BR-OFFER-001-historique-des-releves.md) — Un relevé est gardé à chaque changement — `Offer.withReading` — —
- [BR-OFFER-002](./BR-OFFER-002-releve-apres-30-minutes.md) — Une fiche ouverte relit les offres de plus de 30 minutes — `isDue` — —
- [BR-OFFER-003](./BR-OFFER-003-actualisation-manuelle-2-minutes.md) — Actualisation manuelle au plus toutes les 2 minutes — `refreshCooldownLeft` — —
- [BR-OFFER-004](./BR-OFFER-004-echec-garde-le-dernier-etat.md) — Un relevé en échec garde le dernier état connu — `Offer.withFailure` — —
- [BR-OFFER-005](./BR-OFFER-005-meilleur-prix-en-stock.md) — Meilleur prix en stock — `bestOffer` — —
- [BR-SCRAPE-001](./BR-SCRAPE-001-robots-txt.md) — robots.txt selon qui demande la lecture — `RobotsPolicy` — ✓
- [BR-SCRAPE-002](./BR-SCRAPE-002-politesse.md) — Une requête à la fois par site, 2 s d'écart, pause sur demande — `HostQueue` — ✓
- [BR-SCRAPE-003](./BR-SCRAPE-003-adresses-publiques-seulement.md) — Le robot ne lit que des adresses publiques — `checkUrlShape` — ✓
- [BR-SCRAPE-004](./BR-SCRAPE-004-page-produit.md) — Une page est un produit si elle a un nom et un prix ou un stock — `isReadableProduct` — ✓
- [BR-SCRAPE-005](./BR-SCRAPE-005-identite-d-un-lien.md) — Un lien sans ses paramètres de suivi — `normaliseOfferUrl` — ✓
- [BR-SHOP-001](./BR-SHOP-001-etat-d-une-boutique.md) — État affiché d'une boutique — `shopState` — —
- [BR-SHOP-002](./BR-SHOP-002-boutique-non-repertoriee.md) — Une boutique inconnue est nommée par son domaine — `shopNameFromHost` — —
- [BR-SHOP-003](./BR-SHOP-003-robot-declare.md) — Le robot dit toujours qui il est — `loadConfig` — —
- [BR-ADD-001](./BR-ADD-001-dix-ajouts-par-minute.md) — 10 ajouts par lien par minute — `apiRoutes` — —
- [BR-ACCOUNT-001](./BR-ACCOUNT-001-email-unique.md) — Un email, un compte — `normaliseEmail` — —
- [BR-ACCOUNT-002](./BR-ACCOUNT-002-mot-de-passe.md) — Mot de passe de 10 à 128 caractères, jamais en clair — `isValidPassword` — —
- [BR-ACCOUNT-003](./BR-ACCOUNT-003-pas-d-enumeration.md) — La connexion ne révèle pas si l'email existe — `LoginUseCase` — —
- [BR-ACCOUNT-004](./BR-ACCOUNT-004-dix-tentatives.md) — 10 tentatives par 15 minutes — `apiRoutes` — —
- [BR-ACCOUNT-005](./BR-ACCOUNT-005-session-30-jours.md) — Session de 30 jours glissants — `SESSION_TTL_MS` — —
- [BR-ACCOUNT-006](./BR-ACCOUNT-006-suppression.md) — Suppression du compte confirmée par le mot de passe — `DeleteAccountUseCase` — —
- [BR-FOLLOW-001](./BR-FOLLOW-001-suivi-avec-compte.md) — Suivre demande un compte, une seule fois — `FollowUseCase` — —
- [BR-FOLLOW-002](./BR-FOLLOW-002-cent-suivis.md) — 100 produits suivis au plus — `canFollowMore` — —
- [BR-FOLLOW-003](./BR-FOLLOW-003-releve-automatique.md) — Relevé automatique des produits suivis — `RefreshDueOffersUseCase` — —
- [BR-FOLLOW-004](./BR-FOLLOW-004-ordre-des-suivis.md) — Ordre de « Mes suivis » — `compareFollows` — —
