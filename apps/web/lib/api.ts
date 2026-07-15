const BROWSER_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const SERVER_API_URL = process.env.FIBERSCOPE_SERVER_API_URL ?? BROWSER_API_URL;

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${SERVER_API_URL}${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  const response = await fetch(`${SERVER_API_URL}${path}`, {
    cache: "no-store",
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`API ${path} failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function apiUrl(path: string): string {
  return `${BROWSER_API_URL}${path}`;
}

export function truncateMiddle(value: string, left = 10, right = 8): string {
  if (value.length <= left + right + 3) {
    return value;
  }
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export function formatInteger(value?: string | number | null): string {
  if (value === null || value === undefined) {
    return "unknown";
  }
  return BigInt(value).toLocaleString("en-US");
}

export function formatCkb(value?: string | number | null): string {
  if (value === null || value === undefined) {
    return "unknown";
  }
  const amount = BigInt(value);
  const whole = amount / 100_000_000n;
  const fraction = (amount % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${fraction ? `.${fraction}` : ""} CKB`;
}
