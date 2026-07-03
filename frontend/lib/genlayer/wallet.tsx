"use client";

// Both-auth wallet provider. Two modes behind one interface:
//   injected — MetaMask/Rabby via EIP-6963; the user's wallet signs
//   email    — Firebase account; a server-managed wallet signs via /api/tx
// Either way, pages call `performWrite(method, args)` and get the record back.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "genlayer-js";
import { getAddress } from "ethers";
import {
  onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import { pollReceipt, writeAndWait } from "./client";
import { CHAIN, CHAIN_HEX, CHAIN_RPC, CHAIN_NAME } from "../config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Eip1193 = any;

export type WalletInfo = { uuid: string; name: string; icon: string; rdns: string };
export type Discovered = { info: WalletInfo; provider: Eip1193 };
export type AuthMode = "none" | "injected" | "email";

type WalletState = {
  address: string;
  mode: AuthMode;
  email: string;
  connecting: boolean;
  wallets: Discovered[];
  hasWallet: boolean;
  connectInjected: (w?: Discovered) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  exportKey: () => Promise<{ address: string; privateKey: string }>;
  performWrite: <T>(method: string, args: string[]) => Promise<T | null>;
  disconnect: () => void;
};

const Ctx = createContext<WalletState | null>(null);
const CONNECTED_KEY = "gazette_connected_rdns";

async function ensureChain(provider: Eip1193): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_HEX, chainName: CHAIN_NAME,
            rpcUrls: [CHAIN_RPC],
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          }],
        });
      } catch { /* declined */ }
    }
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<AuthMode>("none");
  const [email, setEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [wallets, setWallets] = useState<Discovered[]>([]);
  const clientRef = useRef<Client | null>(null);
  const userRef = useRef<User | null>(null);

  const disconnect = useCallback(() => {
    setAddress(""); setMode("none"); setEmail("");
    clientRef.current = null;
    localStorage.removeItem(CONNECTED_KEY);
    signOut(getFirebaseAuth()).catch(() => {});
  }, []);

  // ── injected mode ─────────────────────────────────────────────────────────

  const bindInjected = useCallback((raw: string, provider: Eip1193) => {
    const addr = getAddress(raw);
    clientRef.current = createClient({ chain: CHAIN, account: addr as `0x${string}`, provider });
    setAddress(addr);
    setMode("injected");
    const onAccounts = (accs: string[]) => {
      if (accs?.[0]) {
        const a = getAddress(accs[0]);
        setAddress(a);
        clientRef.current = createClient({ chain: CHAIN, account: a as `0x${string}`, provider });
      } else {
        setAddress(""); setMode("none"); clientRef.current = null;
        localStorage.removeItem(CONNECTED_KEY);
      }
    };
    provider.removeListener?.("accountsChanged", onAccounts);
    provider.on?.("accountsChanged", onAccounts);
  }, []);

  useEffect(() => {
    function onAnnounce(e: Event) {
      const d = (e as CustomEvent).detail as Discovered;
      if (!d?.info?.uuid) return;
      setWallets((prev) => (prev.some((p) => p.info.uuid === d.info.uuid) ? prev : [...prev, d]));
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const t = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legacy = (window as any).ethereum;
      if (legacy) {
        setWallets((prev) =>
          prev.length === 0
            ? [{ info: { uuid: "legacy", name: "Browser wallet", icon: "", rdns: "legacy" }, provider: legacy }]
            : prev,
        );
      }
    }, 500);
    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
      clearTimeout(t);
    };
  }, []);

  // Silent eager-reconnect for injected wallets.
  useEffect(() => {
    if (address) return;
    const rdns = localStorage.getItem(CONNECTED_KEY);
    if (!rdns) return;
    const w = wallets.find((x) => x.info.rdns === rdns);
    if (!w) return;
    w.provider
      .request({ method: "eth_accounts" })
      .then(async (accs: string[]) => {
        if (accs?.[0]) {
          await ensureChain(w.provider);
          bindInjected(accs[0], w.provider);
        }
      })
      .catch(() => {});
  }, [wallets, address, bindInjected]);

  const connectInjected = useCallback(
    async (w?: Discovered) => {
      const pick = w ?? wallets[0];
      if (!pick) throw new Error("No wallet detected. Install MetaMask or Rabby, then try again.");
      setConnecting(true);
      try {
        const accs: string[] = await pick.provider.request({ method: "eth_requestAccounts" });
        if (!accs?.[0]) throw new Error("No account selected.");
        await ensureChain(pick.provider);
        bindInjected(accs[0], pick.provider);
        localStorage.setItem(CONNECTED_KEY, pick.info.rdns);
      } finally {
        setConnecting(false);
      }
    },
    [wallets, bindInjected],
  );

  // ── email mode ────────────────────────────────────────────────────────────

  const bindEmail = useCallback(async (user: User) => {
    userRef.current = user;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/auth/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not open your wallet");
    setAddress(json.address);
    setEmail(user.email ?? "");
    setMode("email");
  }, []);

  // Restore an email session on revisit.
  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (user && !address) bindEmail(user).catch(() => {});
      userRef.current = user;
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUpEmail = useCallback(async (em: string, password: string) => {
    setConnecting(true);
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), em, password);
      await bindEmail(cred.user);
    } finally {
      setConnecting(false);
    }
  }, [bindEmail]);

  const signInEmail = useCallback(async (em: string, password: string) => {
    setConnecting(true);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), em, password);
      await bindEmail(cred.user);
    } finally {
      setConnecting(false);
    }
  }, [bindEmail]);

  const exportKey = useCallback(async () => {
    if (!userRef.current) throw new Error("Sign in first");
    const idToken = await userRef.current.getIdToken();
    const res = await fetch("/api/auth/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Export failed");
    return json as { address: string; privateKey: string };
  }, []);

  // ── the unified write path ────────────────────────────────────────────────

  const performWrite = useCallback(async <T,>(method: string, args: string[]): Promise<T | null> => {
    if (mode === "injected" && clientRef.current) {
      return writeAndWait<T>(clientRef.current, method, args);
    }
    if (mode === "email" && userRef.current) {
      const idToken = await userRef.current.getIdToken();
      const res = await fetch("/api/tx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, method, args }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit the transaction");
      return pollReceipt<T>(json.txHash);
    }
    throw new Error("Sign in first");
  }, [mode]);

  return (
    <Ctx.Provider
      value={{
        address, mode, email, connecting, wallets,
        hasWallet: wallets.length > 0,
        connectInjected, signUpEmail, signInEmail, exportKey, performWrite, disconnect,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used within WalletProvider");
  return v;
}

export function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
