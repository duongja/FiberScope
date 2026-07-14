import { describe, expect, it } from "vitest";
import { estimateRoute } from "../index.js";

const nodes = [
  { pubkey: "a" },
  { pubkey: "b" },
  { pubkey: "c" },
];

const channels = [
  { channelOutpoint: "ab", assetId: "ckb", capacity: "1000" },
  { channelOutpoint: "bc", assetId: "ckb", capacity: "1000" },
];

describe("estimateRoute", () => {
  it("finds an enabled route", () => {
    const result = estimateRoute({
      sourcePubkey: "a",
      targetPubkey: "c",
      assetId: "ckb",
      amount: "100",
      nodes,
      channels,
      directions: [
        {
          channelOutpoint: "ab",
          fromPubkey: "a",
          toPubkey: "b",
          enabled: true,
          outboundLiquidity: "500",
          feeRate: "1000",
          tlcMinimumValue: "1",
        },
        {
          channelOutpoint: "bc",
          fromPubkey: "b",
          toPubkey: "c",
          enabled: true,
          outboundLiquidity: "500",
          feeRate: "1000",
          tlcMinimumValue: "1",
        },
      ],
    });

    expect(result.canPay).toBe(true);
    expect(result.hopCount).toBe(2);
  });

  it("rejects disabled-only routes", () => {
    const result = estimateRoute({
      sourcePubkey: "a",
      targetPubkey: "c",
      assetId: "ckb",
      amount: "100",
      nodes,
      channels,
      directions: [
        {
          channelOutpoint: "ab",
          fromPubkey: "a",
          toPubkey: "b",
          enabled: false,
        },
      ],
    });

    expect(result.canPay).toBe(false);
    expect(result.warnings[0]).toContain("No enabled");
  });

  it("rejects routes below TLC minimum", () => {
    const result = estimateRoute({
      sourcePubkey: "a",
      targetPubkey: "b",
      assetId: "ckb",
      amount: "10",
      nodes,
      channels,
      directions: [
        {
          channelOutpoint: "ab",
          fromPubkey: "a",
          toPubkey: "b",
          enabled: true,
          tlcMinimumValue: "100",
        },
      ],
    });

    expect(result.canPay).toBe(false);
  });

  it("returns quickly on a dense cyclic graph", () => {
    const denseNodes = Array.from({ length: 48 }, (_, index) => ({
      pubkey: `node-${index}`,
    }));
    const denseChannels = [];
    const denseDirections = [];

    for (let from = 0; from < denseNodes.length; from += 1) {
      for (let offset = 1; offset <= 6; offset += 1) {
        const to = (from + offset) % denseNodes.length;
        const channelOutpoint = `channel-${from}-${to}`;
        denseChannels.push({
          channelOutpoint,
          assetId: "ckb",
          capacity: "1000000",
        });
        denseDirections.push({
          channelOutpoint,
          fromPubkey: `node-${from}`,
          toPubkey: `node-${to}`,
          enabled: true,
          outboundLiquidity: "1000000",
          feeRate: "1000",
          tlcMinimumValue: "1",
        });
      }
    }

    const startedAt = Date.now();
    const result = estimateRoute({
      sourcePubkey: "node-0",
      targetPubkey: "node-47",
      assetId: "ckb",
      amount: "100",
      nodes: denseNodes,
      channels: denseChannels,
      directions: denseDirections,
    });

    expect(result.canPay).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(500);
  });
});
