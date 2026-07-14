import type { FastifyRequest } from "fastify";

export function stringQuery(request: FastifyRequest, key: string): string | undefined {
  const value = (request.query as Record<string, unknown>)[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export function numberQuery(request: FastifyRequest, key: string, fallback: number, max = 200): number {
  const value = stringQuery(request, key);
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.min(Math.trunc(parsed), max);
}
