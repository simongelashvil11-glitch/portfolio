import "server-only";

import { join } from "node:path";

import maxmind, { type AsnResponse, type Reader } from "maxmind";

/*
 * Which network an IP address belongs to — the mobile carrier, home ISP,
 * company or cloud provider that owns it — read from a database file kept
 * with the site, so the address is never sent to anyone to look up.
 *
 * Data: DB-IP "IP to ASN Lite" (https://db-ip.com), CC BY 4.0, in
 * data/dbip-asn-lite.mmdb. DB-IP publishes a new copy monthly; replacing the
 * file refreshes it. next.config.ts makes sure the file ships with the
 * routes that read it.
 */

const FILE = join(process.cwd(), "data", "dbip-asn-lite.mmdb");

let reader: Promise<Reader<AsnResponse> | null> | null = null;

function open() {
  reader ??= maxmind.open<AsnResponse>(FILE).catch((error) => {
    console.error("network database not available", error);
    return null;
  });
  return reader;
}

/**
 * Autonomous systems that belong to hosting and cloud providers. Traffic from
 * them is servers, VPNs or privacy relays rather than someone on their own
 * connection, which is worth knowing when reading the log.
 */
const CLOUD_ASNS = new Set([
  16509, 14618, 8987, // Amazon / AWS
  15169, 396982, 19527, // Google, Google Cloud
  8075, 8068, // Microsoft / Azure
  13335, 209242, // Cloudflare (incl. WARP)
  14061, // DigitalOcean
  24940, 213230, // Hetzner
  16276, // OVH
  63949, // Linode / Akamai
  20473, // Vultr
  31898, // Oracle Cloud
  45102, // Alibaba Cloud
  132203, // Tencent Cloud
  9009, // M247 (common VPN host)
  60068, // Datacamp / CDN77 (common VPN host)
  212238, // Datacamp
  36352, // ColoCrossing
  51167, // Contabo
  12876, // Scaleway
  214036, // Ultahost
  31034, // Aruba (Italian hosting)
  // Meta's own servers: they open links shared in Messenger, WhatsApp and
  // Facebook to build previews, which looks like a visit from Facebook, Inc.
  32934,
]);

export type Network = { name: string; asn: number; cloud: boolean };

/** The network behind an address, or null when it is unknown or the database is missing. */
export async function lookupNetwork(ip: string | null | undefined): Promise<Network | null> {
  if (!ip || !maxmind.validate(ip)) return null;
  const db = await open();
  const hit = db?.get(ip);
  if (!hit?.autonomous_system_number) return null;
  return {
    name: (hit.autonomous_system_organization ?? `AS${hit.autonomous_system_number}`).slice(0, 120),
    asn: hit.autonomous_system_number,
    cloud: CLOUD_ASNS.has(hit.autonomous_system_number),
  };
}
