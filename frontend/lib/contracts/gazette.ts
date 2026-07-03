// Typed reads for the Gazette contract. Writes go through
// useWallet().performWrite so both auth modes share one path.

import { read } from "../genlayer/client";
import type { GazetteRecord, Dossier, Reputation, Stats } from "./types";

export async function getRecord(recordId: string): Promise<GazetteRecord | null> {
  const raw = await read("get_record", [recordId]);
  return raw ? JSON.parse(raw) : null;
}

export async function getRecords(n = 50): Promise<GazetteRecord[]> {
  const raw = await read("get_records", [String(n)]);
  return raw ? JSON.parse(raw) : [];
}

export async function getUrlHistory(url: string): Promise<GazetteRecord[]> {
  const raw = await read("get_url_history", [url]);
  return raw ? JSON.parse(raw) : [];
}

export async function getMemoryHole(n = 50): Promise<GazetteRecord[]> {
  const raw = await read("get_memory_hole", [String(n)]);
  return raw ? JSON.parse(raw) : [];
}

export async function getRecordsFor(address: string): Promise<GazetteRecord[]> {
  const raw = await read("get_records_for", [address]);
  return raw ? JSON.parse(raw) : [];
}

export async function getReputation(address: string): Promise<Reputation | null> {
  const raw = await read("get_reputation", [address]);
  return raw ? JSON.parse(raw) : null;
}

export async function getDossier(dossierId: string): Promise<Dossier | null> {
  const raw = await read("get_dossier", [dossierId]);
  return raw ? JSON.parse(raw) : null;
}

export async function getDossiersFor(address: string): Promise<Dossier[]> {
  const raw = await read("get_dossiers_for", [address]);
  return raw ? JSON.parse(raw) : [];
}

export async function getRecentDossiers(n = 20): Promise<Dossier[]> {
  const raw = await read("get_recent_dossiers", [String(n)]);
  return raw ? JSON.parse(raw) : [];
}

export async function getStats(): Promise<Stats | null> {
  const raw = await read("get_stats", []);
  return raw ? JSON.parse(raw) : null;
}
