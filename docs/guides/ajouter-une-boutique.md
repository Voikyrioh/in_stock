# Guide : ajouter une boutique

1. Ajouter une entrée dans `server/src/data-access/scraping/shops/definitions.ts` :
   `id` (minuscules, stable : il est stocké dans `offers.shop_id`), `name`, `country`,
   `homepage`, `hosts` (tous les noms d'hôte servis), `productUrlPattern` (forme d'une URL de fiche),
   `searchUrl` (si la recherche est rendue côté serveur) et `listing` (sélecteurs d'une carte).
2. Vérifier d'abord les **données structurées** d'une fiche (`npm run probe -- url <fiche>`) : si
   `sources` contient `json-ld`, aucun sélecteur `product` n'est nécessaire.
3. `npm run probe -- <id> "rtx 4070"` puis ajuster `listing`.
4. Fixture + test dans `extraction.test.ts`, `npm test`.
5. Le test « Shop definitions » vérifie que l'URL de recherche appartient bien aux `hosts`.

Les offres déjà ajoutées par lien depuis ce site (avant qu'il soit répertorié) gardent leur
`shop_id` = nom de domaine (BR-SHOP-002).
