---
id: BR-OFFER-001
domaine: OFFER
titre: Un relevé est gardé à chaque changement
statut: active
invariant: false
source: orga-global/contexts/in-stock/conceptions/2026-10-27-fonctionnelle-chercher-un-produit.md
maj: 2026-10-27
---

# BR-OFFER-001 — Un relevé est gardé à chaque changement

## Règle

Chaque fois que le prix, la devise ou l'état de stock d'une offre change (et à sa création), un relevé daté est conservé (offer_snapshots). Un relevé identique n'ajoute rien. Un prix illisible ne remplace jamais un prix connu.

## Application (code)

- `server/src/domain/entities/offer.ts::Offer.withReading`
- `server/src/domain/usecases/shared/offer-recorder.ts::OfferRecorder`

## Vérification

- Test : `server/src/domain/usecases/__tests__/search.test.ts::"should keep a snapshot only when price or stock change"`

## Cas limites

- —

## Historique

- 2026-10-27 — création (session 2026-10-27-refonte-in-stock)
