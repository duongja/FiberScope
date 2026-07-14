export type HexString = `0x${string}` | string;

export type AssetKind = "CKB" | "UDT" | "UNKNOWN";

export interface UdtTypeScript {
  code_hash: string;
  hash_type: string;
  args: string;
}

export interface FiberUdtConfigInfo {
  name?: string;
  script?: UdtTypeScript;
  auto_accept_amount?: string | number;
  cell_deps?: unknown;
}

export interface FiberGraphNode {
  node_name: string;
  version?: string;
  addresses: string[];
  features: string[];
  pubkey: string;
  timestamp?: string | number;
  chain_hash?: string;
  auto_accept_min_ckb_funding_amount?: string | number;
  udt_cfg_infos?: FiberUdtConfigInfo[] | unknown;
}

export interface FiberChannelUpdateInfo {
  timestamp?: string | number;
  enabled: boolean;
  outbound_liquidity?: string | number | null;
  tlc_expiry_delta?: string | number;
  tlc_minimum_value?: string | number;
  fee_rate?: string | number;
}

export interface FiberGraphChannel {
  channel_outpoint: string;
  node1: string;
  node2: string;
  created_timestamp?: string | number;
  update_info_of_node1?: FiberChannelUpdateInfo | null;
  update_info_of_node2?: FiberChannelUpdateInfo | null;
  capacity: string | number;
  chain_hash?: string;
  udt_type_script?: UdtTypeScript | null;
}

export interface FiberGraph {
  nodes: FiberGraphNode[];
  channels: FiberGraphChannel[];
}

export interface RouteHop {
  channelOutpoint: string;
  fromPubkey: string;
  toPubkey: string;
  fee: string;
  feeRate: string;
  confidenceImpact: number;
  warnings: string[];
}

export interface RouteEstimateResponse {
  canPay: boolean;
  confidence: number;
  asset: string;
  amount: string;
  estimatedFee: string;
  hopCount: number;
  route: RouteHop[];
  alternatives: RouteHop[][];
  warnings: string[];
  recommendedActions: string[];
}

export interface ReachabilitySummary {
  reachableNodeCount: number;
  unreachableNodeCount: number;
  unprobedNodeCount: number;
  latestProbeAt: string | null;
}

export interface NetworkSummary {
  nodeCount: number;
  channelCount: number;
  enabledDirectionCount: number;
  disabledDirectionCount: number;
  capacityByAsset: Array<{
    assetId: string;
    symbol: string;
    kind: AssetKind;
    capacity: string;
    channelCount: number;
  }>;
  staleNodeCount: number;
  staleChannelCount: number;
  reachability: ReachabilitySummary;
  lastSnapshotAt: string | null;
}

export const CKB_ASSET_ID = "ckb";
export const CKB_SYMBOL = "CKB";
export const FEE_RATE_DENOMINATOR = 1_000_000n;

export function toBigIntAmount(
  value: string | number | bigint | null | undefined,
): bigint {
  if (value === null || value === undefined || value === "") {
    return 0n;
  }
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(Math.trunc(value));
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("0x")) {
    return BigInt(normalized);
  }
  return BigInt(normalized);
}

export function toDecimalString(
  value: string | number | bigint | null | undefined,
): string {
  return toBigIntAmount(value).toString();
}

export function toNumber(
  value: string | number | bigint | null | undefined,
): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  return Number(toBigIntAmount(value));
}

export function toHexQuantity(value: number | bigint): string {
  return `0x${BigInt(value).toString(16)}`;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function assetIdForScript(
  script?: UdtTypeScript | null,
  chainHash?: string,
): string {
  if (!script) {
    return CKB_ASSET_ID;
  }
  return `udt:${chainHash ?? "unknown"}:${script.code_hash}:${script.hash_type}:${script.args}`;
}

export function assetSymbolForScript(
  script?: UdtTypeScript | null,
  chainHash?: string,
  advertisedSymbols?: ReadonlyMap<string, string>,
): string {
  if (!script) {
    return CKB_SYMBOL;
  }
  const assetId = assetIdForScript(script, chainHash);
  const advertisedSymbol = advertisedSymbols?.get(assetId);
  if (advertisedSymbol) {
    return advertisedSymbol;
  }
  const args = script.args?.replace(/^0x/, "").slice(0, 8) || "asset";
  return `UDT-${args}`;
}

export function assetSymbolIndexFromNodes(
  nodes: FiberGraphNode[],
): Map<string, string> {
  const votes = new Map<string, Map<string, number>>();

  for (const node of nodes) {
    const configs = parseUdtConfigInfos(node.udt_cfg_infos);
    for (const config of configs) {
      const symbol = normalizeAssetSymbol(config.name);
      if (!symbol || !config.script) {
        continue;
      }
      const assetId = assetIdForScript(config.script, node.chain_hash);
      const symbolVotes = votes.get(assetId) ?? new Map<string, number>();
      symbolVotes.set(symbol, (symbolVotes.get(symbol) ?? 0) + 1);
      votes.set(assetId, symbolVotes);
    }
  }

  return new Map(
    [...votes.entries()].map(([assetId, symbolVotes]) => [
      assetId,
      [...symbolVotes.entries()].sort(
        ([leftName, leftCount], [rightName, rightCount]) =>
          rightCount - leftCount || leftName.localeCompare(rightName),
      )[0][0],
    ]),
  );
}

export function formatAmount(
  value: string | number | bigint | null | undefined,
  symbol = "",
): string {
  const amount = toBigIntAmount(value);
  if (symbol === "CKB") {
    const whole = amount / 100_000_000n;
    const fractional = amount % 100_000_000n;
    const frac = fractional.toString().padStart(8, "0").replace(/0+$/, "");
    return `${whole.toString()}${frac ? `.${frac}` : ""} CKB`;
  }
  return `${amount.toString()}${symbol ? ` ${symbol}` : ""}`;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortJson(nested)]),
    );
  }
  return value;
}

function parseUdtConfigInfos(value: unknown): FiberUdtConfigInfo[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const configs: FiberUdtConfigInfo[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const script = parseUdtTypeScript(item.script);
    configs.push({
      name: typeof item.name === "string" ? item.name : undefined,
      script: script ?? undefined,
    });
  }
  return configs;
}

function parseUdtTypeScript(value: unknown): UdtTypeScript | null {
  if (!isRecord(value)) {
    return null;
  }
  const { code_hash, hash_type, args } = value;
  if (
    typeof code_hash !== "string" ||
    typeof hash_type !== "string" ||
    typeof args !== "string"
  ) {
    return null;
  }
  return { code_hash, hash_type, args };
}

function normalizeAssetSymbol(value: string | undefined): string | null {
  const symbol = value?.trim().replace(/\s+/g, " ");
  if (!symbol) {
    return null;
  }
  return symbol.slice(0, 40);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
