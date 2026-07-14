import { describe, expect, it } from "vitest";
import { FiberScopeClient } from "../index.js";

describe("FiberScopeClient", () => {
  it("calls readiness endpoint with Fiber parameter names", async () => {
    const calls: string[] = [];
    const client = new FiberScopeClient({
      baseUrl: "https://scope.example/",
      fetchImpl: (async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return Response.json({
          canPay: true,
          confidence: 1,
          asset: "ckb",
          amount: "100",
          estimatedFee: "0",
          hopCount: 0,
          route: [],
          alternatives: [],
          warnings: [],
          recommendedActions: [],
        });
      }) as typeof fetch,
    });

    await client.canPay({
      sourcePubkey: "source",
      targetPubkey: "target",
      amount: "100",
      asset: "CKB",
    });

    expect(calls[0]).toBe(
      "https://scope.example/api/readiness/can-pay?source_pubkey=source&target_pubkey=target&asset=CKB&amount=100",
    );
  });

  it("downloads CSV exports as text", async () => {
    const client = new FiberScopeClient({
      baseUrl: "https://scope.example",
      fetchImpl: (async () => {
        return new Response("pubkey,node_name\nnode-a,Alice\n", {
          headers: { "content-type": "text/csv" },
        });
      }) as typeof fetch,
    });

    await expect(client.nodesCsv()).resolves.toContain("node-a,Alice");
  });
});
