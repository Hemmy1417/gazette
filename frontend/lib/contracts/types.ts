export type PageState = "LIVE" | "BLOCKED" | "GONE";
export type RevVerdict = "UNCHANGED" | "EDITED" | "GONE";

export type Claim = {
  question: string;
  verdict: "yes" | "no" | "unclear";
  quote: string;
} | null;

export type Attestation = {
  page_state: PageState;
  title: string;
  outlet: string;
  author: string;
  as_of: string;
  summary: string;
  key_claims: string[];
  quotes: string[];
  claim: Claim;
};

export type Revision = {
  n: number;
  by: string;
  verdict: RevVerdict;
  changes: string;
  current_summary: string;
};

export type GazetteRecord = {
  record_id: string;
  seq: number;
  witness: string;
  url: string;
  url_hash: string;
  note: string;
  attestation: Attestation;
  revisions: Revision[];
  latest: string;
};

export type Dossier = {
  dossier_id: string;
  seq: number;
  owner: string;
  title: string;
  description: string;
  record_ids: string[];
};

export type Reputation = {
  owner: string;
  witnessed: number;
  rewitnessed: number;
  edits_caught: number;
  gone_caught: number;
};

export type Stats = {
  total_records: number;
  total_edits: number;
  total_gone: number;
  total_dossiers: number;
};
