import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app.js";

const appPromise = buildApp({ logger: false }).then(async (app) => {
  await app.ready();
  return app;
});

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const app = await appPromise;
  app.server.emit("request", request, response);
}
