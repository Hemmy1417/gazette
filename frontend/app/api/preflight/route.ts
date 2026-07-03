import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

// A free, best-effort fetch of the target BEFORE a witnessing is submitted.
// Validators burn multiple LLM inferences per consensus round (GenLayer's own
// guidance) — warning the user about a bot-wall first avoids wasting one.
// This is advisory only: the server's fetch is not the validators' fetch.
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const u = String(url ?? "").trim();
    if (!/^https?:\/\//i.test(u)) {
      return NextResponse.json({ verdict: "invalid", note: "URL must start with http(s)://" });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(u, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; GazetteBot/1.0; +https://gazette-alpha.vercel.app)",
          "accept": "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 404 || res.status === 410) {
      return NextResponse.json({ verdict: "gone", note: "The page returns a not-found status. Witnessing will likely record it as GONE." });
    }
    if (res.status === 401 || res.status === 402 || res.status === 403 || res.status === 451) {
      return NextResponse.json({ verdict: "blocked", note: "The page returned an access-denied status. Validators may see a wall — you can still witness it as evidence." });
    }
    if (!res.ok) {
      return NextResponse.json({ verdict: "blocked", note: `The page returned HTTP ${res.status}. Witness anyway to record the state.` });
    }

    const text = (await res.text()).toLowerCase();

    // Specific, high-confidence wall/bot-check phrases. Single-word matches
    // (like "captcha") false-positive on any page that references CAPTCHAs,
    // so require multi-word phrases that only appear on actual walls.
    const wallSignals = [
      "cf-browser-verification",
      "checking your browser before",
      "please enable cookies to continue",
      "please verify you are human",
      "please complete the security check",
      "just a moment...",
      "attention required | cloudflare",
      "please turn javascript on and reload",
      "subscribe to continue reading",
      "already a subscriber?",
      "you have reached your limit of free articles",
    ];
    const hits = wallSignals.filter((s) => text.includes(s));

    // A wall page is also usually short. A real article is thousands of bytes;
    // walls sit at a few hundred to a couple thousand.
    const shortAndAWall = hits.length > 0 && text.length < 4000;

    if (hits.length >= 2 || shortAndAWall) {
      return NextResponse.json({ verdict: "blocked", note: "This page looks like it shows a bot/cookie/paywall to automated fetchers. Validators may see the same — a BLOCKED record is still evidence." });
    }
    return NextResponse.json({ verdict: "ready", note: "The page is reachable. Validators should see its content." });
  } catch {
    return NextResponse.json({ verdict: "blocked", note: "The page could not be reached from our servers. It may be down, geo-blocked, or slow. You can still witness it." });
  }
}
