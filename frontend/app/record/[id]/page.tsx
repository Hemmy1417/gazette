"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet, shortAddr } from "@/lib/genlayer/wallet";
import { getRecord, getUrlHistory } from "@/lib/contracts/gazette";
import { Stamp } from "@/components/Stamp";
import { StateTag } from "@/components/RecordCard";
import { HowTo } from "@/components/HowTo";
import { CONTRACT_ADDRESS } from "@/lib/config";
import type { GazetteRecord } from "@/lib/contracts/types";

function hostOf(url: string) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>();
  const { address, performWrite } = useWallet();
  const [rec, setRec] = useState<GazetteRecord | null>(null);
  const [siblings, setSiblings] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [rewitnessing, setRewitnessing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const reload = useCallback(async () => {
    if (!id) return;
    const r = await getRecord(id).catch(() => null);
    if (!r) { setNotFound(true); return; }
    setRec(r);
    getUrlHistory(r.url).then((h) => setSiblings(h.length)).catch(() => {});
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function handleRewitness() {
    if (!rec) return;
    setRewitnessing(true); setError("");
    try {
      const updated = await performWrite<GazetteRecord>("rewitness", [rec.record_id]);
      if (updated?.record_id) setRec(updated);
      else await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-witnessing failed");
    } finally {
      setRewitnessing(false);
    }
  }

  function copy(text: string, what: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    });
  }

  if (notFound) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <h1 className="display-md" style={{ marginBottom: 16 }}>No such record</h1>
        <Link href="/records" className="btn-outline">Browse the record</Link>
      </div>
    );
  }
  if (!rec) return <div style={{ maxWidth: 600, margin: "0 auto", padding: "96px 24px", textAlign: "center" }} className="serif-body">Reading the record…</div>;

  const a = rec.attestation;
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const citation = `"${a.title || rec.url}." Witnessed by GAZETTE, record ${rec.record_id}, ${a.as_of ? `page dated ${a.as_of}, ` : ""}${rec.url}. On-chain attestation, GenLayer Studionet.`;
  const badgeCode = `<a href="${siteUrl}/record/${rec.record_id}"><img src="${siteUrl}/api/badge/${rec.record_id}" alt="Gazetted record ${rec.record_id}" /></a>`;
  const apiUrl = `${siteUrl}/api/record/${rec.record_id}`;
  const isMine = address && address.toLowerCase() === rec.witness.toLowerCase();

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
      <HowTo
        id="record"
        title="Reading a certificate"
        steps={[
          <>This is the <strong>permanent, citable record</strong> of what a page said when it was witnessed. It lives on chain — nobody, including us, can edit it.</>,
          <>The <strong>state tag</strong> shows the current verdict: LIVE (unchanged since witnessing), EDITED (the source changed), GONE (the source vanished).</>,
          <><strong>Re-witness</strong> (right rail, sign in required) to check whether the source has changed since. If it has, this record lands in the Memory Hole and the change is recorded here.</>,
          <>Use <strong>Cite this record</strong> to copy a footnote-ready citation, <strong>Embed the badge</strong> to put a proof mark on your own site, or <strong>the JSON API</strong> to consume the attestation programmatically.</>,
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }} className="lg:grid-cols-[1fr_300px]">
        {/* ── The certificate ── */}
        <div>
          <div style={{ position: "absolute", marginTop: -8, marginLeft: -4 }}>
            {(rec.latest === "EDITED" || rec.latest === "GONE") && <Stamp text={rec.latest} />}
          </div>
          <div className="certificate">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="eyebrow" style={{ color: "var(--stamp)" }}>{a.outlet || hostOf(rec.url)}</span>
                <StateTag state={a.page_state} />
              </div>
              <span className="caption mono">{rec.record_id}</span>
            </div>

            <h1 className="display-md" style={{ marginBottom: 16 }}>{a.title || rec.note || "Untitled page"}</h1>
            <p className="serif-lead" style={{ marginBottom: 20, color: "var(--ink-soft)" }}>{a.summary}</p>

            {a.claim && (
              <div style={{ border: "1px solid var(--ink)", padding: 16, marginBottom: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Claim checked</div>
                <p className="serif-body" style={{ marginBottom: 8 }}>{a.claim.question}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`tag ${a.claim.verdict === "yes" ? "tag-live" : a.claim.verdict === "no" ? "tag-gone" : "tag-blocked"}`}>{a.claim.verdict}</span>
                  {a.claim.quote && <span className="serif-body caption" style={{ fontStyle: "italic" }}>&ldquo;{a.claim.quote}&rdquo;</span>}
                </div>
              </div>
            )}

            {a.key_claims.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Key claims on the page</div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {a.key_claims.map((c, i) => (
                    <li key={i} className="serif-body" style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--stamp)" }}>—</span> {c}</li>
                  ))}
                </ul>
              </div>
            )}

            {a.quotes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Verbatim quotes</div>
                {a.quotes.map((q, i) => (
                  <blockquote key={i} className="serif-lead" style={{ borderLeft: "3px solid var(--stamp)", paddingLeft: 16, marginBottom: 10, fontStyle: "italic" }}>&ldquo;{q}&rdquo;</blockquote>
                ))}
              </div>
            )}

            <div className="hairline" style={{ margin: "20px 0" }} />
            <div className="byline" style={{ lineHeight: 1.8 }}>
              <div>Witnessed by <Link href={`/reporter/${rec.witness}`} style={{ color: "var(--link)" }}>{shortAddr(rec.witness)}</Link></div>
              {a.author && <div>Bylined on page: {a.author}</div>}
              {a.as_of && <div>Page dated: {a.as_of}</div>}
              <div style={{ wordBreak: "break-all" }}>Source: <a href={rec.url} target="_blank" rel="noreferrer" style={{ color: "var(--link)" }}>{rec.url}</a></div>
              {rec.note && <div>Filing note: {rec.note}</div>}
            </div>
          </div>

          {/* ── Revision history ── */}
          <div style={{ marginTop: 32 }}>
            <div className="rule-heavy" style={{ marginBottom: 8 }} />
            <div className="eyebrow" style={{ marginBottom: 16 }}>Revision history — {rec.revisions.length} re-witnessing{rec.revisions.length === 1 ? "" : "s"}</div>
            {rec.revisions.length === 0 && (
              <p className="serif-body" style={{ color: "var(--ink-soft)" }}>Not yet re-witnessed. Re-witness to check whether the source has changed since.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {rec.revisions.map((r) => (
                <div key={r.n} style={{ borderLeft: "3px solid var(--hairline)", paddingLeft: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <StateTag state={r.verdict} />
                    <span className="byline">Re-witnessed by {shortAddr(r.by)}</span>
                  </div>
                  {r.changes && <p className="serif-body" style={{ marginBottom: 4 }}><strong>What changed:</strong> {r.changes}</p>}
                  {r.current_summary && <p className="serif-body caption">Now: {r.current_summary}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Rail ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {a.page_state === "LIVE" && (
            <div style={{ border: "1px solid var(--ink)", padding: 20 }}>
              <div className="sans-strong" style={{ marginBottom: 6 }}>Check it again</div>
              <p className="serif-body caption" style={{ marginBottom: 12 }}>Re-witness now to see whether the source has been edited or removed since this record.</p>
              {address ? (
                <button className="btn-stamp" style={{ width: "100%" }} disabled={rewitnessing} onClick={handleRewitness}>
                  {rewitnessing ? "Validators are re-witnessing…" : "Re-witness this page"}
                </button>
              ) : (
                <Link href="/account" className="btn-outline" style={{ width: "100%" }}>Sign in to re-witness</Link>
              )}
              {isMine && <p className="caption" style={{ marginTop: 8 }}>You filed this record.</p>}
              {error && <p className="caption" style={{ color: "var(--gone)", marginTop: 8 }}>{error}</p>}
              {rewitnessing && <p className="caption" style={{ marginTop: 8 }}>Takes one to three minutes — keep this open.</p>}
            </div>
          )}

          {siblings > 1 && (
            <div style={{ border: "1px solid var(--hairline)", padding: 20 }}>
              <div className="sans-strong" style={{ marginBottom: 6 }}>Page timeline</div>
              <p className="serif-body caption" style={{ marginBottom: 12 }}>This URL has been witnessed {siblings} times. See how it changed over the record.</p>
              <Link href={`/timeline?url=${encodeURIComponent(rec.url)}`} className="btn-quiet" style={{ fontSize: 13, padding: 0 }}>Open the timeline →</Link>
            </div>
          )}

          {/* Cite */}
          <div style={{ border: "1px solid var(--hairline)", padding: 20 }}>
            <div className="sans-strong" style={{ marginBottom: 10 }}>Cite this record</div>
            <p className="serif-body caption" style={{ marginBottom: 8, fontStyle: "italic" }}>{citation}</p>
            <button className="btn-quiet" style={{ fontSize: 13, padding: 0 }} onClick={() => copy(citation, "citation")}>{copied === "citation" ? "Copied ✓" : "Copy citation"}</button>
          </div>

          {/* Badge */}
          <div style={{ border: "1px solid var(--hairline)", padding: 20 }}>
            <div className="sans-strong" style={{ marginBottom: 10 }}>Embed the badge</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/badge/${rec.record_id}`} alt="Gazette badge" style={{ marginBottom: 10, maxWidth: "100%" }} />
            <button className="btn-quiet" style={{ fontSize: 13, padding: 0, display: "block" }} onClick={() => copy(badgeCode, "badge")}>{copied === "badge" ? "Copied ✓" : "Copy embed code"}</button>
          </div>

          {/* API */}
          <div style={{ border: "1px solid var(--hairline)", padding: 20 }}>
            <div className="sans-strong" style={{ marginBottom: 10 }}>Machine-readable</div>
            <p className="serif-body caption" style={{ marginBottom: 8 }}>The attestation as JSON, for newsroom tooling.</p>
            <button className="btn-quiet mono" style={{ fontSize: 12, padding: 0, wordBreak: "break-all", textAlign: "left" }} onClick={() => copy(apiUrl, "api")}>{copied === "api" ? "Copied ✓" : `GET ${apiUrl}`}</button>
          </div>

          <div style={{ border: "1px solid var(--hairline)", padding: 20 }}>
            <div className="sans-strong" style={{ marginBottom: 6 }}>On-chain</div>
            <p className="serif-body caption" style={{ marginBottom: 8 }}>Read the contract state yourself.</p>
            <a href={`https://studio.genlayer.com/?import-contract=${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="btn-quiet mono" style={{ fontSize: 12, padding: 0 }}>{shortAddr(CONTRACT_ADDRESS)} →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
