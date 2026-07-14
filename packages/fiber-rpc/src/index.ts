import type { FiberGraph, FiberGraphChannel, FiberGraphNode } from "@fiberscope/shared";
import { toHexQuantity } from "@fiberscope/shared";

export class FiberRpcError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "FiberRpcError";
  }
}

export interface FiberRpcClientOptions {
  url: string;
  timeoutMs?: number;
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface GraphNodesResult {
  nodes: FiberGraphNode[];
  last_cursor?: string;
}

interface GraphChannelsResult {
  channels: FiberGraphChannel[];
  last_cursor?: string;
}

export class FiberRpcClient {
  private id = 0;
  private readonly timeoutMs: number;

  constructor(private readonly options: FiberRpcClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async call<T>(method: string, params?: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const id = ++this.id;

    try {
      const response = await fetch(this.options.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method,
          params: params ?? [],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new FiberRpcError(`Fiber RPC HTTP ${response.status} from ${this.options.url}`);
      }

      const payload = (await response.json()) as JsonRpcResponse<T>;
      if (payload.error) {
        throw new FiberRpcError(payload.error.message, payload.error.code, payload.error.data);
      }
      if (payload.result === undefined) {
        throw new FiberRpcError(`Fiber RPC ${method} returned no result`);
      }
      return payload.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async graphNodes(limit = 500, after?: string): Promise<GraphNodesResult> {
    return this.call<GraphNodesResult>("graph_nodes", [
      {
        limit: toHexQuantity(limit),
        ...(after ? { after } : {}),
      },
    ]);
  }

  async graphChannels(limit = 500, after?: string): Promise<GraphChannelsResult> {
    return this.call<GraphChannelsResult>("graph_channels", [
      {
        limit: toHexQuantity(limit),
        ...(after ? { after } : {}),
      },
    ]);
  }

  async nodeInfo(): Promise<unknown> {
    return this.call("node_info");
  }

  async sendPaymentDryRun(params: Record<string, unknown>): Promise<unknown> {
    return this.call("send_payment", [{ ...params, dry_run: true }]);
  }

  async fetchGraph(limit = 500): Promise<FiberGraph> {
    const nodes: FiberGraphNode[] = [];
    const channels: FiberGraphChannel[] = [];
    let afterNodes: string | undefined;
    let afterChannels: string | undefined;

    for (let page = 0; page < 100; page += 1) {
      const result = await this.graphNodes(limit, afterNodes);
      nodes.push(...result.nodes);
      if (!result.last_cursor || result.nodes.length < limit || result.last_cursor === afterNodes) {
        break;
      }
      afterNodes = result.last_cursor;
    }

    for (let page = 0; page < 100; page += 1) {
      const result = await this.graphChannels(limit, afterChannels);
      channels.push(...result.channels);
      if (
        !result.last_cursor ||
        result.channels.length < limit ||
        result.last_cursor === afterChannels
      ) {
        break;
      }
      afterChannels = result.last_cursor;
    }

    return { nodes, channels };
  }
}
