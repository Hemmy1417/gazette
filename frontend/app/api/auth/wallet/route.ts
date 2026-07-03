import { NextRequest, NextResponse } from "next/server";
import { Wallet } from "ethers";
import { adminDb, requireUser } from "@/lib/server/firebaseAdmin";
import { encryptKey } from "@/lib/server/walletCrypto";

export const runtime = "nodejs";

// Get-or-create the managed wallet for an email account. The address is
// permanent for the account — same wallet on any device, forever.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    const uid = await requireUser(String(idToken ?? ""));

    const ref = adminDb().collection("wallets").doc(uid);
    const snap = await ref.get();
    if (snap.exists) {
      return NextResponse.json({ address: snap.data()!.address });
    }

    const wallet = Wallet.createRandom();
    await ref.set({
      address: wallet.address,
      encryptedKey: encryptKey(wallet.privateKey),
      createdAt: Date.now(),
    });
    return NextResponse.json({ address: wallet.address });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
