"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet, shortAddr } from "@/lib/genlayer/wallet";
import { getRecentDossiers, getDossiersFor } from "@/lib/contracts/gazette";
import { CONTRACT_CONFIGURED } from "@/lib/config";
import { HowTo } from "@/components/HowTo";
import type { Dossier } from "@/lib/contracts/types";

function DossierRow({ d }: { d: Dossier }) {
  return (
    <Link href={`/dossier/${d.dossier_id}`} className="story-row">
      <div className="display-sm" style={{ marginBottom: 6 }}>{d.title}</div>
      {d.description && <p className="serif-body" style={{ marginBottom: 8, color: "var(--ink-soft)" }}>{d.description}</p>}
      <div className="byline">{d.record_ids.length} record{d.record_ids.length === 1 ? "" : "s"} · kept by {shortAddr(d.owner)}</div>
    </Link>
  );
}

export default function DossiersPage() {
  const { address, performWrite } = useWallet();
  const [recent, setRecent] = useState<Dossier[]>([]);
  const [mine, setMine] = useState<Dossier[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!CONTRACT_CONFIGURED) { setLoaded(true); return; }
    const [r, m] = await Promise.all([
      getRecentDossiers(30).catch(() => []),
      address ? getDossiersFor(address).catch(() => []) : Promise.resolve([]),
    ]);
    setRecent(r); setMine(m); setLoaded(true);
  }, [address]);

  useEffect(() => { reload(); }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setError("");
    try {
      await performWrite("create_dossier", [title.trim(), desc.trim()]);
      setTitle(""); setDesc(""); setCreating(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the dossier");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>Standing investigations</div>
          <h1 className="display-lg">Dossiers</h1>
        </div>
        {address && <button className="btn-stamp" style={{ fontSize: 14, padding: "10px 18px" }} onClick={() => setCreating((c) => !c)}>{creating ? "Cancel" : "Open a dossier"}</button>}
      </div>
      <p className="serif-lead" style={{ maxWidth: 620, marginBottom: 32, color: "var(--ink-soft)" }}>
        A dossier is a folder of witnessed records — a beat you&apos;re watching, a story you&apos;re building. Group the receipts.
      </p>

      <HowTo
        id="dossiers"
        title="Building a dossier"
        steps={[
          <><strong>Open a dossier</strong> — give it a title (public) and an optional description of what it tracks.</>,
          <>Witness pages the usual way, then <strong>add each record id</strong> (like <code>r_3</code>) from the dossier&apos;s own page.</>,
          <>Anyone can read your dossier — it&apos;s public evidence. Only you can add or remove records from it.</>,
          <>Great for: a running investigation, a beat you monitor, a story&apos;s cited sources.</>,
        ]}
      />

      {creating && (
        <form onSubmit={handleCreate} style={{ border: "1px solid var(--ink)", padding: 20, marginBottom: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="field" placeholder="Dossier title — e.g. 'Election-night corrections'" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} required />
          <input className="field" placeholder="What this dossier tracks (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} />
          {error && <span className="sans-sm" style={{ color: "var(--gone)" }}>{error}</span>}
          <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start" }} disabled={busy}>{busy ? "Filing…" : "Create dossier"}</button>
        </form>
      )}

      {mine.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Yours</div>
          {mine.map((d) => <DossierRow key={d.dossier_id} d={d} />)}
        </div>
      )}

      <div className="rule-heavy" style={{ marginBottom: 8 }} />
      <div className="eyebrow" style={{ marginBottom: 12 }}>Recently opened</div>
      {!loaded && <p className="serif-body">Reading the record…</p>}
      {loaded && recent.length === 0 && <p className="serif-body">No dossiers yet.{address ? " Open the first." : " Sign in to open one."}</p>}
      {recent.map((d) => <DossierRow key={d.dossier_id} d={d} />)}
    </div>
  );
}
