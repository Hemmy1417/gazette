"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet, shortAddr } from "@/lib/genlayer/wallet";
import { getRecordsFor, getReputation } from "@/lib/contracts/gazette";
import { StateTag } from "@/components/RecordCard";
import type { GazetteRecord, Reputation } from "@/lib/contracts/types";

export default function AccountPage() {
  const { address, mode, email, wallets, hasWallet, connecting, connectInjected, signUpEmail, signInEmail, exportKey, disconnect } = useWallet();

  const [tab, setTab] = useState<"email" | "wallet">("email");
  const [isSignup, setIsSignup] = useState(false);
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [exported, setExported] = useState<{ address: string; privateKey: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!address) return;
    getRecordsFor(address).then(setRecords).catch(() => {});
    getReputation(address).then(setRep).catch(() => {});
  }, [address]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (isSignup) await signUpEmail(em, pw);
      else await signInEmail(em, pw);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: ", "") : "Auth failed");
    }
  }

  async function handleExport() {
    setExporting(true); setError("");
    try {
      setExported(await exportKey());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  // ── signed in ──
  if (address) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>Your desk</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
          <h1 className="display-lg">{mode === "email" ? email : "Connected wallet"}</h1>
          <button className="btn-outline" style={{ fontSize: 13, padding: "8px 14px" }} onClick={disconnect}>Sign out</button>
        </div>
        <p className="serif-body mono" style={{ color: "var(--ink-soft)", marginBottom: 24 }}>{address}</p>

        {rep && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 20, marginBottom: 32, borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", padding: "20px 0" }}>
            {[
              { label: "Witnessed", value: rep.witnessed },
              { label: "Re-witnessed", value: rep.rewitnessed },
              { label: "Edits caught", value: rep.edits_caught },
              { label: "Vanishings caught", value: rep.gone_caught },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="display-md">{value}</div>
                <div className="sans-sm">{label}</div>
              </div>
            ))}
          </div>
        )}

        {mode === "email" && (
          <div style={{ border: "1px solid var(--ink)", padding: 20, marginBottom: 32 }}>
            <div className="sans-strong" style={{ marginBottom: 6 }}>Export your wallet key</div>
            <p className="serif-body caption" style={{ marginBottom: 12 }}>
              Your account wallet is yours. Export the private key to import it into MetaMask or any wallet —
              your witnessings travel with it. Keep it secret.
            </p>
            {!exported ? (
              <button className="btn-outline" disabled={exporting} onClick={handleExport}>{exporting ? "Exporting…" : "Reveal private key"}</button>
            ) : (
              <div style={{ background: "var(--canvas-soft)", padding: 14, border: "1px solid var(--gone)" }}>
                <p className="sans-sm-strong" style={{ marginBottom: 6, color: "var(--gone)" }}>Never share this. Anyone with it controls your wallet.</p>
                <p className="mono" style={{ wordBreak: "break-all" }}>{exported.privateKey}</p>
              </div>
            )}
          </div>
        )}

        <div className="rule-heavy" style={{ marginBottom: 8 }} />
        <div className="eyebrow" style={{ marginBottom: 16 }}>Your witnessings</div>
        {records.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p className="serif-body" style={{ marginBottom: 16 }}>You haven&apos;t witnessed a page yet.</p>
            <Link href="/witness" className="btn-stamp">Witness one now</Link>
          </div>
        )}
        <div>
          {records.map((r) => (
            <Link key={r.record_id} href={`/record/${r.record_id}`} className="story-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="sans-strong" style={{ marginBottom: 4 }}>{r.attestation.title || r.url}</div>
                <div className="byline">{r.record_id}</div>
              </div>
              <StateTag state={r.latest} />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── signed out: auth ──
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "64px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12, textAlign: "center" }}>Press credentials</div>
      <h1 className="display-md" style={{ marginBottom: 24, textAlign: "center" }}>Sign in to the Gazette</h1>

      <div style={{ display: "flex", border: "1px solid var(--ink)", marginBottom: 24 }}>
        <button onClick={() => setTab("email")} style={{ flex: 1, padding: 12, background: tab === "email" ? "var(--ink)" : "var(--canvas)", color: tab === "email" ? "var(--canvas)" : "var(--ink)", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Email</button>
        <button onClick={() => setTab("wallet")} style={{ flex: 1, padding: 12, background: tab === "wallet" ? "var(--ink)" : "var(--canvas)", color: tab === "wallet" ? "var(--canvas)" : "var(--ink)", border: "none", borderLeft: "1px solid var(--ink)", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Wallet</button>
      </div>

      {error && (
        <div style={{ background: "var(--gone-bg)", border: "1px solid var(--gone)", padding: 12, marginBottom: 16 }}>
          <span className="sans-sm" style={{ color: "var(--gone)" }}>{error}</span>
        </div>
      )}

      {tab === "email" ? (
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p className="serif-body caption">
            {isSignup ? "Create an account and we'll generate a wallet for you — no crypto knowledge needed." : "Welcome back."}
          </p>
          <input className="field" type="email" placeholder="you@newsroom.com" value={em} onChange={(e) => setEm(e.target.value)} required />
          <input className="field" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
          <button type="submit" className="btn-primary" disabled={connecting}>{connecting ? "…" : isSignup ? "Create account" : "Sign in"}</button>
          <button type="button" className="btn-quiet" style={{ alignSelf: "center", fontSize: 13 }} onClick={() => { setIsSignup((s) => !s); setError(""); }}>
            {isSignup ? "Have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="serif-body caption">Connect an injected wallet — MetaMask, Rabby, and others.</p>
          {!hasWallet && <p className="sans-sm" style={{ color: "var(--gone)" }}>No wallet detected. Install MetaMask or Rabby, then reload.</p>}
          {wallets.length > 1 ? (
            wallets.map((w) => (
              <button key={w.info.uuid} className="btn-outline" style={{ justifyContent: "flex-start", gap: 10 }} disabled={connecting}
                onClick={() => connectInjected(w).catch((e) => setError(e.message))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {w.info.icon && <img src={w.info.icon} alt="" width={20} height={20} />}
                {w.info.name}
              </button>
            ))
          ) : (
            <button className="btn-primary" disabled={connecting || !hasWallet} onClick={() => connectInjected().catch((e) => setError(e.message))}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
