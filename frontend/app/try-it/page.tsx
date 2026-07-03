"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TryItPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const demoUrl = `${origin}/demo/breaking-news.txt`;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <div className="eyebrow" style={{ color: "var(--stamp)", marginBottom: 12 }}>Live demo</div>
      <h1 className="display-lg" style={{ marginBottom: 16 }}>Watch the Gazette catch an edit</h1>
      <p className="serif-lead" style={{ marginBottom: 24, color: "var(--ink-soft)" }}>
        In real use, journalists witness pages <em>other people</em> control — a news
        outlet, a government agency, a politician&apos;s blog. Later, when those pages get
        stealth-edited or deleted, the Gazette catches it.
      </p>
      <p className="serif-lead" style={{ marginBottom: 32, color: "var(--ink-soft)" }}>
        For this demo, <strong>we&apos;re playing the role of the newsroom for you</strong>.
        The URL below is a fake breaking-news page we control — so you can watch
        edit detection work end-to-end without waiting for the BBC to update a
        headline.
      </p>

      <div style={{ border: "1px solid var(--ink)", padding: 20, marginBottom: 32 }}>
        <div className="sans-sm-strong" style={{ textTransform: "uppercase", letterSpacing: "1px", color: "var(--stamp)", marginBottom: 8 }}>The rehearsal newsroom</div>
        <div className="serif-body mono" style={{ wordBreak: "break-all", marginBottom: 12 }}>{demoUrl || "…"}</div>
        {origin && <a href={demoUrl} target="_blank" rel="noreferrer" className="btn-quiet" style={{ fontSize: 13, padding: 0 }}>Open the page in a new tab →</a>}
        <p className="serif-body caption" style={{ marginTop: 12 }}>
          Think of this as a newsroom&apos;s story we can rewrite on demand.
          In real use, you&apos;d witness a page you don&apos;t control — and
          the &ldquo;edit&rdquo; happens when the site&apos;s owner changes it themselves.
        </p>
      </div>

      <div className="rule-heavy" style={{ marginBottom: 16 }} />
      <div className="eyebrow" style={{ marginBottom: 16 }}>The three-minute walkthrough</div>

      <ol style={{ display: "flex", flexDirection: "column", gap: 20, paddingLeft: 24 }}>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>Witness the page as it stands</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            Go to <Link href="/witness" style={{ color: "var(--link)" }}>the witness desk</Link>, paste the URL above,
            and press <em>Witness this page</em>. In 1&ndash;3 minutes you&apos;ll get a permanent certificate — headline,
            summary, key claims, verbatim quotes. Note the record id (like <code>r_2</code>).
          </p>
        </li>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>Ask us to rewrite the &ldquo;newsroom&rdquo; page</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            Message us what you&apos;d like changed &mdash; a new headline, a swapped claim, a
            removed quote. We&apos;ll push the edit in about thirty seconds. <strong>This step is
            standing in for what happens naturally when a real news outlet edits their own
            page.</strong>
          </p>
        </li>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>Re-witness the record</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            Open your certificate at <code className="mono">/record/[your record id]</code> and press
            <em> Re-witness this page</em>. Validators fetch the URL again, compare it to the original attestation,
            and rule <strong style={{ color: "var(--stamp)" }}>EDITED</strong> with a summary of exactly what changed.
          </p>
        </li>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>See it land in the Memory Hole</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            The <Link href="/memory-hole" style={{ color: "var(--link)" }}>Memory Hole</Link> lists every
            record whose source was edited or vanished. Your record is now there — permanently — with the
            original attestation preserved and the change described.
          </p>
        </li>
      </ol>

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: "3px double var(--ink)" }}>
        <div className="sans-strong" style={{ marginBottom: 8 }}>Want to watch a real edit happen?</div>
        <p className="serif-body" style={{ color: "var(--ink-soft)", marginBottom: 8 }}>
          Witness a fast-moving news site like <code className="mono">bbc.com/news</code> or a stock&apos;s
          Yahoo Finance page, wait a few hours, then re-witness. Real headlines update on their own
          all day — the Gazette will catch every change, without you touching the source.
        </p>
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/witness" className="btn-stamp">Start at the desk</Link>
        <Link href="/memory-hole" className="btn-outline">See the Memory Hole</Link>
      </div>
    </div>
  );
}
