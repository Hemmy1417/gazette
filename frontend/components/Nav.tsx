"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, shortAddr } from "@/lib/genlayer/wallet";
import { Wordmark } from "./Stamp";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/witness", label: "Witness" },
  { href: "/records", label: "The Record" },
  { href: "/memory-hole", label: "Memory Hole" },
  { href: "/dossiers", label: "Dossiers" },
  { href: "/try-it", label: "Try it" },
];

export default function Nav() {
  const { address, mode, email } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const account = mode === "email" ? (email || "Account") : address ? shortAddr(address) : null;

  return (
    <header style={{ borderBottom: "3px double var(--ink)", position: "sticky", top: 0, zIndex: 40, background: "var(--canvas)" }}>
      {/* masthead band */}
      <div style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span className="caption" style={{ letterSpacing: "0.5px" }}>The official record of the living web</span>
          <span className="caption desktop-only" style={{ letterSpacing: "0.5px" }}>Witnessed on GenLayer · Studionet</span>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        {/* mobile hamburger */}
        <button onClick={() => setMobileOpen((o) => !o)} aria-label="Menu" className="mobile-only"
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, flexDirection: "column", gap: 5 }}>
          <span style={{ width: 22, height: 2, background: "var(--ink)", transition: "transform 0.2s", transform: mobileOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <span style={{ width: 22, height: 2, background: "var(--ink)", transition: "opacity 0.2s", opacity: mobileOpen ? 0 : 1 }} />
          <span style={{ width: 22, height: 2, background: "var(--ink)", transition: "transform 0.2s", transform: mobileOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>

        <Link href="/" style={{ textDecoration: "none" }}><Wordmark size={30} /></Link>

        <nav className="desktop-only" style={{ alignItems: "center", gap: 24, flex: 1, justifyContent: "center" }}>
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="sans-sm-strong"
              style={{ textDecoration: "none", textTransform: "uppercase", color: pathname === href ? "var(--stamp)" : "var(--ink)", whiteSpace: "nowrap" }}>
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/account" className="btn-outline" style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}>
          {account ?? "Sign in"}
        </Link>
      </div>

      {mobileOpen && typeof document !== "undefined" && createPortal(
        <div className="mobile-only" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "var(--canvas)", zIndex: 9999, overflowY: "auto", flexDirection: "column", padding: 24, paddingTop: 88, gap: 4 }}>
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="display-sm" style={{ textDecoration: "none", padding: "14px 0", borderBottom: "1px solid var(--hairline)" }}>
              {label}
            </Link>
          ))}
          <Link href="/account" className="display-sm" style={{ textDecoration: "none", padding: "14px 0" }}>
            {account ?? "Sign in"}
          </Link>
        </div>,
        document.body,
      )}
    </header>
  );
}
