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
      <p className="serif-lead" style={{ marginBottom: 32, color: "var(--ink-soft)" }}>
        The Gazette&apos;s whole point is edit detection — but that only shines when
        the source actually changes. Below is a page we can edit on request, so you
        can watch a record land in the Memory Hole in real time.
      </p>

      <div style={{ border: "1px solid var(--ink)", padding: 20, marginBottom: 32 }}>
        <div className="sans-sm-strong" style={{ textTransform: "uppercase", letterSpacing: "1px", color: "var(--stamp)", marginBottom: 8 }}>The demo page</div>
        <div className="serif-body mono" style={{ wordBreak: "break-all", marginBottom: 12 }}>{demoUrl || "…"}</div>
        {origin && <a href={demoUrl} target="_blank" rel="noreferrer" className="btn-quiet" style={{ fontSize: 13, padding: 0 }}>Open the page in a new tab →</a>}
      </div>

      <div className="rule-heavy" style={{ marginBottom: 16 }} />
      <div className="eyebrow" style={{ marginBottom: 16 }}>The three-minute walkthrough</div>

      <ol style={{ display: "flex", flexDirection: "column", gap: 20, paddingLeft: 24 }}>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>Witness the page as it stands</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            Go to <Link href="/witness" style={{ color: "var(--link)" }}>the witness desk</Link>, paste the URL above,
            and press <em>Witness this page</em>. In 1–3 minutes you&apos;ll get a permanent certificate — headline,
            summary, key claims, verbatim quotes. Note the record id (like <code>r_2</code>).
          </p>
        </li>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>Ask for a substantive edit</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            Message us to rewrite the page — change the headline, swap a claim, remove a quote.
            The URL stays the same; the words change. This takes about 30 seconds on our end.
          </p>
        </li>
        <li>
          <div className="sans-strong" style={{ marginBottom: 4 }}>Re-witness the record</div>
          <p className="serif-body" style={{ color: "var(--ink-soft)" }}>
            Open your certificate at <code className="mono">/record/[your record id]</code> and press
            <em> Re-witness this page</em>. Validators fetch it again, compare it to the original attestation,
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
        <div className="sans-strong" style={{ marginBottom: 8 }}>Prefer a page you control?</div>
        <p className="serif-body" style={{ color: "var(--ink-soft)", marginBottom: 12 }}>
          You can run the same demo against any page you can edit — a public GitHub Gist works well.
          Create a gist, use the <strong>Raw</strong> URL, witness it, edit the gist, re-witness. Same result.
        </p>
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/witness" className="btn-stamp">Start at the desk</Link>
        <Link href="/memory-hole" className="btn-outline">See the Memory Hole</Link>
      </div>
    </div>
  );
}
