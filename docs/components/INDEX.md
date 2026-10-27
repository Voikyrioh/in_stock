# Composants — client Vue

Atomic design (ADR-0004 globale). Tokens : `web/src/styles/base.css` ; décisions visuelles : `orga-global/contexts/in-stock/conceptions/design-system-web.md` et `2026-10-27-design-*.md`. Textes : `web/src/lib/copy.ts`.

## Atoms (`web/src/components/atoms/`)

- `AppButton` — bouton / lien routeur / lien externe (`noopener noreferrer nofollow`) ; variantes `primary`, `ghost`, `danger`, taille `s`
- `StockBadge` — pastille d'état de stock (couleur + forme : losange pour Rupture, cercle creux pour Inconnu)
- `PriceTag` — prix en chasse fixe, centimes en exposant, « Prix non communiqué » ; taille `l` pour l'étiquette jaune
- `SkeletonBlock` — bloc de chargement (s, m, l), animation coupée si `prefers-reduced-motion`
- `ProgressBar` — `<progress>` natif stylé (boutiques ayant répondu)
- `AppIcon` — seules icônes SVG du client (search, link, refresh, external, bell, close, eye, user)

## Molecules (`web/src/components/molecules/`)

- `FormField` — libellé, champ, bouton Afficher/Masquer pour les mots de passe, erreur et aide liées par `aria-describedby`
- `OfferRow` — ligne d'offre des résultats (vignette, titre → fiche, boutique, heure, prix, stock, lien boutique)
- `FollowCard` — carte de « Mes suivis » (meilleur état, prix, nb de boutiques en stock, relevé, Ne plus suivre)
- `ShopCard` — boutique, pays, capacités, état, dernier succès
- `FollowButton` — Suivre / Suivi (survol : Ne plus suivre) ; envoie vers la connexion si besoin puis suit au retour
- `ConfirmDialog` — `<dialog>` natif (piège du focus, Échap)

## Organisms (`web/src/components/organisms/`)

- `SiteHeader`, `SiteFooter` — éléments globaux (logo « IS » sur pastille jaune)
- `SearchBar` — recherche (règles BR-SEARCH-001 côté client), un lien collé part vers l'ajout par lien
- `AddByUrlForm` — ajout par lien, messages d'erreur par `reason`
- `SearchReport` — bilan des boutiques interrogées
- `BestOfferCard` — encart « Meilleur prix en stock » (étiquette jaune)
- `OffersTable` — tableau des offres de la fiche (défilement horizontal sous 560 px)
- `ToastHost` — messages non bloquants (`aria-live`), bouton d'action (Annuler)

## Pages (`web/src/pages/`)

Home, Search, Add, Product, Follows, Login, Register, Account, Shops, Robot, NotFound — routes dans `web/src/router.ts` (`/suivis` et `/compte` exigent une session).
