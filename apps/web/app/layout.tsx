import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Boxes,
  CircleDollarSign,
  Gauge,
  GitFork,
  Network,
  Stethoscope,
  Telescope,
} from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiberScope",
  description: "Fiber Network explorer, route diagnostics, and liquidity intelligence.",
};

const nav = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/nodes", label: "Nodes", icon: Network },
  { href: "/channels", label: "Channels", icon: GitFork },
  { href: "/routes", label: "Routes", icon: Activity },
  { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { href: "/observability", label: "Observability", icon: Telescope },
  { href: "/liquidity", label: "Liquidity", icon: CircleDollarSign },
  { href: "/docs", label: "API Docs", icon: Boxes },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link className="brand" href="/">
              <div className="brand-mark">FS</div>
              <div>
                <strong>FiberScope</strong>
                <span>Network intelligence</span>
              </div>
            </Link>
            <nav className="nav" aria-label="Primary">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link href={item.href} key={item.href}>
                    <Icon size={17} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
