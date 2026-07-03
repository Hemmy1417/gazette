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

    const text = (await res.text()).slice(0, 20000).toLowerCase();
    const wallSignals = ["captcha", "are you a robot", "enable javascript", "subscribe to continue", "cookies to continue", "cf-browser-verification"];
    const hit = wallSignals.find((s) => text.includes(s));
    if (hit) {
      return NextResponse.json({ verdict: "blocked", note: "This page looks like it shows a bot/cookie/paywall to automated fetchers. Validators may see the same — a BLOCKED record is still evidence." });
    }
    return NextResponse.json({ verdict: "ready", note: "The page is reachable. Validators should see its content." });
  } catch {
    return NextResponse.json({ verdict: "blocked", note: "The page could not be reached from our servers. It may be down, geo-blocked, or slow. You can still witness it." });
  }
}
