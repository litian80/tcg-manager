import { describe, it, expect } from 'vitest';
import { ipIsPrivateOrReserved, assertSafeOutboundUrl } from '@/utils/url-safety';

describe('ipIsPrivateOrReserved', () => {
  it('flags IPv4 loopback / private / link-local / CGNAT / reserved ranges', () => {
    const blocked = [
      '127.0.0.1', // loopback
      '10.0.0.1', // private
      '10.255.255.255',
      '172.16.0.1', // private
      '172.31.255.255',
      '192.168.1.1', // private
      '169.254.169.254', // cloud metadata
      '100.64.0.1', // CGNAT
      '0.0.0.0', // this-host
      '224.0.0.1', // multicast
      '255.255.255.255',
    ];
    for (const ip of blocked) {
      expect(ipIsPrivateOrReserved(ip), ip).toBe(true);
    }
  });

  it('allows normal public IPv4 addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '172.15.255.255']) {
      expect(ipIsPrivateOrReserved(ip), ip).toBe(false);
    }
  });

  it('flags IPv6 loopback / unique-local / link-local / mapped-private', () => {
    for (const ip of ['::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:169.254.169.254', '::ffff:10.0.0.1']) {
      expect(ipIsPrivateOrReserved(ip), ip).toBe(true);
    }
  });

  it('allows public IPv6 and mapped-public, rejects malformed input', () => {
    expect(ipIsPrivateOrReserved('2606:4700:4700::1111')).toBe(false);
    expect(ipIsPrivateOrReserved('::ffff:8.8.8.8')).toBe(false);
    expect(ipIsPrivateOrReserved('not-an-ip')).toBe(true); // fail-closed
  });
});

describe('assertSafeOutboundUrl (no-DNS paths)', () => {
  it('rejects non-HTTPS URLs', async () => {
    expect(await assertSafeOutboundUrl('http://example.com/hook')).toMatchObject({ safe: false });
  });

  it('rejects invalid URLs', async () => {
    expect(await assertSafeOutboundUrl('not a url')).toMatchObject({ safe: false });
  });

  it('rejects HTTPS URLs whose host is a private/metadata IP literal', async () => {
    expect(await assertSafeOutboundUrl('https://169.254.169.254/latest/meta-data')).toMatchObject({ safe: false });
    expect(await assertSafeOutboundUrl('https://127.0.0.1/hook')).toMatchObject({ safe: false });
    expect(await assertSafeOutboundUrl('https://[::1]/hook')).toMatchObject({ safe: false });
    expect(await assertSafeOutboundUrl('https://192.168.0.10/hook')).toMatchObject({ safe: false });
  });

  it('rejects localhost aliases without a DNS lookup', async () => {
    expect(await assertSafeOutboundUrl('https://localhost/hook')).toMatchObject({ safe: false });
    expect(await assertSafeOutboundUrl('https://foo.localhost/hook')).toMatchObject({ safe: false });
  });

  it('allows an HTTPS URL with a public IP literal host', async () => {
    expect(await assertSafeOutboundUrl('https://8.8.8.8/hook')).toEqual({ safe: true });
  });
});
