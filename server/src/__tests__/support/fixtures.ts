/** Synthetic pages shaped like the real shops (structure as published, values invented). */

export const LDLC_PRODUCT = `<!doctype html><html lang="fr"><head>
<title>MSI GeForce RTX 4070 SUPER VENTUS 2X OC - LDLC</title>
<meta property="og:title" content="MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script>
<script type="application/ld+json">
{"@context":"https://schema.org/","@type":"Product","name":"MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC",
 "image":["https://media.ldlc.com/r1600/ld/products/00/06/09/12/LD0006091234.jpg"],
 "sku":"PB00561234","mpn":"912-V513-618","gtin13":"4711377157834",
 "brand":{"@type":"Brand","name":"MSI"},
 "offers":{"@type":"Offer","url":"https://www.ldlc.com/fiche/PB00561234.html","priceCurrency":"EUR","price":"599.95",
   "availability":"https://schema.org/InStock","itemCondition":"https://schema.org/NewCondition"}}
</script></head><body>
<h1 class="title-1">MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC</h1>
<div class="price"><div class="price">599€<sup>95</sup></div></div>
<div class="stock-web"><span class="stock stock-1">En stock</span></div>
</body></html>`

export const PRODUCT_GROUP = `<html><head><script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Shop"},
 {"@type":"ProductGroup","name":"Fractal North","brand":"Fractal Design","hasVariant":[
  {"@type":"Product","name":"Fractal North Chalk White","url":"https://boutique.example.fr/north?color=white","gtin":"7350041080435",
   "offers":{"@type":"Offer","price":139.9,"priceCurrency":"EUR","availability":"OutOfStock"}},
  {"@type":"Product","name":"Fractal North Charcoal Black","url":"https://boutique.example.fr/north?color=black",
   "offers":[{"@type":"Offer","price":"129,90","priceCurrency":"EUR","availability":"http://schema.org/BackOrder"}]}
 ]}]}
</script></head><body><h1>North</h1></body></html>`

export const MICRODATA_PRODUCT = `<html><body>
<div itemscope itemtype="https://schema.org/Product">
 <h1 itemprop="name">Corsair Vengeance DDR5 32 Go (2x16) 6000 MHz</h1>
 <span itemprop="brand" itemscope itemtype="https://schema.org/Brand"><span itemprop="name">Corsair</span></span>
 <meta itemprop="mpn" content="CMK32GX5M2B6000C30">
 <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
  <span itemprop="price" content="109.90">109,90 €</span><meta itemprop="priceCurrency" content="EUR">
  <link itemprop="availability" href="https://schema.org/LimitedAvailability">
 </div>
</div></body></html>`

export const OPENGRAPH_PRODUCT = `<html><head>
<meta property="og:type" content="product"><meta property="og:title" content="Samsung 990 PRO 2 To">
<meta property="product:price:amount" content="169.99"><meta property="product:price:currency" content="EUR">
<meta property="product:availability" content="out of stock"><meta property="og:image" content="/img/990pro.jpg">
</head><body></body></html>`

export const TEXT_ONLY_PRODUCT = `<html><head><title>Carte mère B650</title></head><body>
<h1>ASUS TUF GAMING B650-PLUS WIFI</h1><div class="product-availability">Précommande, expédition le 12/11</div>
<span class="prix">189,99 €</span></body></html>`

export const NOT_A_PRODUCT = `<html><head><title>Accueil</title></head><body><h1>Bienvenue</h1><p>Promos de la semaine</p></body></html>`

export const LDLC_SEARCH = `<html><body><div class="listing-product"><ul>
 <li class="pdt-item" data-id="AR202301010001">
  <div class="pic"><a href="/fiche/PB00561234.html"><img src="https://media.ldlc.com/a.jpg" alt=""></a></div>
  <div class="pdt-desc"><h3 class="title-3"><a href="/fiche/PB00561234.html">MSI GeForce RTX 4070 SUPER 12G VENTUS 2X OC</a></h3></div>
  <div class="basket"><div class="stock-web"><div class="stock stock-1">En stock</div></div>
   <div class="price"><div class="price">599€<sup>95</sup></div></div></div>
 </li>
 <li class="pdt-item">
  <div class="pdt-desc"><h3 class="title-3"><a href="/fiche/PB00570000.html">Gigabyte GeForce RTX 4070 WINDFORCE OC V2</a></h3></div>
  <div class="basket"><div class="stock-web"><div class="stock stock-9"></div></div>
   <div class="price"><div class="price">579€<sup>90</sup></div></div></div>
 </li>
 <li class="pdt-item"><h3 class="title-3"><a href="https://ads.example.com/x">Sponsorisé</a></h3></li>
</ul></div></body></html>`

export const ALTERNATE_SEARCH = `<html><body><div class="grid-container">
 <a class="productBox" href="https://www.alternate.fr/Gigabyte/GeForce-RTX-4070-WINDFORCE/html/product/1923456">
  <img class="productPicture" src="/p/1923456.jpg">
  <div class="product-name">Gigabyte GeForce RTX 4070 WINDFORCE OC V2 12G</div>
  <span class="price">€ 619,00</span><div class="delivery-info"><span>Expédié sous 24h</span></div>
 </a>
 <a class="productBox" href="https://www.alternate.fr/ASUS/Dual-RTX-4070/html/product/1934567">
  <div class="product-name">ASUS Dual GeForce RTX 4070 EVO OC</div>
  <span class="price">€ 1.029,00</span><div class="delivery-info"><span>Disponible sous 3 semaines</span></div>
 </a>
</div></body></html>`

export const ITEMLIST_SEARCH = `<html><head><script type="application/ld+json">
{"@context":"https://schema.org","@type":"ItemList","itemListElement":[
 {"@type":"ListItem","position":1,"item":{"@type":"Product","name":"AMD Ryzen 7 9800X3D","url":"https://www.materiel.net/produit/202410310001.html",
   "offers":{"@type":"Offer","price":"529.00","priceCurrency":"EUR","availability":"https://schema.org/PreOrder"}}},
 {"@type":"ListItem","position":2,"url":"https://www.materiel.net/produit/202410310002.html","name":"AMD Ryzen 7 9700X"}
]}</script></head><body></body></html>`

export const LINKS_ONLY_SEARCH = `<html><body><main>
 <div class="tile"><a href="/ref/1189321">Seagate IronWolf 8 To NAS 3.5"</a><p>229,99 €</p><p>En stock</p></div>
 <div class="tile"><a href="/ref/1189322">WD Red Plus 8 To 5640 tr/min</a><p>Rupture de stock</p><p>209,99 €</p></div>
 <a href="/ref/1189322">WD Red Plus 8 To 5640 tr/min</a>
 <a href="/aide/livraison">Livraison</a>
</main></body></html>`
