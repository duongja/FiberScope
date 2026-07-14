import { buildApp } from "./app.js";

const app = await buildApp();

const port = Number(process.env.API_PORT ?? 8787);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
