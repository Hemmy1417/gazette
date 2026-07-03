"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getRecords } from "@/lib/contracts/gazette";
import { CONTRACT_CONFIGURED } from "@/lib/config";
import { RecordRow } from "@/components/RecordCard";
import type { GazetteRecord } from "@/lib/contracts/types";

const FILTERS = ["ALL", "LIVE", "EDITED", "GONE", "BLOCKED"] as const;

export default function RecordsPage() {
  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [shown, setShown] = useState(15);

  useEffect(() => {
    if (!CONTRACT_CONFIGURED) { setLoaded(true); return; }
    getRecords(200).then(setRecords).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (filter !== "ALL" && r.latest !== filter) return false;
      if (!q) return true;
      const a = r.attestation;
      return [a.title, a.summary, a.outlet, r.url, r.note, ...a.key_claims].join(" ").toLowerCase().includes(q);
    });
  }, [records, query, filter]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>The public record</div>
      <h1 className="display-lg" style={{ marginBottom: 20 }}>Everything the Gazette has witnessed</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <input className="field" style={{ flex: 1, minWidth: 240 }} placeholder="Search headlines, claims, outlets, URLs…"
          value={query} onChange={(e) => { setQuery(e.target.value); setShown(15); }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => { setFilter(f); setShown(15); }}
            className={filter === f ? "btn-primary" : "btn-outline"}
            style={{ fontSize: 12, padding: "6px 12px" }}>
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="rule-heavy" style={{ marginBottom: 8 }} />
      {!loaded && <p className="serif-body">Reading the record…</p>}
      {loaded && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <p className="display-sm" style={{ marginBottom: 16 }}>{records.length === 0 ? "The record is empty." : "Nothing matches."}</p>
          {records.length === 0 && <Link href="/witness" className="btn-stamp">Witness the first page</Link>}
        </div>
      )}

      <div>
        {filtered.slice(0, shown).map((r) => <RecordRow key={r.record_id} rec={r} />)}
      </div>
      {filtered.length > shown && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="btn-outline" onClick={() => setShown((s) => s + 15)}>
            Load more ({filtered.length - shown} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
