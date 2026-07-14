import { describe, expect, it } from "vitest";
import {
  assetIdForScript,
  assetSymbolForScript,
  assetSymbolIndexFromNodes,
  type FiberGraphNode,
  type UdtTypeScript,
} from "../index.js";

const chainHash =
  "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606";

const cWbtcScript: UdtTypeScript = {
  code_hash:
    "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
  hash_type: "type",
  args: "0x9a1086531ed6dc69e0bd44cef5278e03faf3015b31aff60b08fb87663ce8507100000000",
};

describe("asset symbols", () => {
  it("uses advertised Fiber UDT config names when available", () => {
    const nodes: FiberGraphNode[] = [
      {
        node_name: "",
        addresses: [],
        features: [],
        pubkey: "node-a",
        chain_hash: chainHash,
        udt_cfg_infos: [
          {
            name: "cWBTC",
            script: cWbtcScript,
          },
        ],
      },
    ];

    const symbolIndex = assetSymbolIndexFromNodes(nodes);

    expect(symbolIndex.get(assetIdForScript(cWbtcScript, chainHash))).toBe(
      "cWBTC",
    );
    expect(assetSymbolForScript(cWbtcScript, chainHash, symbolIndex)).toBe(
      "cWBTC",
    );
  });

  it("falls back to a stable short UDT label for unknown scripts", () => {
    expect(assetSymbolForScript(cWbtcScript)).toBe("UDT-9a108653");
  });

  it("chooses the most frequently advertised name for conflicting configs", () => {
    const nodes: FiberGraphNode[] = [
      advertisedNode("node-a", "Wrapped BTC"),
      advertisedNode("node-b", "cWBTC"),
      advertisedNode("node-c", "cWBTC"),
    ];

    const symbolIndex = assetSymbolIndexFromNodes(nodes);

    expect(assetSymbolForScript(cWbtcScript, chainHash, symbolIndex)).toBe(
      "cWBTC",
    );
  });
});

function advertisedNode(pubkey: string, name: string): FiberGraphNode {
  return {
    node_name: "",
    addresses: [],
    features: [],
    pubkey,
    chain_hash: chainHash,
    udt_cfg_infos: [{ name, script: cWbtcScript }],
  };
}
