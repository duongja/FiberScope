import net from "node:net";
import type { PrismaClient } from "@prisma/client";

interface ProbeOptions {
  limit: number;
  timeoutMs: number;
}

interface ParsedAddress {
  host: string;
  port: number;
}

export async function probeAnnouncedNodes(
  prisma: PrismaClient,
  options: ProbeOptions,
): Promise<{ checked: number; reachable: number }> {
  const nodes = await prisma.fiberNode.findMany({
    where: { stale: false },
    orderBy: [{ lastSeenAt: "desc" }],
    take: options.limit,
  });

  let checked = 0;
  let reachable = 0;

  for (const node of nodes) {
    const addresses = Array.isArray(node.addresses) ? node.addresses : [];
    const parsed = addresses
      .map((address) => (typeof address === "string" ? parseMultiaddrTcp(address) : null))
      .filter((address): address is ParsedAddress => Boolean(address))
      .slice(0, 3);

    for (const address of parsed) {
      checked += 1;
      const result = await probeTcp(address, options.timeoutMs);
      if (result.success) {
        reachable += 1;
      }
      await prisma.reachabilityProbe.create({
        data: {
          nodePubkey: node.pubkey,
          address: `${address.host}:${address.port}`,
          success: result.success,
          latencyMs: result.latencyMs,
          error: result.error,
        },
      });
      if (result.success) {
        break;
      }
    }
  }

  return { checked, reachable };
}

export function parseMultiaddrTcp(value: string): ParsedAddress | null {
  const parts = value.split("/").filter(Boolean);
  const tcpIndex = parts.indexOf("tcp");
  if (tcpIndex === -1 || tcpIndex + 1 >= parts.length) {
    return null;
  }

  const port = Number(parts[tcpIndex + 1]);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    return null;
  }

  const host =
    valueAt(parts, parts.indexOf("ip4")) ??
    valueAt(parts, parts.indexOf("ip6")) ??
    valueAt(parts, parts.indexOf("dns4")) ??
    valueAt(parts, parts.indexOf("dns6")) ??
    valueAt(parts, parts.indexOf("dns"));

  if (!host) {
    return null;
  }

  return { host, port };
}

function valueAt(parts: string[], index: number): string | null {
  if (index === -1 || index + 1 >= parts.length) {
    return null;
  }
  return parts[index + 1] ?? null;
}

function probeTcp(
  address: ParsedAddress,
  timeoutMs: number,
): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = net.createConnection({ host: address.host, port: address.port });
    let settled = false;

    const finish = (success: boolean, error?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      const latencyMs = Date.now() - startedAt;
      socket.destroy();
      resolve(success ? { success, latencyMs } : { success, latencyMs, error });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false, "connection timed out"));
    socket.once("error", (error) => finish(false, error.message));
  });
}
