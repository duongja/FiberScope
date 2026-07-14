export interface WorkerEnv {
  fiberRpcUrls: string[];
  graphPollIntervalSeconds: number;
  ckbRpcUrl?: string;
  ckbExplorerBaseUrl?: string;
  ckbEnrichIntervalSeconds: number;
  enableReachabilityProbes: boolean;
  reachabilityProbeIntervalSeconds: number;
  reachabilityTimeoutMs: number;
  reachabilityProbeLimit: number;
  useSampleData: boolean;
  runOnce: boolean;
}

export function readEnv(): WorkerEnv {
  return {
    fiberRpcUrls: splitList(process.env.FIBER_RPC_URLS),
    graphPollIntervalSeconds: readNumber(
      process.env.FIBER_GRAPH_POLL_INTERVAL_SECONDS,
      60,
    ),
    ckbRpcUrl: process.env.CKB_RPC_URL,
    ckbExplorerBaseUrl: process.env.CKB_EXPLORER_BASE_URL,
    ckbEnrichIntervalSeconds: readNumber(
      process.env.CKB_ENRICH_INTERVAL_SECONDS,
      180,
    ),
    enableReachabilityProbes:
      process.env.FIBERSCOPE_ENABLE_REACHABILITY_PROBES === "true",
    reachabilityProbeIntervalSeconds: readNumber(
      process.env.FIBERSCOPE_REACHABILITY_PROBE_INTERVAL_SECONDS,
      300,
    ),
    reachabilityTimeoutMs: readNumber(
      process.env.FIBERSCOPE_REACHABILITY_TIMEOUT_MS,
      2_500,
    ),
    reachabilityProbeLimit: readNumber(
      process.env.FIBERSCOPE_REACHABILITY_PROBE_LIMIT,
      50,
    ),
    useSampleData: process.env.FIBERSCOPE_USE_SAMPLE_DATA !== "false",
    runOnce: process.env.FIBERSCOPE_WORKER_ONCE === "true",
  };
}

function splitList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
