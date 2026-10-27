/** Business limits shared by the server (enforced) and the client (form hints). */
export const LIMITS = {
	queryMin: 2,
	queryMax: 100,
	urlMax: 2000,
	emailMax: 254,
	passwordMin: 10,
	passwordMax: 128,
	followsMax: 100,
	/** Search results are polled at this interval by the client. */
	searchPollMs: 1000,
	/** BR-OFFER-003: manual refresh at most once per product in this window. */
	refreshCooldownMs: 2 * 60_000,
	/** BR-OFFER-002 / BR-FOLLOW-003: an offer older than this is refreshed. */
	staleAfterMs: 30 * 60_000,
} as const
