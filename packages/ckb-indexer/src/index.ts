export interface ParsedOutpoint {
  txHash: string;
  index: string;
  indexNumber: number;
}

export interface CkbOutpointEnrichment {
  txHash?: string;
  outputIndex?: number;
  status: "LIVE" | "SPENT" | "UNKNOWN" | "UNPARSEABLE";
  blockNumber?: bigint;
  blockTimestamp?: Date;
  spentByTxHash?: string;
  explorerUrl?: string;
  error?: string;
}

interface CkbRpcOptions {
  rpcUrl: string;
  explorerBaseUrl?: string;
  timeoutMs?: number;
}

export class CkbRpcClient {
  private id = 0;
  private readonly timeoutMs: number;

  constructor(private readonly options: CkbRpcOptions) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  parseOutpoint(value: string): ParsedOutpoint | null {
    const hex = value.startsWith("0x") ? value.slice(2) : value;
    if (hex.length < 72) {
      return null;
    }
    const txHash = `0x${hex.slice(0, 64)}`;
    const indexBytes = hex.slice(64, 72);
    const littleEndian = indexBytes.match(/../g)?.reverse().join("") ?? "00000000";
    const indexNumber = Number.parseInt(littleEndian, 16);
    return {
      txHash,
      indexNumber,
      index: `0x${indexNumber.toString(16)}`,
    };
  }

  async enrichOutpoint(channelOutpoint: string): Promise<CkbOutpointEnrichment> {
    const parsed = this.parseOutpoint(channelOutpoint);
    if (!parsed) {
      return {
        status: "UNPARSEABLE",
        error: "Fiber channel outpoint could not be decoded as a CKB OutPoint",
      };
    }

    try {
      const liveCell = await this.call<{
        status: "live" | "unknown";
        cell?: {
          output?: unknown;
          block_number?: string;
        };
      }>("get_live_cell", [{ tx_hash: parsed.txHash, index: parsed.index }, false]);

      return {
        txHash: parsed.txHash,
        outputIndex: parsed.indexNumber,
        status: liveCell.status === "live" ? "LIVE" : "UNKNOWN",
        blockNumber: liveCell.cell?.block_number ? BigInt(liveCell.cell.block_number) : undefined,
        explorerUrl: this.explorerTransactionUrl(parsed.txHash),
      };
    } catch (error) {
      return {
        txHash: parsed.txHash,
        outputIndex: parsed.indexNumber,
        status: "UNKNOWN",
        explorerUrl: this.explorerTransactionUrl(parsed.txHash),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const id = ++this.id;

    try {
      const response = await fetch(this.options.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`CKB RPC HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        result?: T;
        error?: { code: number; message: string };
      };
      if (payload.error) {
        throw new Error(payload.error.message);
      }
      if (payload.result === undefined) {
        throw new Error(`CKB RPC ${method} returned no result`);
      }
      return payload.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  private explorerTransactionUrl(txHash: string): string | undefined {
    if (!this.options.explorerBaseUrl) {
      return undefined;
    }
    return `${this.options.explorerBaseUrl.replace(/\/$/, "")}/transaction/${txHash}`;
  }
}
