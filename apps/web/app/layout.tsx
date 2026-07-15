import type { Metadata } from "next";
import Link from "next/link";
import { SidebarNav } from "../components/sidebar-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FiberScope",
  description:
    "Fiber Network explorer, route diagnostics, and liquidity intelligence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link className="brand" href="/">
              <strong>FiberScope</strong>
              <span>Network intelligence</span>
            </Link>
            <SidebarNav />
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
