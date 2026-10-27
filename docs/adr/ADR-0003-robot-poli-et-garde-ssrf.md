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

- **robots.txt selon qui demande** (BR-SCRAPE-001, révisé le 2026-10-27, voir plus bas) : le relevé planifié applique tout le fichier ; une lecture demandée par une personne n'applique que les groupes qui nomment `InStockBot`.
- **Politesse** (BR-SCRAPE-002) : une requête à la fois par site et 2 s minimum entre deux, pause de 10 min (ou `Retry-After`) sur 429/503 ou page anti-robot.
- **Déclaré** (BR-SHOP-003) : `User-Agent: Mozilla/5.0 (compatible; InStockBot/1.0; +<PUBLIC_ORIGIN>/robot)`, page publique `/robot`.
- **Aucun contournement** : pas de CAPTCHA, pas de rotation d'IP ou d'empreinte, pas de compte. Une boutique qui bloque est affichée « indisponible ».
- **Garde SSRF** (BR-SCRAPE-003) pour TOUTES les requêtes : http(s), port standard, pas d'identifiants dans l'URL, IP littérale publique, et vérification de chaque adresse résolue au moment du `connect` (hook `lookup` d'undici : pas de DNS rebinding), 3 redirections revérifiées, 10 s, 3 Mo.

## Alternatives rejetées

- Vérifier l'adresse avant la requête seulement : contournable par DNS rebinding.
- User-Agent de navigateur : plus de pages lues, mais trompeur ; contraire à l'image voulue.

## Conséquences

- Certaines boutiques (Amazon, Fnac, Cdiscount) peuvent rester « interdites » ou « indisponibles ». Évolution possible : API partenaires (affiliation).

## Révision 2026-10-27 — robots.txt selon qui déclenche la lecture

**Contexte.** En production, LDLC, Materiel.net, Top Achat, Infomax et Cdiscount interdisent leurs pages de recherche à `User-agent: *`. Ces règles visent surtout les moteurs d'indexation (pages de résultats infinies, budget d'exploration). RFC 9309 encadre les « crawlers », clients automatiques qui parcourent un site, et les distingue d'un navigateur qui affiche une page à quelqu'un ; Google traite de même ses outils déclenchés par l'utilisateur, qui ignorent en général robots.txt.

**Décision (Voiky, option 2).**

| Lecture | Déclencheur | robots.txt appliqué |
|---|---|---|
| Recherche, complétion des fiches d'une recherche | une personne | groupes qui nomment `InStockBot` seulement |
| Ajout par lien, fiche ouverte (relecture > 30 min), « Actualiser » | une personne | groupes qui nomment `InStockBot` seulement |
| Relevé des produits suivis (planificateur) | le service | tout le fichier, `*` compris ; injoignable = rien pendant 2 min |

Inchangé pour toutes les lectures : User-Agent déclaré, une requête à la fois par site, 2 s d'écart, pauses sur 429/503, aucun contournement d'anti-robot, garde SSRF. Une boutique peut toujours nous refuser par son nom (`User-agent: InStockBot` + `Disallow: /`), règle respectée partout.

**Code.** `domain/rules/robots.ts::robotsScope`, `data-access/scraping/robots.ts::RobotsPolicy` (+ `namedGroupsOnly`), `ReadOptions.trigger` du port `Scraper`.

**Alternatives écartées.** Garder robots.txt partout pour tout : 5 boutiques majeures inaccessibles en recherche alors que la lecture est celle d'une personne. Ignorer robots.txt partout : le relevé planifié est exactement ce que robots.txt encadre.

**Conséquences.** La page « Notre robot » l'explique. Le cadre juridique (conditions d'utilisation des boutiques, droit sui generis des bases de données) reste à faire valider avant l'abonnement payant (épic alertes).
