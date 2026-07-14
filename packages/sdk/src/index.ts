import type {
  NetworkSummary,
  ReachabilitySummary,
  RouteEstimateResponse,
} from "@fiberscope/shared";

export interface FiberScopeClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface RouteQuery {
  sourcePubkey: string;
  targetPubkey: string;
  asset?: string;
  amount: string;
}

export interface ReceiveQuery {
  targetPubkey: string;
  asset?: string;
  amount: string;
}

export interface LiquidityRecommendationQuery {
  asset?: string;
  amount?: string;
}

export interface DiagnosticQuery {
  message: string;
  code?: string;
  sourcePubkey?: string;
  targetPubkey?: string;
  asset?: string;
  amount?: string;
}

export interface CanReceiveResponse {
  canReceive: boolean;
  confidence: number;
  inboundDirectionCount: number;
  usableInboundDirectionCount: number;
  warnings: string[];
  recommendedActions: string[];
}

export interface LiquidityRecommendationResponse {
  assetId: string;
  recommendations: Array<{
    pubkey: string;
    nodeName: string;
    score: number;
    publicChannelCount: number;
    usableDirectionCount: number;
    autoAcceptMinCkbFundingAmount?: string | null;
  }>;
}

export interface DiagnosticResponse {
  category: string;
  explanation: string;
  recommendedActions: string[];
  routeEstimate: RouteEstimateResponse | null;
  suppliedContext: {
    sourcePubkey: string | null;
    targetPubkey: string | null;
    asset: string;
    amount: string | null;
  };
}

export interface GraphExportResponse {
  generatedAt: string;
  privacyBoundary: string;
  reachability: ReachabilitySummary;
  assets: unknown[];
  nodes: unknown[];
  channels: unknown[];
}

export class FiberScopeClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FiberScopeClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  networkSummary(): Promise<NetworkSummary> {
    return this.get("/api/network/summary");
  }

  canPay(query: RouteQuery): Promise<RouteEstimateResponse> {
    return this.get(`/api/readiness/can-pay?${routeParams(query).toString()}`);
  }

  estimateRoute(query: RouteQuery): Promise<RouteEstimateResponse> {
    return this.get(`/api/routes/estimate?${routeParams(query).toString()}`);
  }

  canReceive(query: ReceiveQuery): Promise<CanReceiveResponse> {
    const params = new URLSearchParams({
      target_pubkey: query.targetPubkey,
      asset: query.asset ?? "CKB",
      amount: query.amount,
    });
    return this.get(`/api/readiness/can-receive?${params.toString()}`);
  }

  liquidityRecommendations(
    query: LiquidityRecommendationQuery = {},
  ): Promise<LiquidityRecommendationResponse> {
    const params = new URLSearchParams();
    if (query.asset) {
      params.set("asset", query.asset);
    }
    if (query.amount) {
      params.set("amount", query.amount);
    }
    const suffix = params.size ? `?${params.toString()}` : "";
    return this.get(`/api/liquidity/recommendations${suffix}`);
  }

  diagnose(query: DiagnosticQuery): Promise<DiagnosticResponse> {
    return this.post("/api/diagnostics/explain", {
      message: query.message,
      code: query.code,
      source_pubkey: query.sourcePubkey,
      target_pubkey: query.targetPubkey,
      asset: query.asset,
      amount: query.amount,
    });
  }

  graphExport(): Promise<GraphExportResponse> {
    return this.get("/api/export/graph.json");
  }

  nodesCsv(): Promise<string> {
    return this.getText("/api/export/nodes.csv");
  }

  channelsCsv(): Promise<string> {
    return this.getText("/api/export/channels.csv");
  }

  openApi(): Promise<unknown> {
    return this.get("/api/openapi.json");
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`);
    return parseResponse<T>(response);
  }

  private async getText(path: string): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`);
    return parseTextResponse(response);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseResponse<T>(response);
  }
}

function routeParams(query: RouteQuery): URLSearchParams {
  return new URLSearchParams({
    source_pubkey: query.sourcePubkey,
    target_pubkey: query.targetPubkey,
    asset: query.asset ?? "CKB",
    amount: query.amount,
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new FiberScopeApiError(
      payload.error ?? `FiberScope API returned HTTP ${response.status}`,
      response.status,
    );
  }
  return payload;
}

async function parseTextResponse(response: Response): Promise<string> {
  const payload = await response.text();
  if (!response.ok) {
    throw new FiberScopeApiError(
      payload || `FiberScope API returned HTTP ${response.status}`,
      response.status,
    );
  }
  return payload;
}

export class FiberScopeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "FiberScopeApiError";
  }
}
