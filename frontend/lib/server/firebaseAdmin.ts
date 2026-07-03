// Server-only: Firebase Admin for auth verification and the wallet store.
// Route handlers only — never import from client components.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function privateKey(): string {
  const raw = requiredEnv("FIREBASE_PRIVATE_KEY");
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function app() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: requiredEnv("FIREBASE_PROJECT_ID"),
        clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: privateKey(),
      }),
    });
  }
  return getApps()[0];
}

export function adminDb() {
  app();
  return getFirestore();
}

// Verifies a Firebase ID token from the client and returns the uid.
export async function requireUser(idToken: string): Promise<string> {
  if (!idToken) throw new Error("Missing auth token");
  app();
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded.uid;
}
