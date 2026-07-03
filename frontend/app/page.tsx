"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecords, getMemoryHole, getStats } from "@/lib/contracts/gazette";
import { CONTRACT_CONFIGURED } from "@/lib/config";
import { RecordRow } from "@/components/RecordCard";
import { Reveal, CountUp } from "@/components/Motion";
import { HowTo } from "@/components/HowTo";
import type { GazetteRecord, Stats } from "@/lib/contracts/types";

const TICKER = [
  "The chain sees what the page said — even after the page changes it.",
  "Validators fetch independently. No single source of trust.",
  "A screenshot proves nothing. A witnessed record proves everything.",
  "When a source vanishes, the record remains.",
];

export default function FrontPage() {
  const [records, setRecords] = useState<GazetteRecord[]>([]);
  const [hole, setHole] = useState<GazetteRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!CONTRACT_CONFIGURED) { setLoaded(true); return; }
    Promise.allSettled([getRecords(12), getMemoryHole(4), getStats()]).then(([r, h, s]) => {
      if (r.status === "fulfilled") setRecords(r.value);
      if (h.status === "fulfilled") setHole(h.value);
      if (s.status === "fulfilled" && s.value) setStats(s.value);
      setLoaded(true);
    });
  }, []);

  const lead = records[0];
  const secondary = records.slice(1, 3);
  const rest = records.slice(3);

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 32px" }}>
        <div className="hero-stagger" style={{ maxWidth: 820 }}>
          <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 16 }}>Journalism&apos;s permanent record</div>
          <h1 className="display-hero" style={{ marginBottom: 20 }}>
            The web forgets.<br />The Gazette doesn&apos;t.
          </h1>
          <p className="serif-lead" style={{ maxWidth: 620, marginBottom: 28, color: "var(--ink-soft)" }}>
            Witness any web page and GenLayer&apos;s validators fetch it independently, agree on
            what it said, and write it to the chain forever. Come back later to catch a
            stealth edit — or to prove what a since-deleted source really claimed.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/witness" className="btn-stamp">Witness a page</Link>
            <Link href="/memory-hole" className="btn-outline">The Memory Hole</Link>
          </div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="ticker" style={{ marginBottom: 8 }} aria-hidden>
        <div className="ticker-inner sans-sm-strong" style={{ textTransform: "uppercase", letterSpacing: "1px" }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 40 }}>
              {t}<span style={{ color: "var(--stamp)" }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats strip ── */}
      {stats && (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 24, borderBottom: "1px solid var(--hairline)" }}>
          {[
            { label: "Pages witnessed", value: stats.total_records },
            { label: "Edits caught", value: stats.total_edits },
            { label: "Sources vanished", value: stats.total_gone },
            { label: "Dossiers filed", value: stats.total_dossiers },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="display-md"><CountUp value={value} /></div>
              <div className="sans-sm">{label}</div>
            </div>
          ))}
        </section>
      )}

      {/* ── The front page ── */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
        <HowTo
          id="landing"
          title="Getting around"
          steps={[
            <><Link href="/witness" style={{ color: "var(--link)" }}>Witness</Link> — the desk where you record a page. Any public URL, one click, permanent record in a couple of minutes.</>,
            <><Link href="/records" style={{ color: "var(--link)" }}>The Record</Link> — everything the Gazette has ever witnessed, searchable.</>,
            <><Link href="/memory-hole" style={{ color: "var(--link)" }}>Memory Hole</Link> — records whose sources were edited or vanished. The flagship story.</>,
            <><Link href="/dossiers" style={{ color: "var(--link)" }}>Dossiers</Link> — folders of related records. Your beat, your investigation, your citations.</>,
            <>New here? <Link href="/try-it" style={{ color: "var(--link)" }}>The three-minute demo</Link> walks you through witnessing → editing → catching the edit.</>,
          ]}
        />
        <div className="rule-heavy" style={{ marginBottom: 8 }} />
        <div className="eyebrow" style={{ marginBottom: 24 }}>Latest witnessings</div>

        {!loaded && <p className="serif-body">Reading the record…</p>}
        {loaded && records.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="display-sm" style={{ marginBottom: 16 }}>The record opens with your first witnessing.</p>
            <Link href="/witness" className="btn-stamp">Witness a page</Link>
          </div>
        )}

        {lead && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }} className="lg:grid-cols-[2fr_1fr]">
            <div>
              <RecordRow rec={lead} large />
            </div>
            {secondary.length > 0 && (
              <div className="column-rule">
                {secondary.map((r) => <RecordRow key={r.record_id} rec={r} />)}
              </div>
            )}
          </div>
        )}

        {rest.length > 0 && (
          <Reveal>
            <div style={{ marginTop: 24 }}>
              {rest.map((r) => <RecordRow key={r.record_id} rec={r} />)}
            </div>
          </Reveal>
        )}

        {records.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Link href="/records" className="btn-quiet">Read the full record →</Link>
          </div>
        )}
      </section>

      {/* ── Memory Hole teaser ── */}
      {hole.length > 0 && (
        <section style={{ background: "var(--canvas-soft)", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px" }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                <h2 className="display-md" style={{ color: "var(--stamp)" }}>The Memory Hole</h2>
                <span className="sans-sm">Sources that were edited or quietly disappeared</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginTop: 16 }}>
                {hole.map((r) => (
                  <Link key={r.record_id} href={`/record/${r.record_id}`} className="story-row" style={{ borderBottom: "none" }}>
                    <div style={{ marginBottom: 8 }}>
                      <span className={`tag ${r.latest === "GONE" ? "tag-gone" : "tag-edited"}`}>{r.latest.toLowerCase()}</span>
                    </div>
                    <div className="display-xs" style={{ marginBottom: 6 }}>{r.attestation.title || r.url}</div>
                    <p className="serif-body caption" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.revisions[r.revisions.length - 1]?.changes || r.attestation.summary}
                    </p>
                  </Link>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <Link href="/memory-hole" className="btn-quiet">See everything the web tried to forget →</Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </div>
  );
}
