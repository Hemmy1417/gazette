"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/genlayer/wallet";
import { getRecords } from "@/lib/contracts/gazette";
import { Stamp } from "@/components/Stamp";
import { StateTag } from "@/components/RecordCard";
import { HowTo } from "@/components/HowTo";
import type { GazetteRecord } from "@/lib/contracts/types";

type Preflight = { verdict: "ready" | "blocked" | "gone" | "invalid"; note: string };

export default function WitnessPage() {
  const { address, mode, performWrite } = useWallet();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [claim, setClaim] = useState("");
  const [showClaim, setShowClaim] = useState(false);

  const [pre, setPre] = useState<Preflight | null>(null);
  const [checking, setChecking] = useState(false);
  const [witnessing, setWitnessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GazetteRecord | null>(null);

  const signedIn = !!address;

  async function handlePreflight() {
    if (!url.trim()) return;
    setChecking(true); setPre(null); setError("");
    try {
      const res = await fetch("/api/preflight", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      setPre(await res.json());
    } catch {
      setPre({ verdict: "blocked", note: "Could not preflight — you can still witness." });
    } finally {
      setChecking(false);
    }
  }

  async function handleWitness() {
    if (!url.trim()) return setError("Paste a URL to witness.");
    setError(""); setWitnessing(true); setResult(null);
    try {
      const rec = await performWrite<GazetteRecord>("witness", [url.trim(), note.trim(), showClaim ? claim.trim() : ""]);
      if (rec?.record_id) {
        setResult(rec);
      } else {
        const recent = await getRecords(1);
        if (recent[0]) setResult(recent[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Witnessing failed");
    } finally {
      setWitnessing(false);
    }
  }

  function reset() {
    setResult(null); setUrl(""); setNote(""); setClaim(""); setShowClaim(false); setPre(null);
  }

  // ── result: the witnessed record ──
  if (result) {
    const a = result.attestation;
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Stamp press />
        </div>
        <div className="certificate">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span className="eyebrow" style={{ color: "var(--stamp)" }}>{a.outlet || "Witnessed"}</span>
            <StateTag state={a.page_state} />
          </div>
          <h1 className="display-md" style={{ marginBottom: 12 }}>{a.title || result.note || "Untitled page"}</h1>
          <p className="serif-lead" style={{ marginBottom: 16, color: "var(--ink-soft)" }}>{a.summary}</p>
          {a.key_claims.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Key claims on the page</div>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {a.key_claims.map((c, i) => (
                  <li key={i} className="serif-body" style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--stamp)" }}>—</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="hairline" style={{ margin: "16px 0" }} />
          <div className="byline" style={{ lineHeight: 1.7 }}>
            {a.author && <div>By {a.author}</div>}
            {a.as_of && <div>Page dated: {a.as_of}</div>}
            <div style={{ wordBreak: "break-all" }}>Source: {result.url}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href={`/record/${result.record_id}`} className="btn-primary">Open the certificate</Link>
          <button onClick={reset} className="btn-outline">Witness another</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>The witness desk</div>
      <h1 className="display-lg" style={{ marginBottom: 12 }}>Witness a page</h1>
      <p className="serif-lead" style={{ marginBottom: 32, color: "var(--ink-soft)" }}>
        Paste the URL of any live web page — someone else&apos;s article, press release,
        policy page. GenLayer&apos;s validators will each fetch it independently and agree on
        what it says. Come back later; if the site&apos;s owner has edited or removed the
        page, the Gazette catches it.
      </p>

      <HowTo
        id="witness"
        title="The witness desk"
        steps={[
          <>You&apos;re recording what someone else&apos;s public web page says right now. In real use this is a news article, a government page, a corporate statement — any URL that could get quietly changed later.</>,
          <><strong>Paste the URL</strong>.</>,
          <><strong>Check reachability</strong> (optional) — a quick preflight fetches the page from our servers to warn you if it&apos;s paywalled or bot-walled. A BLOCKED record is still valid evidence.</>,
          <><strong>Add a note</strong> (optional, public) — why this matters, or what to watch for.</>,
          <><strong>Ask a claim question</strong> (optional) — a yes/no question about the page. The witness answers with the closest supporting quote.</>,
          <><strong>Press &ldquo;Witness this page&rdquo;</strong> — validators each fetch the page and agree on what it says. One to three minutes.</>,
          <>The result is a permanent certificate you can share, cite, or embed. If the site owner changes the page later, come back and re-witness — the Gazette catches the diff.</>,
        ]}
      />

      {!signedIn && (
        <div style={{ border: "1px solid var(--ink)", padding: 20, marginBottom: 24 }}>
          <p className="sans-strong" style={{ marginBottom: 8 }}>Sign in to witness</p>
          <p className="serif-body" style={{ marginBottom: 16, color: "var(--ink-soft)" }}>
            Use an email account or connect a wallet — either way you get a wallet that signs your witnessings.
          </p>
          <Link href="/account" className="btn-primary">Sign in</Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20, opacity: signedIn ? 1 : 0.55, pointerEvents: signedIn ? "auto" : "none" }}>
        <div>
          <label className="sans-sm-strong" style={{ display: "block", marginBottom: 8, textTransform: "uppercase" }}>The URL</label>
          <input className="field mono" placeholder="https://…" value={url}
            onChange={(e) => { setUrl(e.target.value); setPre(null); }}
            onBlur={handlePreflight} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 12, flexWrap: "wrap" }}>
            <p className="caption">Tracking params are stripped on-chain. Fragments are ignored.</p>
            <button className="btn-quiet" style={{ fontSize: 13 }} disabled={!url.trim() || checking} onClick={handlePreflight}>
              {checking ? "Checking reachability…" : "Check reachability"}
            </button>
          </div>
          {pre && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: pre.verdict === "ready" ? "var(--live-bg)" : pre.verdict === "gone" ? "var(--gone-bg)" : "var(--blocked-bg)" }}>
              <span className="sans-sm-strong" style={{ color: pre.verdict === "ready" ? "var(--live)" : pre.verdict === "gone" ? "var(--gone)" : "var(--blocked)" }}>
                {pre.verdict === "ready" ? "Reachable" : pre.verdict === "gone" ? "Looks gone" : pre.verdict === "invalid" ? "Invalid" : "Possible wall"}
              </span>
              <span className="sans-sm" style={{ marginLeft: 8 }}>{pre.note}</span>
            </div>
          )}
        </div>

        <div>
          <label className="sans-sm-strong" style={{ display: "block", marginBottom: 8, textTransform: "uppercase" }}>Note <span style={{ fontWeight: 400, textTransform: "none" }}>— optional, public</span></label>
          <input className="field" placeholder="Why this matters, or what to watch for" value={note}
            onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>

        {!showClaim ? (
          <button className="btn-quiet" style={{ alignSelf: "flex-start", fontSize: 14 }} onClick={() => setShowClaim(true)}>
            + Ask the witness a yes/no question about the page
          </button>
        ) : (
          <div>
            <label className="sans-sm-strong" style={{ display: "block", marginBottom: 8, textTransform: "uppercase" }}>Claim to check</label>
            <input className="field" placeholder="e.g. Does the article say the minister resigned?" value={claim}
              onChange={(e) => setClaim(e.target.value)} maxLength={300} />
            <p className="caption" style={{ marginTop: 6 }}>The witness answers yes / no / unclear, with the closest supporting quote.</p>
          </div>
        )}

        {error && (
          <div style={{ background: "var(--gone-bg)", border: "1px solid var(--gone)", padding: 12 }}>
            <span className="sans-sm" style={{ color: "var(--gone)" }}>{error}</span>
          </div>
        )}

        <button className="btn-stamp" style={{ width: "100%" }} disabled={witnessing || !signedIn} onClick={handleWitness}>
          {witnessing ? "Validators are witnessing…" : "Witness this page"}
        </button>
        {witnessing && (
          <p className="caption" style={{ textAlign: "center" }}>
            {mode === "email" ? "Your account wallet is signing. " : ""}
            Independent validators are each fetching the page and agreeing on what it says.
            This takes one to three minutes — keep this page open.
          </p>
        )}
      </div>
    </div>
  );
}
