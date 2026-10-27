---
id: BR-PRICE-002
domaine: PRICE
titre: Formats de prix des boutiques françaises
statut: active
invariant: true
source: orga-global/contexts/in-stock/conceptions/2026-10-27-technique-socle.md
maj: 2026-10-27
---

# BR-PRICE-002 — Formats de prix des boutiques françaises

## Règle

Sont lus : « 1 299,95 € », « 1.299,95 », « 1,299.95 », « 1299.95 », « € 619,00 », le format LDLC « 599€95 » (le signe € tient lieu de virgule), espaces insécables compris. Le dernier séparateur suivi d'1 ou 2 chiffres est décimal ; des groupes de 3 chiffres sont des milliers.

## Application (code)

- `server/src/domain/rules/price.ts::parsePrice`

## Vérification

- Test : `server/src/domain/rules/__tests__/rules.test.ts::"BR-PRICE-001/002 parsePrice"`

## Cas limites

- « 1.299 » → 1 299 €
- « 49 € » → 49,00 €

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
