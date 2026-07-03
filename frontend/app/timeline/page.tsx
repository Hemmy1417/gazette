"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUrlHistory } from "@/lib/contracts/gazette";
import { StateTag } from "@/components/RecordCard";
import { shortAddr } from "@/lib/genlayer/wallet";
import type { GazetteRecord } from "@/lib/contracts/types";

function Timeline() {
  const params = useSearchParams();
  const url = params.get("url") || "";
  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!url) { setLoaded(true); return; }
    getUrlHistory(url).then((r) => setRecords(r.sort((a, b) => a.seq - b.seq))).catch(() => {}).finally(() => setLoaded(true));
  }, [url]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>Page timeline</div>
      <h1 className="display-md" style={{ marginBottom: 12, wordBreak: "break-all" }}>{url}</h1>
      <p className="serif-body" style={{ marginBottom: 32, color: "var(--ink-soft)" }}>
        Every witnessing of this URL, in order. Read down the column to watch the page change over time.
      </p>

      {!loaded && <p className="serif-body">Reading the record…</p>}
      {loaded && records.length === 0 && <p className="serif-body">No witnessings of this URL yet.</p>}

      <div style={{ borderLeft: "3px double var(--ink)", paddingLeft: 24 }}>
        {records.map((r, i) => {
          const events = [
            { label: "Witnessed", state: r.attestation.page_state, by: r.witness, text: r.attestation.summary, title: r.attestation.title },
            ...r.revisions.map((rev) => ({ label: "Re-witnessed", state: rev.verdict, by: rev.by, text: rev.changes || rev.current_summary, title: "" })),
          ];
          return (
            <div key={r.record_id} style={{ marginBottom: 32, position: "relative" }}>
              <span style={{ position: "absolute", left: -30, top: 4, width: 12, height: 12, background: "var(--stamp)", border: "2px solid var(--canvas)" }} />
              <div className="byline" style={{ marginBottom: 4 }}>Filing {i + 1} · <Link href={`/record/${r.record_id}`} style={{ color: "var(--link)" }}>{r.record_id}</Link></div>
              {events.map((e, j) => (
                <div key={j} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="sans-sm-strong">{e.label}</span>
                    <StateTag state={e.state} />
                    <span className="byline">{shortAddr(e.by)}</span>
                  </div>
                  {e.title && <div className="display-xs" style={{ marginBottom: 2 }}>{e.title}</div>}
                  {e.text && <p className="serif-body caption">{e.text}</p>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return <Suspense><Timeline /></Suspense>;
}
