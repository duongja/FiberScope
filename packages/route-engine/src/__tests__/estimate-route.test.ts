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
});
