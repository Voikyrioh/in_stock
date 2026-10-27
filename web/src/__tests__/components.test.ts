import type { OfferView } from '@in-stock/shared'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import PriceTag from '../components/atoms/PriceTag.vue'
import StockBadge from '../components/atoms/StockBadge.vue'
import OfferRow from '../components/molecules/OfferRow.vue'
import OffersTable from '../components/organisms/OffersTable.vue'

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/', name: 'home', component: { template: '<div />' } },
		{ path: '/produit/:id', name: 'product', component: { template: '<div />' } },
	],
})

const offer: OfferView = {
	id: 'O1',
	shopId: 'ldlc',
	shopName: 'LDLC',
	url: 'https://www.ldlc.com/fiche/PB1.html',
	title: 'MSI GeForce RTX 4070 SUPER',
	priceCents: 59995,
	currency: 'EUR',
	stock: 'in_stock',
	lastCheckedAt: '2026-10-27T12:02:00Z',
	lastSuccessAt: '2026-10-27T12:02:00Z',
	stale: false,
}

describe('StockBadge', () => {
	it('shows the label and carries the state class', () => {
		const w = mount(StockBadge, { props: { stock: 'out_of_stock' } })
		expect(w.text()).toBe('Rupture')
		expect(w.classes()).toContain('out_of_stock')
	})
})

describe('PriceTag', () => {
	it('shows cents in superscript, or « Prix non communiqué »', () => {
		expect(
			mount(PriceTag, { props: { cents: 59995 } })
				.find('small')
				.text(),
		).toBe(',95 €')
		expect(mount(PriceTag, { props: { cents: null } }).text()).toBe('Prix non communiqué')
	})
})

describe('OfferRow', () => {
	it('links to the product page and to the shop without referrer', async () => {
		await router.push('/')
		const w = mount(OfferRow, {
			props: { offer, product: { id: '01JABC', name: 'RTX', brand: 'MSI', imageUrl: null } },
			global: { plugins: [router] },
		})
		expect(w.find('a.title').attributes('href')).toBe('/produit/01JABC')
		const out = w.findAll('a').find((a) => a.text().startsWith('Voir chez'))
		expect(out?.attributes('rel')).toContain('noreferrer')
		expect(out?.attributes('target')).toBe('_blank')
		expect(w.text()).toContain('En stock')
	})
})

describe('OffersTable', () => {
	it('marks offers whose last reading failed (BR-OFFER-004)', () => {
		const w = mount(OffersTable, {
			props: {
				offers: [{ ...offer, stale: true }],
				refreshing: false,
				now: new Date('2026-10-27T12:10:00Z'),
			},
		})
		expect(w.text()).toContain('Relevé impossible, dernier état connu')
		expect(w.text()).toContain('il y a 8 min')
	})
})
