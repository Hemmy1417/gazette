import { NextRequest, NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const runtime = "nodejs";

const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;

// Public, machine-readable attestation for newsroom tooling. No auth — the
// record is public on-chain; this route just makes it convenient JSON.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const client = createClient({ chain: studionet });
    const raw = (await client.readContract({
      address: CONTRACT, functionName: "get_record", args: [id],
    })) as string;
    if (!raw) return NextResponse.json({ error: "no such record" }, { status: 404 });

    const rec = JSON.parse(raw);
    const res = NextResponse.json({
      record_id: rec.record_id,
      url: rec.url,
      witnessed_by: rec.witness,
      state: rec.latest,
      attestation: rec.attestation,
      revisions: rec.revisions,
      contract: CONTRACT,
      network: "genlayer-studionet",
    });
    res.headers.set("access-control-allow-origin", "*");
    res.headers.set("cache-control", "public, max-age=30");
    return res;
  } catch {
    return NextResponse.json({ error: "could not read the record" }, { status: 502 });
  }
}
