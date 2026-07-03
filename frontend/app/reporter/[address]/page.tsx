"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRecordsFor, getReputation } from "@/lib/contracts/gazette";
import { RecordRow } from "@/components/RecordCard";
import type { GazetteRecord, Reputation } from "@/lib/contracts/types";

export default function ReporterPage() {
  const { address } = useParams<{ address: string }>();
  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!address) return;
    Promise.allSettled([getRecordsFor(address), getReputation(address)]).then(([r, p]) => {
      if (r.status === "fulfilled") setRecords(r.value);
      if (p.status === "fulfilled" && p.value) setRep(p.value);
      setLoaded(true);
    });
  }, [address]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>Reporter</div>
      <h1 className="display-md mono" style={{ marginBottom: 24, wordBreak: "break-all" }}>{address}</h1>

      {rep && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 20, marginBottom: 32, borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", padding: "20px 0" }}>
          {[
            { label: "Pages witnessed", value: rep.witnessed },
            { label: "Re-witnessings", value: rep.rewitnessed },
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

      <div className="eyebrow" style={{ marginBottom: 16 }}>Filed by this reporter</div>
      {!loaded && <p className="serif-body">Reading the record…</p>}
      {loaded && records.length === 0 && <p className="serif-body">No witnessings on this wallet.</p>}
      {records.map((r) => <RecordRow key={r.record_id} rec={r} />)}
    </div>
  );
}
