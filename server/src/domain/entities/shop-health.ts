import type { ShopHealthFacts } from '../rules/shop-state'

export type ReadingContext = 'search' | 'product'

export interface ShopHealthProps extends ShopHealthFacts {
	shopId: string
	lastError: string | null
}

/** Reading history of a known shop, the source of its displayed state (BR-SHOP-001). */
export class ShopHealth {
	private constructor(private readonly props: ShopHealthProps) {}

	static restore(props: ShopHealthProps): ShopHealth {
		return new ShopHealth({ ...props })
	}

	static empty(shopId: string): ShopHealth {
		return new ShopHealth({
			shopId,
			lastSuccessAt: null,
			lastFailureAt: null,
			lastError: null,
			consecutiveFailures: 0,
			pausedUntil: null,
			robotsForbidden: false,
		})
	}

	get shopId() {
		return this.props.shopId
	}

	facts(): ShopHealthFacts {
		return { ...this.props }
	}

	/** Only a successful search proves that robots.txt allows the search page again. */
	succeeded(now: Date, from: ReadingContext): ShopHealth {
		return new ShopHealth({
			...this.props,
			lastSuccessAt: now,
			consecutiveFailures: 0,
			lastError: null,
			pausedUntil: null,
			robotsForbidden: from === 'search' ? false : this.props.robotsForbidden,
		})
	}

	/** `pausedUntil` is set when the shop asked us to slow down (429/503, anti-robot page). */
	failed(kind: string, now: Date, pausedUntil: Date | null): ShopHealth {
		return new ShopHealth({
			...this.props,
			lastFailureAt: now,
			lastError: kind,
			consecutiveFailures: this.props.consecutiveFailures + 1,
			pausedUntil: pausedUntil ?? this.props.pausedUntil,
		})
	}

	forbiddenByRobots(now: Date): ShopHealth {
		return new ShopHealth({
			...this.props,
			robotsForbidden: true,
			lastFailureAt: now,
			lastError: 'robots',
		})
	}

	toJSON(): ShopHealthProps {
		return { ...this.props }
	}
}
