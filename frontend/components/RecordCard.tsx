import Link from "next/link";
import { shortAddr } from "@/lib/genlayer/wallet";
import type { GazetteRecord } from "@/lib/contracts/types";

const STATE_TAG: Record<string, string> = {
  LIVE: "tag-live", BLOCKED: "tag-blocked", GONE: "tag-gone",
  EDITED: "tag-edited", UNCHANGED: "tag-unchanged",
};

export function StateTag({ state }: { state: string }) {
  return <span className={`tag ${STATE_TAG[state] ?? ""}`}>{state.toLowerCase()}</span>;
}

function hostOf(url: string) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

// A record as a bylined story row — the paper's default unit.
export function RecordRow({ rec, large = false }: { rec: GazetteRecord; large?: boolean }) {
  const a = rec.attestation;
  const edited = rec.revisions.some((r) => r.verdict === "EDITED" || r.verdict === "GONE");
  return (
    <Link href={`/record/${rec.record_id}`} className="story-row">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span className="eyebrow" style={{ color: "var(--stamp)" }}>{a.outlet || hostOf(rec.url)}</span>
        <StateTag state={rec.latest} />
        {edited && rec.latest !== "EDITED" && <span className="tag tag-edited">edit caught</span>}
      </div>
      <div className={large ? "display-md" : "display-sm"} style={{ marginBottom: 8 }}>
        {a.title || rec.note || "Untitled page"}
      </div>
      <p className="serif-body" style={{ color: "var(--ink-soft)", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {a.summary}
      </p>
      <div className="byline" style={{ display: "flex", gap: 12, flexWrap: "wrap", lineHeight: 1.6 }}>
        <span>Witnessed by {shortAddr(rec.witness)}</span>
        {a.as_of && <span>· Page dated {a.as_of}</span>}
        <span>· {rec.record_id}</span>
      </div>
    </Link>
  );
}
