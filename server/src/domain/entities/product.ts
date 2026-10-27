import { z } from 'zod'

const schema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(500),
	brand: z.string().max(80).nullable(),
	gtin: z
		.string()
		.regex(/^\d{14}$/)
		.nullable(),
	mpn: z.string().max(64).nullable(),
	imageUrl: z.url().max(2000).nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export type ProductProps = z.infer<typeof schema>

/** A product as the buyer sees it; offers of several shops point to it (BR-SEARCH-006). */
export class Product {
	private constructor(private readonly props: ProductProps) {}

	static restore(props: ProductProps): Product {
		return new Product(schema.parse(props))
	}

	static create(fields: Omit<ProductProps, 'createdAt' | 'updatedAt'>, now: Date): Product {
		return Product.restore({ ...fields, createdAt: now, updatedAt: now })
	}

	get id() {
		return this.props.id
	}
	get name() {
		return this.props.name
	}
	get brand() {
		return this.props.brand
	}
	get gtin() {
		return this.props.gtin
	}
	get mpn() {
		return this.props.mpn
	}
	get imageUrl() {
		return this.props.imageUrl
	}
	get createdAt() {
		return this.props.createdAt
	}
	get updatedAt() {
		return this.props.updatedAt
	}

	/** Fills the missing identity fields with what a new reading taught us. */
	enrich(
		fields: Partial<Pick<ProductProps, 'brand' | 'gtin' | 'mpn' | 'imageUrl'>>,
		now: Date,
	): Product {
		const next = {
			...this.props,
			brand: this.props.brand ?? fields.brand ?? null,
			gtin: this.props.gtin ?? fields.gtin ?? null,
			mpn: this.props.mpn ?? fields.mpn ?? null,
			imageUrl: this.props.imageUrl ?? fields.imageUrl ?? null,
		}
		const changed = (['brand', 'gtin', 'mpn', 'imageUrl'] as const).some(
			(k) => next[k] !== this.props[k],
		)
		return changed ? Product.restore({ ...next, updatedAt: now }) : this
	}

	toJSON(): ProductProps {
		return { ...this.props }
	}
}
