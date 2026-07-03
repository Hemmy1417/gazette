// GenLayer plumbing: public reads, injected-wallet writes, and receipt polling
// shared by both auth modes (email users' transactions are submitted by the
// server, but the RECEIPT is always polled from the browser — consensus takes
// minutes, longer than any serverless window).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

import { createClient } from "genlayer-js";
import { CHAIN, CONTRACT_ADDRESS } from "../config";

export function isTransient(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("failed to fetch") || lower.includes("rate")
    || lower.includes("network") || lower.includes("timeout")
    || lower.includes("503") || lower.includes("502")
    || lower.includes("unknown rpc");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function read(method: string, args: string[] = []): Promise<string> {
  const client = createClient({ chain: CHAIN });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return (await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
      })) as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isTransient(msg) && attempt < 4) { await sleep(1000 * attempt); continue; }
      throw e;
    }
  }
  return "";
}

// Wait for a submitted transaction to reach ACCEPTED and return the call's
// JSON result (or null — callers re-read state).
export async function pollReceipt<T>(txHash: string): Promise<T | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = createClient({ chain: CHAIN });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash, status: "ACCEPTED", interval: 5000, retries: 180,
  });
  const status = String(receipt?.status ?? "").toUpperCase();
  if (status.includes("UNDETERMINED") || status.includes("CANCELED")) {
    throw new Error("Validators could not reach consensus — try again");
  }
  const lr = receipt?.consensus_data?.leader_receipt;
  const r = Array.isArray(lr) ? lr[0] : lr;
  if (r?.execution_result === "ERROR") {
    const stderr: string = r?.genvm_result?.stderr ?? "";
    const userErr = stderr.match(/UserError: (.+)/)?.[1];
    throw new Error(userErr ?? "The transaction was rejected by the contract");
  }
  const payload = r?.result?.payload?.readable ?? null;
  if (typeof payload === "string") {
    try { return JSON.parse(JSON.parse(payload)) as T; } catch { /* caller re-reads */ }
  }
  return null;
}

// Injected-wallet write: submit through the user's own wallet, then poll.
export async function writeAndWait<T>(
  client: Client,
  method: string,
  args: string[],
): Promise<T | null> {
  let hash: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      hash = await client.writeContract({
        address: CONTRACT_ADDRESS, functionName: method, args, value: 0n,
      });
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isTransient(msg) && attempt < 3) { await sleep(2000 * attempt); continue; }
      throw e;
    }
  }
  if (!hash) throw new Error("Could not submit the transaction");
  return pollReceipt<T>(hash);
}
