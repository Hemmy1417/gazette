import { NextRequest, NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { adminDb, requireUser } from "@/lib/server/firebaseAdmin";
import { decryptKey } from "@/lib/server/walletCrypto";

export const runtime = "nodejs";
export const maxDuration = 30;

const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "") as `0x${string}`;

// Contract writes an email-account user may perform through their managed
// wallet. The server signs and SUBMITS only — consensus takes minutes, far
// beyond a serverless window, so the client polls the chain for the receipt.
const ALLOWED: Record<string, number> = {
  witness: 3,
  rewitness: 1,
  create_dossier: 2,
  add_to_dossier: 2,
  remove_from_dossier: 2,
};

export async function POST(req: NextRequest) {
  try {
    const { idToken, method, args } = await req.json();
    const uid = await requireUser(String(idToken ?? ""));

    const m = String(method ?? "");
    if (!(m in ALLOWED)) {
      return NextResponse.json({ error: "method not allowed" }, { status: 400 });
    }
    const a = Array.isArray(args) ? args.map(String) : [];
    if (a.length !== ALLOWED[m]) {
      return NextResponse.json({ error: `expected ${ALLOWED[m]} args` }, { status: 400 });
    }

    const snap = await adminDb().collection("wallets").doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "no wallet for this account" }, { status: 404 });
    }

    const account = createAccount(decryptKey(snap.data()!.encryptedKey) as `0x${string}`);
    const client = createClient({ chain: studionet, account });
    const txHash = await client.writeContract({
      address: CONTRACT,
      functionName: m,
      args: a,
      value: 0n,
    });
    return NextResponse.json({ txHash, from: account.address });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "transaction failed";
    return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
  }
}
