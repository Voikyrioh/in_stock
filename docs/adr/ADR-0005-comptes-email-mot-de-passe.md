---
id: ADR-0005
titre: Comptes par email et mot de passe, sessions opaques
type: architecture
statut: acceptée
date: 2026-10-27
portee: projet
liens: [orga-global/contexts/in-stock/conceptions/2026-10-27-technique-socle.md]
---

# ADR-0005 — Comptes par email et mot de passe, sessions opaques

## Contexte

Les suivis (et demain l'abonnement) demandent un compte. L'infra n'a pas encore de service d'envoi d'email.

## Décision

- Email unique (minuscules) + mot de passe 10 à 128 caractères, haché en **argon2id** (19 Mio, 2 passes) — ADR-0008 globale.
- Session : jeton aléatoire 256 bits en cookie `__Host-instock_session` (HttpOnly, Secure, SameSite=Lax, Path=/), seul son SHA-256 est en base ; 30 jours glissants.
- Connexion : message unique pour email inconnu et mauvais mot de passe, même coût de hachage (pas d'énumération), 10 tentatives / 15 min par visiteur.
- Mutations : contrôle `Origin` en plus de SameSite (défense CSRF en profondeur).
- Suppression du compte confirmée par le mot de passe, en cascade.

## Alternatives rejetées

- JWT : révocation impossible sans liste noire ; aucun besoin de jeton autoportant ici.
- Passkeys seules : récupération impossible sans email, appareil perdu = compte perdu.
- Lien magique par email : pas de service d'email aujourd'hui.

## Conséquences

- Pas de « mot de passe oublié » ni de vérification d'email avant l'épic alertes (qui apporte l'envoi d'email).
