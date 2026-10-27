---
id: ADR-0002
titre: Lire les pages par données structurées d'abord
type: architecture
statut: acceptée
date: 2026-10-27
portee: projet
liens: [orga-global/contexts/in-stock/conceptions/2026-10-27-technique-socle.md]
---

# ADR-0002 — Lire les pages par données structurées d'abord

## Contexte

Les boutiques changent leur HTML souvent ; l'environnement de développement ne peut pas joindre les boutiques. Il faut pourtant lire « n'importe quel produit », y compris de boutiques jamais vues.

## Décision

Extraction en cascade, champ par champ (`server/src/data-access/scraping/extract/product-page.ts`) :
1. JSON-LD schema.org `Product` / `ProductGroup` (variante de l'URL) / `Offer` / `AggregateOffer`, `@graph` compris ;
2. microdonnées `itemprop` ;
3. OpenGraph `product:price:amount`, `product:availability` ;
4. sélecteurs de la boutique (`shops/definitions.ts`) ;
5. indices texte FR/EN (« En stock », « Rupture »…).

Pages de résultats (`extract/listing.ts`) : `ItemList` JSON-LD, puis cartes de la boutique, puis liens qui ressemblent à une fiche (prix lu dans la carte), et complétion des 4 premières offres incomplètes par leur fiche.

## Alternatives rejetées

- Sélecteurs CSS seuls : cassent à chaque refonte de boutique, inutiles pour une boutique inconnue.
- Navigateur headless partout : 300 à 500 Mo par instance, lent ; gardé en évolution ciblée pour les recherches rendues en JavaScript (PcComponentes).

## Conséquences

- Les sélecteurs de recherche n'ont pas pu être vérifiés en développement : sonde `npm run probe` depuis le serveur (runbook `sonder-les-boutiques.md`, ticket STK-15).
