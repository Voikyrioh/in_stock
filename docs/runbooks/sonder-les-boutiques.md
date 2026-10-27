# Runbook : sonder les boutiques depuis le serveur (STK-15)

Les URL de recherche et les sélecteurs de cartes de `server/src/data-access/scraping/shops/definitions.ts`
ont été écrits sans pouvoir joindre les boutiques (environnement de développement sans accès).
Les fiches produit passent d'abord par les données structurées (ADR-0002) et dépendent peu des
sélecteurs ; les pages de **recherche**, elles, sont à vérifier depuis la machine du robot.

## 1. Lancer la sonde dans le conteneur en production

La sonde est dans l'image : elle lit les boutiques depuis l'adresse du serveur, comme le robot.

```sh
ssh deploy@<ip> -p <port>
docker ps --filter name=in-stock                                   # Up … (healthy)
docker exec in-stock node dist/tools/probe.js all "rtx 4070"       # toutes les boutiques qui cherchent
docker exec in-stock node dist/tools/probe.js ldlc "rtx 4070"      # une boutique
docker exec in-stock node dist/tools/probe.js url https://www.ldlc.com/fiche/PB00561234.html
```

Depuis un poste avec le repo (autre adresse IP, utile pour itérer sur un sélecteur) :
`npm run probe -- ldlc "rtx 4070"`.

Même robot qu'en production (User-Agent InStockBot, file par site, garde d'adresse). La sonde lit comme une personne : seuls les groupes robots.txt qui nomment InStockBot s'appliquent (BR-SCRAPE-001).
Sortie par boutique : URL appelée, `strategy` (json-ld, selectors, links, product-page, none),
nombre d'offres listées, 5 premières offres (prix, stock, titre, lien), ou l'échec (`robots`,
`blocked`, `unreachable`, `http`…).

## 2. Lire le résultat

| Résultat | Signification | Action |
|---|---|---|
| `strategy: selectors`, prix et stocks présents | parfait | rien |
| `strategy: links`, prix présents | les sélecteurs de cartes ne trouvent rien, le repli fonctionne | corriger `listing.item` / `title` / `price` / `stock` |
| `listed 0`, pas d'échec | URL de recherche fausse ou page rendue en JavaScript | corriger `searchUrl` ; si JavaScript : retirer `searchUrl` (ajout par lien seulement) |
| `FAILED (robots)` | robots.txt interdit nommément InStockBot | rien : la boutique reste « Lecture interdite » |
| `FAILED (blocked)` | anti-robot (Cloudflare, DataDome) | rien (pas de contournement, ADR-0003) ; envisager `DISABLED_SHOPS` |
| `FAILED (http)` 404 | URL de recherche fausse | corriger `searchUrl` |

## 3. Corriger un sélecteur

1. Ouvrir la page de recherche dans un navigateur, inspecter une carte produit.
2. Mettre à jour `listing` (et `productUrlPattern` si les liens ont changé) dans `definitions.ts`.
3. Ajouter un extrait de la page dans `server/src/__tests__/support/fixtures.ts` + un test dans
   `extraction.test.ts` (non-régression).
4. `npm test`, release, redéployer, relancer la sonde.

## 4. Désactiver une boutique sans release

Fiche infra `apps/in-stock.yml` → `env.DISABLED_SHOPS: "amazon,cdiscount"` → re-provision + redéploiement.

## 5. Dernier état connu (sonde du 27/10/2026, workflow « Probe shops », « rtx 4070 »)

Depuis un runner GitHub (adresse de centre de données, donc plus souvent bloquée que le serveur).
La sonde affiche aussi la structure des cartes produit et les formulaires de recherche de l'accueil.

| Boutique | Résultat | Remarque |
|---|---|---|
| Materiel.net | links, 10 | la recherche redirige vers une fiche quand le terme est précis |
| TopAchat | links, 10 | recherche `/search/<q>` (l'ancienne `recherche.php` renvoie à l'accueil) |
| Grosbill | selectors, 10 | plateforme commune avec Cybertek, `/recherche?q=`, stock web `.dw-status` |
| Cybertek | selectors, 10 | `/recherche?q=`, cartes `article.card` |
| Rue du Commerce | links, 10 | plateforme du groupe LDLC, `/recherche/<q>/` |
| Alternate | selectors, 2 | peu de résultats pour ce terme |
| LDLC | 0 depuis GitHub | 10 en production : la page servie au runner n'a pas de résultats |
| Infomax | blocked depuis GitHub | 10 en production |
| Amazon, Cdiscount | blocked | anti-robot, pas de contournement |
| Boulanger (400), Darty, Fnac (403) | http | refus du robot dès robots.txt |
