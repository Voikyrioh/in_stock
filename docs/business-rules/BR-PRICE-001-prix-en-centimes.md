---
id: BR-PRICE-001
domaine: PRICE
titre: Un prix est en centimes, un prix illisible est inconnu
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-PRICE-001 — Un prix est en centimes, un prix illisible est inconnu

## Règle

Un prix est un montant TTC au centime près, stocké en entier (centimes) avec sa devise ISO 4217. Un texte qui ne peut pas être lu avec certitude, nul ou supérieur à 1 000 000 € donne un prix « inconnu » (null), jamais 0.

## Application (code)

- `server/src/domain/rules/price.ts::parsePrice`
- `server/src/domain/rules/price.ts::parseCurrency`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-PRICE-001/002 parsePrice"`

## Cas limites

- « 0,00 € » → inconnu
- « 12,345,67 » → inconnu (ambigu)
- prix en dollars → affiché, jamais comparé aux euros (BR-OFFER-005)

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
