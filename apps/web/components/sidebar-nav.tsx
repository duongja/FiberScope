"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  CircleDollarSign,
  Gauge,
  GitFork,
  Network,
  Stethoscope,
  Telescope,
  type LucideIcon,
} from "lucide-react";

const nav: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/nodes", label: "Nodes", icon: Network },
  { href: "/channels", label: "Channels", icon: GitFork },
  { href: "/routes", label: "Routes", icon: Activity },
  { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { href: "/observability", label: "Observability", icon: Telescope },
  { href: "/liquidity", label: "Liquidity", icon: CircleDollarSign },
  { href: "/docs", label: "API Docs", icon: Boxes },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Primary">
      {nav.map((item) => {
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
    </nav>
  );
}
