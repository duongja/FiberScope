"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  GitFork,
  Network,
  Stethoscope,
  Telescope,
  type LucideIcon,
} from "lucide-react";

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/nodes", label: "Nodes", icon: Network },
  { href: "/channels", label: "Channels", icon: GitFork },
  { href: "/routes", label: "Routes", icon: Activity },
  { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { href: "/observability", label: "Observability", icon: Telescope },
  { href: "/liquidity", label: "Liquidity", icon: CircleDollarSign },
];

const docsItems = [
  { href: "/docs", label: "Docs Home" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/docs/routes", label: "Routes" },
  { href: "/docs/diagnostics", label: "Diagnostics" },
  { href: "/docs/readiness", label: "Readiness" },
  { href: "/docs/exports", label: "Exports" },
  { href: "/docs/reference", label: "Reference" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const docsActive = pathname.startsWith("/docs");
  const [docsOpen, setDocsOpen] = useState(docsActive);

  useEffect(() => {
    if (docsActive) {
      setDocsOpen(true);
    }
  }, [docsActive]);

  return (
    <nav className="nav" aria-label="Primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            <Icon size={17} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
      <div className={`nav-group ${docsOpen ? "open" : ""}`}>
        <button
          aria-expanded={docsOpen}
          className={docsActive ? "active" : undefined}
          onClick={() => setDocsOpen((open) => !open)}
          type="button"
        >
          <Boxes size={17} aria-hidden="true" />
          API Docs
          <ChevronDown className="nav-chevron" size={15} aria-hidden="true" />
        </button>
        {docsOpen ? (
          <div className="nav-subnav">
            {docsItems.map((item) => {
              const active =
                item.href === "/docs"
                  ? pathname === "/docs"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "active" : undefined}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
