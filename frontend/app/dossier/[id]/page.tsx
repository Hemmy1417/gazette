"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet, shortAddr } from "@/lib/genlayer/wallet";
import { getDossier, getRecord } from "@/lib/contracts/gazette";
import { RecordRow } from "@/components/RecordCard";
import type { Dossier, GazetteRecord } from "@/lib/contracts/types";

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { address, performWrite } = useWallet();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!id) return;
    const d = await getDossier(id).catch(() => null);
    if (!d) { setNotFound(true); return; }
    setDossier(d);
    const recs = await Promise.all(d.record_ids.map((rid) => getRecord(rid).catch(() => null)));
    setRecords(recs.filter((r): r is GazetteRecord => !!r));
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!dossier || !adding.trim()) return;
    setBusy(true); setError("");
    try {
      await performWrite("add_to_dossier", [dossier.dossier_id, adding.trim()]);
      setAdding("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the record");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) return <div style={{ maxWidth: 600, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}><h1 className="display-md" style={{ marginBottom: 16 }}>No such dossier</h1><Link href="/dossiers" className="btn-outline">Back to dossiers</Link></div>;
  if (!dossier) return <div style={{ maxWidth: 600, margin: "0 auto", padding: "96px 24px", textAlign: "center" }} className="serif-body">Reading the record…</div>;

  const isOwner = address && address.toLowerCase() === dossier.owner.toLowerCase();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>Dossier · {dossier.dossier_id}</div>
      <h1 className="display-lg" style={{ marginBottom: 8 }}>{dossier.title}</h1>
      {dossier.description && <p className="serif-lead" style={{ marginBottom: 8, color: "var(--ink-soft)" }}>{dossier.description}</p>}
      <div className="byline" style={{ marginBottom: 32 }}>Kept by {shortAddr(dossier.owner)} · {records.length} record{records.length === 1 ? "" : "s"}</div>

      {isOwner && (
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          <input className="field mono" style={{ flex: 1, minWidth: 200 }} placeholder="Add a record id — e.g. r_3" value={adding} onChange={(e) => setAdding(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add record"}</button>
        </form>
      )}
      {error && <p className="sans-sm" style={{ color: "var(--gone)", marginBottom: 16 }}>{error}</p>}

      <div className="rule-heavy" style={{ marginBottom: 8 }} />
      {records.length === 0 && <p className="serif-body">No records in this dossier yet.</p>}
      {records.map((r) => <RecordRow key={r.record_id} rec={r} />)}
    </div>
  );
}
