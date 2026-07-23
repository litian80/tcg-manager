import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF guard for server-initiated outbound requests (e.g. organiser-configured
 * notification webhooks). Organisers are only semi-trusted (self-service
 * organiser applications exist), so a URL they control must never be used to
 * reach internal infrastructure — cloud metadata endpoints (169.254.169.254),
 * loopback, or RFC1918 hosts.
 *
 * Enforced at DISPATCH time (see utils/webhooks.ts) so it covers every save
 * path, including the client-side settings upsert that bypasses server actions.
 *
 * Residual risk — DNS rebinding (TOCTOU between this check and fetch's own
 * resolution): substantially mitigated by requiring HTTPS, since an attacker
 * would also need a valid public certificate for the target hostname on the
 * internal service, which is generally infeasible.
 */

export type UrlSafetyResult = { safe: true } | { safe: false; reason: string };

/**
 * True if an IPv4 address is loopback, private, link-local, CGNAT, multicast,
 * or otherwise reserved (i.e. must not be reachable from a public webhook).
 * Malformed input is treated as unsafe (fail-closed).
 */
function ipv4IsPrivateOrReserved(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b, c] = parts;

  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 255.255.255.255
  return false;
}

/**
 * True if an IPv6 address is loopback, unspecified, unique-local, link-local,
 * multicast, or an IPv4-mapped address whose embedded v4 is private/reserved.
 */
function ipv6IsPrivateOrReserved(ip: string): boolean {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf('%'); // strip scope/zone id
  if (zone !== -1) addr = addr.slice(0, zone);

  if (addr === '::1') return true; // loopback
  if (addr === '::') return true; // unspecified

  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return ipv4IsPrivateOrReserved(mapped[1]);

  const head = addr.split(':')[0];
  if (/^fe[89ab]/.test(head)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(head)) return true; // fc00::/7 unique local
  if (/^ff/.test(head)) return true; // ff00::/8 multicast
  return false;
}

/** True if an IP literal must not be reachable from a public webhook. */
export function ipIsPrivateOrReserved(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return ipv4IsPrivateOrReserved(ip);
  if (version === 6) return ipv6IsPrivateOrReserved(ip);
  return true; // not a valid IP → fail-closed
}

/**
 * Validate that a URL is safe to send a server-initiated request to.
 * Requires HTTPS and that the host (literal IP or every DNS-resolved address)
 * is a public address.
 */
export async function assertSafeOutboundUrl(rawUrl: string): Promise<UrlSafetyResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  if (url.protocol !== 'https:') {
    return { safe: false, reason: 'URL must use HTTPS' };
  }

  // URL.hostname wraps IPv6 literals in brackets — strip them.
  const host = url.hostname.replace(/^\[|\]$/g, '');

  // IP literal → check directly, no DNS needed.
  if (isIP(host) !== 0) {
    return ipIsPrivateOrReserved(host)
      ? { safe: false, reason: 'URL points to a private or reserved IP address' }
      : { safe: true };
  }

  // Reject localhost aliases before spending a DNS lookup.
  const lowerHost = host.toLowerCase();
  if (lowerHost === 'localhost' || lowerHost.endsWith('.localhost')) {
    return { safe: false, reason: 'URL points to localhost' };
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return { safe: false, reason: 'Host could not be resolved' };
  }

  if (addresses.length === 0) {
    return { safe: false, reason: 'Host did not resolve to any address' };
  }

  for (const { address } of addresses) {
    if (ipIsPrivateOrReserved(address)) {
      return { safe: false, reason: 'Host resolves to a private or reserved IP address' };
    }
  }

  return { safe: true };
}
