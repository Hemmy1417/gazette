"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMemoryHole } from "@/lib/contracts/gazette";
import { CONTRACT_CONFIGURED } from "@/lib/config";
import { StateTag } from "@/components/RecordCard";
import { HowTo } from "@/components/HowTo";
import { shortAddr } from "@/lib/genlayer/wallet";
import type { GazetteRecord } from "@/lib/contracts/types";

export default function MemoryHolePage() {
  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!CONTRACT_CONFIGURED) { setLoaded(true); return; }
    getMemoryHole(100).then(setRecords).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>What the web tried to forget</div>
      <h1 className="display-hero" style={{ color: "var(--stamp)", marginBottom: 16 }}>The Memory Hole</h1>
      <p className="serif-lead" style={{ maxWidth: 620, marginBottom: 32, color: "var(--ink-soft)" }}>
        Every record here was witnessed once, then found changed or gone by the site&apos;s
        own owner. A headline quietly rewritten, a correction never disclosed, a page
        removed. The Gazette kept what the source did not.
      </p>

      <HowTo
        id="memory-hole"
        title="How records land here"
        steps={[
          <>Someone witnesses a public page. That creates a permanent record of what the site&apos;s owner said.</>,
          <>Later, anyone can <strong>re-witness</strong> the same record. Validators fetch the URL again and diff it against the original attestation.</>,
          <>If the site owner has changed the page in substance (verdict <strong>EDITED</strong>) or removed it (verdict <strong>GONE</strong>), the record lands here.</>,
          <>Open any entry to see the original attestation <em>and</em> what the source owner changed — side by side, forever.</>,
        ]}
      />

      <div className="rule-heavy" style={{ marginBottom: 8 }} />
      {!loaded && <p className="serif-body">Reading the record…</p>}
      {loaded && records.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <p className="display-sm" style={{ marginBottom: 8 }}>Nothing in the hole — yet.</p>
          <p className="serif-body caption" style={{ marginBottom: 16 }}>Re-witness a live record to catch the first edit.</p>
          <Link href="/records" className="btn-outline">Browse the record</Link>
        </div>
      )}

      <div>
        {records.map((r) => {
          const last = r.revisions[r.revisions.length - 1];
          return (
            <Link key={r.record_id} href={`/record/${r.record_id}`} className="story-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <StateTag state={r.latest} />
                <span className="eyebrow">{r.attestation.outlet || new URL(r.url).host.replace(/^www\./, "")}</span>
              </div>
              <div className="display-sm" style={{ marginBottom: 8, textDecoration: r.latest === "GONE" ? "line-through" : "none", textDecorationColor: "var(--stamp)" }}>
                {r.attestation.title || r.url}
              </div>
              {last?.changes && (
                <p className="serif-body" style={{ marginBottom: 8, color: "var(--ink-soft)" }}>
                  <strong style={{ color: "var(--stamp)" }}>What changed: </strong>{last.changes}
                </p>
              )}
              <div className="byline" style={{ lineHeight: 1.6 }}>Caught by {shortAddr(last?.by || r.witness)} · {r.record_id}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
