import type { ShopCatalog, ShopInfo } from '../../../domain/ports/scraper'
import { SHOPS, type ShopDefinition } from './definitions'

/** Enabled shops (DISABLED_SHOPS removes some without a release). */
export class StaticShopCatalog implements ShopCatalog {
	private readonly shops: ShopDefinition[]

	constructor(disabled: readonly string[] = [], shops: ShopDefinition[] = SHOPS) {
		this.shops = shops.filter((shop) => !disabled.includes(shop.id))
	}

	list(): ShopInfo[] {
		return this.shops.map(toInfo)
	}

	get(id: string): ShopInfo | null {
		const shop = this.definition(id)
		return shop ? toInfo(shop) : null
	}

	forUrl(url: URL): ShopInfo | null {
		const shop = this.definitionForHost(url.hostname)
		return shop ? toInfo(shop) : null
	}

	definition(id: string): ShopDefinition | null {
		return this.shops.find((shop) => shop.id === id) ?? null
	}

	definitionForHost(hostname: string): ShopDefinition | null {
		const host = hostname.toLowerCase()
		return this.shops.find((shop) => shop.hosts.includes(host)) ?? null
	}
}

function toInfo(shop: ShopDefinition): ShopInfo {
	return {
		id: shop.id,
		name: shop.name,
		country: shop.country,
		homepage: shop.homepage,
		capabilities: shop.searchUrl ? ['search', 'url'] : ['url'],
	}
}
