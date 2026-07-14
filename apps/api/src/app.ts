import cors from "@fastify/cors";
import Fastify, { type FastifyServerOptions } from "fastify";
import { registerRoutes } from "./routes/index.js";

export async function buildApp(
  options: FastifyServerOptions = {},
): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    ...options,
  });

  await app.register(cors, {
    origin: true,
  });
  await registerRoutes(app);

  return app;
}
