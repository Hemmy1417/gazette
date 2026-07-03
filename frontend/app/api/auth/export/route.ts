import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireUser } from "@/lib/server/firebaseAdmin";
import { decryptKey } from "@/lib/server/walletCrypto";

export const runtime = "nodejs";

// Export the managed wallet's private key to its owner. Authenticated by a
// fresh Firebase ID token; the key travels once, over TLS, to the user only.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    const uid = await requireUser(String(idToken ?? ""));

    const snap = await adminDb().collection("wallets").doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "no wallet for this account" }, { status: 404 });
    }
    return NextResponse.json({
      address: snap.data()!.address,
      privateKey: decryptKey(snap.data()!.encryptedKey),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
