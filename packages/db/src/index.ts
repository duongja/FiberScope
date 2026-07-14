import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const datasourceUrl = serverlessDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.PRISMA_LOG === "true"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { PrismaClient } from "@prisma/client";

function serverlessDatabaseUrl(value: string | undefined): string | undefined {
  if (!value || !shouldConstrainPool()) {
    return value;
  }

  try {
    const url = new URL(value);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        process.env.FIBERSCOPE_DATABASE_CONNECTION_LIMIT ?? "1",
      );
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        process.env.FIBERSCOPE_DATABASE_POOL_TIMEOUT ?? "20",
      );
    }
    return url.toString();
  } catch {
    return value;
  }
}

function shouldConstrainPool(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.FIBERSCOPE_SERVERLESS_DB_POOL === "true" ||
    Boolean(process.env.FIBERSCOPE_DATABASE_CONNECTION_LIMIT)
  );
}
