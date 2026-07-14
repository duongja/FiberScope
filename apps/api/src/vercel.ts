import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "./app.js";

const appPromise = buildApp({ logger: false }).then(async (app) => {
  await app.ready();
  return app;
});

export async function handleVercelRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const app = await appPromise;
  request.url = restoreRewrittenUrl(request.url);
  app.server.emit("request", request, response);
}

function restoreRewrittenUrl(url = "/"): string {
  const parsed = new URL(url, "http://fiberscope.local");
  const apiPath = parsed.searchParams.get("__fiberscope_api_path");
  const path = parsed.searchParams.get("__fiberscope_path");

  parsed.searchParams.delete("__fiberscope_api_path");
  parsed.searchParams.delete("__fiberscope_path");

  if (apiPath !== null) {
    const normalized = apiPath.replace(/^\/+/, "");
    parsed.pathname = normalized ? `/api/${normalized}` : "/api";
  } else if (path !== null) {
    parsed.pathname = path.startsWith("/") ? path : `/${path}`;
  }

  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ""}`;
}
