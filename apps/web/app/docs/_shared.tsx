import Link from "next/link";
import { apiUrl } from "../../lib/api";

export const sourcePubkey =
  "0313d0a1c4d2b028da68905f9088531f3ea7db5139788bbb681ccc7b17fdf8b6df";
export const directTargetPubkey =
  "0313dcf9cf18711b1b473a78ea56222dc44dcbfdf559d24dd937a0657d3bcb108f";
export const multiHopTargetPubkey =
  "0349fdc5ae3fd050831a89b544cceeb2e8c6e1d6ecfc1e4f0cdb689be263b02d5a";
export const failedTargetPubkey =
  "032c9c03ec4235e52f08ee46a508de3ce310ad7ee32f39b46507137db2d6a6456f";

export const docsPages = [
  {
    href: "/docs/getting-started",
    title: "Getting Started",
    description: "Base URL, amount units, health checks, and first requests.",
  },
  {
    href: "/docs/routes",
    title: "Routes",
    description: "Route estimate, can-pay, and copy-paste route test values.",
  },
  {
    href: "/docs/diagnostics",
    title: "Diagnostics",
    description: "Failure classification with optional route context.",
  },
  {
    href: "/docs/readiness",
    title: "Readiness And Liquidity",
    description: "Receive readiness and peer recommendations for wallets.",
  },
  {
    href: "/docs/exports",
    title: "Exports",
    description: "Graph JSON, CSV exports, and OpenAPI contract.",
  },
  {
    href: "/docs/reference",
    title: "Endpoint Reference",
    description: "Compact list of all public read-only API endpoints.",
  },
];

export function DocsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <a className="button secondary" href={apiUrl("/api/openapi.json")}>
        OpenAPI JSON
      </a>
    </div>
  );
}

export function DocsNav() {
  return (
    <nav className="docs-nav-grid" aria-label="API documentation sections">
      {docsPages.map((page) => (
        <Link className="card docs-nav-card" href={page.href} key={page.href}>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </Link>
      ))}
    </nav>
  );
}

export function EndpointRow({
  path,
  purpose,
  consumer,
}: {
  path: string;
  purpose: string;
  consumer: string;
}) {
  return (
    <tr>
      <td className="mono">{path}</td>
      <td>{purpose}</td>
      <td>{consumer}</td>
    </tr>
  );
}

export function ExampleCard({
  title,
  badge,
  tone,
  description,
  code,
}: {
  title: string;
  badge: string;
  tone: "green" | "red" | "orange";
  description: string;
  code: string;
}) {
  return (
    <div className="card docs-example-card">
      <div className="docs-example-head">
        <h3>{title}</h3>
        <span className={`badge ${tone}`}>{badge}</span>
      </div>
      <p className="muted">{description}</p>
      <pre>{code}</pre>
    </div>
  );
}

export function DiagnosticExample({
  title,
  expected,
  body,
}: {
  title: string;
  expected: string;
  body: string;
}) {
  return (
    <div className="docs-diagnostic-example">
      <div>
        <h3>{title}</h3>
        <p className="muted">{expected}</p>
      </div>
      <pre>{`curl -sS ${apiUrl("/api/diagnostics/explain")} \\
  -H "content-type: application/json" \\
  -d '${body}'`}</pre>
    </div>
  );
}

export function CurlBlock({ children }: { children: string }) {
  return <pre>{children}</pre>;
}

export function AmountNote() {
  return (
    <div className="callout docs-callout">
      Amounts are raw smallest units. For CKB, <code>100000000</code> equals{" "}
      <code>1 CKB</code>.
    </div>
  );
}
