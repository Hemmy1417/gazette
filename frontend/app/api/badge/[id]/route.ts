import { NextRequest, NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const runtime = "nodejs";

const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;

const COLOR: Record<string, string> = {
  LIVE: "#0a7d40", BLOCKED: "#9a6a00", GONE: "#c8102e",
  EDITED: "#b34700", UNCHANGED: "#0a7d40",
};

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

// An embeddable SVG badge a publisher can drop onto a page to link to its
// witnessed record — the visible "GAZETTED" proof mark.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let state = "GONE";
  try {
    const client = createClient({ chain: studionet });
    const raw = (await client.readContract({
      address: CONTRACT, functionName: "get_record", args: [id],
    })) as string;
    if (raw) state = JSON.parse(raw).latest || "LIVE";
  } catch { /* fall through with GONE */ }

  const color = COLOR[state] ?? "#000000";
  const label = escapeXml(`${id.toUpperCase()} · ${state}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="184" height="28" role="img" aria-label="Gazetted ${label}">
  <rect width="184" height="28" fill="#ffffff" stroke="#000000"/>
  <rect x="0" y="0" width="8" height="28" fill="${color}"/>
  <text x="18" y="12" font-family="Georgia, serif" font-size="11" font-weight="700" letter-spacing="1.5" fill="#c8102e">GAZETTED</text>
  <text x="18" y="23" font-family="Arial, sans-serif" font-size="9" fill="#1a1a1a">${label}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
    },
  });
}
