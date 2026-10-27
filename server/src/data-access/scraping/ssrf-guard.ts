import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { isIP } from 'node:net'

/**
 * BR-SCRAPE-003 (address part) — the robot only talks to the public Internet.
 * The container shares docker networks with Postgres, Vault and SigNoz: a user
 * link must never reach them, nor the host, nor the cloud metadata service.
 * Checked on IP literals, on every resolved address, and again at connect time
 * (guardedLookup is undici's DNS hook), which also defeats DNS rebinding.
 */

const V4_BLOCKED: [number, number][] = [
	cidr4('0.0.0.0', 8),
	cidr4('10.0.0.0', 8),
	cidr4('100.64.0.0', 10),
	cidr4('127.0.0.0', 8),
	cidr4('169.254.0.0', 16),
	cidr4('172.16.0.0', 12),
	cidr4('192.0.0.0', 24),
	cidr4('192.0.2.0', 24),
	cidr4('192.88.99.0', 24),
	cidr4('192.168.0.0', 16),
	cidr4('198.18.0.0', 15),
	cidr4('198.51.100.0', 24),
	cidr4('203.0.113.0', 24),
	cidr4('224.0.0.0', 4),
	cidr4('240.0.0.0', 4),
]

function v4ToInt(ip: string): number {
	return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0
}

function cidr4(base: string, bits: number): [number, number] {
	const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
	return [(v4ToInt(base) & mask) >>> 0, mask]
}

function isPublicV4(ip: string): boolean {
	const value = v4ToInt(ip)
	return !V4_BLOCKED.some(([net, mask]) => (value & mask) >>> 0 === net)
}

/** Expands an IPv6 address to its 8 groups (handles "::" and an embedded IPv4). */
function v6Groups(ip: string): number[] | null {
	let address =
		ip
			.toLowerCase()
			.replace(/^\[|\]$/g, '')
			.split('%')[0] ?? ''
	const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(address)?.[1]
	if (v4) {
		const n = v4ToInt(v4)
		address = address.replace(v4, `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`)
	}
	const [head = '', tail] = address.split('::')
	const left = head ? head.split(':') : []
	const right = tail !== undefined && tail !== '' ? tail.split(':') : []
	const missing = 8 - left.length - right.length
	if (tail === undefined ? left.length !== 8 : missing < 1) return null
	const groups = [...left, ...Array(tail === undefined ? 0 : missing).fill('0'), ...right].map(
		(g) => Number.parseInt(g, 16),
	)
	return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
		? groups
		: null
}

function isPublicV6(ip: string): boolean {
	const g = v6Groups(ip)
	if (!g) return false
	const [a = 0, b = 0] = g
	// IPv4-mapped (::ffff:a.b.c.d): judged as the IPv4 address.
	if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
		const v4 = [g[6] ?? 0, g[7] ?? 0].flatMap((x) => [x >>> 8, x & 0xff]).join('.')
		return isPublicV4(v4)
	}
	// Only global unicast 2000::/3, minus documentation, Teredo, 6to4 and NAT64 ranges.
	if ((a & 0xe000) !== 0x2000) return false
	if (a === 0x2001 && b === 0x0db8) return false
	if (a === 0x2001 && b < 0x0200) return false
	if (a === 0x2002) return false
	return true
}

export function isPublicAddress(ip: string): boolean {
	const family = isIP(ip.replace(/^\[|\]$/g, ''))
	if (family === 4) return isPublicV4(ip)
	if (family === 6) return isPublicV6(ip)
	return false
}

/** IP literal hosts are checked directly (no DNS lookup happens for them). */
export function isForbiddenHost(hostname: string): boolean {
	const bare = hostname.replace(/^\[|\]$/g, '')
	if (isIP(bare)) return !isPublicAddress(bare)
	const lower = bare.toLowerCase()
	return (
		lower === 'localhost' ||
		lower.endsWith('.localhost') ||
		lower.endsWith('.internal') ||
		lower.endsWith('.local')
	)
}

export class ForbiddenAddressError extends Error {
	readonly code = 'EFORBIDDENADDRESS'
}

type LookupCallback = (
	err: NodeJS.ErrnoException | null,
	address: string | LookupAddress[],
	family?: number,
) => void

/** DNS hook for undici: resolves, then refuses if ANY address is not public. */
export function guardedLookup(hostname: string, options: object, callback: LookupCallback): void {
	dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
		if (err) return callback(err, [])
		const list = addresses as LookupAddress[]
		if (list.length === 0 || list.some((a) => !isPublicAddress(a.address))) {
			return callback(new ForbiddenAddressError(`${hostname} resolves to a non public address`), [])
		}
		const all = (options as { all?: boolean }).all
		if (all) return callback(null, list)
		const first = list[0] as LookupAddress
		return callback(null, first.address, first.family)
	})
}
