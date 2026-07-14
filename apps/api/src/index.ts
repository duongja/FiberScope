import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
  },
});

await app.register(cors, {
  origin: true,
});
await registerRoutes(app);

const port = Number(process.env.API_PORT ?? 8787);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
