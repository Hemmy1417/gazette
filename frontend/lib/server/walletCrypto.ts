// Server-only: AES-256-GCM encryption for managed wallet private keys.
// The key material never leaves the server unencrypted except via the
// explicit, authenticated export endpoint.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function encryptionKey(): Buffer {
  const hex = process.env.WALLET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("WALLET_ENCRYPTION_KEY must be 32 bytes hex");
  }
  return Buffer.from(hex, "hex");
}

export function encryptKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
}

export function decryptKey(blob: string): string {
  const [ivHex, tagHex, encHex] = blob.split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}
