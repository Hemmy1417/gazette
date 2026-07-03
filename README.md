# GAZETTE

**The official record of the living web. Witnessed by validators, attested by AI, permanent by design.**

The web forgets: pages get quietly edited by their owners, sources vanish, "we never said that" happens. Screenshots prove nothing. GAZETTE fixes this: paste the URL of someone else's live page, and GenLayer validators each fetch it independently, agree on what it said, and write the attestation to chain forever. When the site's owner later rewrites or deletes their page, the Gazette catches the change.

**Contract:** `0x943918c5D4C76f3Be4Be7E409ABd1B00f7D2d06e` on GenLayer Studionet

---

## How it works

You witness pages **other people control** — a news article, a government notice, a company press release, a politician's blog. The Gazette records what those pages *actually* said, so you can catch the site's owner if they edit or remove them later.

1. **Witness** — paste a URL. Independent validators fetch it and agree on what the page said: headline, summary, key claims, verbatim quotes, page state.
2. **Come back** — re-witness the same record. Validators fetch the URL again and diff against the original attestation. Verdict is `UNCHANGED`, `EDITED` (the source owner rewrote the page), or `GONE` (they removed it).
3. **The Memory Hole** — every record that ends up `EDITED` or `GONE` is listed publicly. The original attestation is preserved. The web tried to forget; the Gazette didn't.

## Features

- **Edit detection** — bucketed consensus (`UNCHANGED`/`EDITED`/`GONE`) — substance changes only, not page furniture
- **Claim check** — optionally ask a yes/no question about a page; witnesses answer with the closest supporting quote
- **Page timeline** — every witnessing of one URL threaded chronologically
- **Dossiers** — folders of witnessed records for a beat, a story, or an investigation
- **Reachability preflight** — a server-side probe warns you if the page walls automated fetchers before you spend a consensus round
- **Embeddable badge** — publishers can drop a "GAZETTED" proof mark on their own page
- **Citation export** — one-click footnote-ready citation for journalists and academics
- **Public JSON API** — `GET /api/record/[id]` returns the attestation as JSON for newsroom tooling
- **Both auth modes** — email account (server-managed wallet, exportable key) *or* injected wallet (MetaMask, Rabby)

## Architecture

```
frontend (Next.js 16, Vercel) ── genlayer-js ── GenLayer Studionet
   │                                                 gazette.py
   └── /api/*  (Next.js route handlers)  ── Firebase
       ├── auth/wallet  — get-or-create the managed wallet for an email account
       ├── auth/export  — export the private key to its owner
       ├── tx           — submit-only witnessing/re-witnessing for email users
       ├── preflight    — reachability check before witnessing
       ├── record/[id]  — public JSON attestation
       └── badge/[id]   — embeddable SVG proof mark
```

| Layer | Technology |
|-------|-----------|
| Contract | GenLayer Intelligent Contract (Python) |
| Frontend | Next.js 16, React 19, Tailwind v4 — WIRED-inspired broadsheet design |
| Auth | Firebase (email + password) OR injected wallet |
| Wallet vault | Firestore + AES-256-GCM (server-managed keys, exportable) |
| Chain | GenLayer Studionet, GEN token |

## Consensus discipline

Every AI method uses **bucketed comparative consensus** so validators only need to agree on substance:

- `witness` — validators agree on `page_state` bucket and whether summaries describe the same content; wording and quote selection are free
- `rewitness` — validators agree on the verdict bucket (`UNCHANGED`/`EDITED`/`GONE`); change descriptions may differ
- `claim` — validators agree on `yes/no/unclear`; supporting quote may differ

The fetch probe (Phase 2) witnessed BBC, Wikipedia, AP, NYT, and example.com — all reached LIVE with zero undetermined.

## No wall-clock, action-based lifecycle

Studionet's GenVM exposes no time source. GAZETTE's contract is ordered by sequence number, and the AI captures any date the page displays as text.

## Project structure

```
Gazette/
├── contracts/gazette.py         # the intelligent contract
├── deploy/deployScript.ts       # scripted deployment
├── tests/direct/                # direct-mode contract tests (pytest)
├── gltest.config.yaml
└── frontend/
    ├── app/                     # front page, witness, record/[id], records,
    │   │                        # memory-hole, timeline, dossiers, reporter, account, try-it
    │   ├── api/                 # route handlers (Firebase + tx + preflight + badge + JSON)
    │   └── demo/breaking-news.txt  # the controllable page for the edit-detection demo
    ├── components/
    └── lib/
        ├── genlayer/            # client, wallet provider, firebase client
        ├── contracts/           # typed contract wrapper + types
        ├── server/              # Firebase Admin + wallet crypto (server-only)
        └── hooks/
```

## Local development

```bash
# contract tests (writing more of these is on the roadmap)
pip install -r requirements.txt

# frontend
cd frontend
cp .env.Example .env.local
npm install && npm run dev
```

## Environment variables

**`frontend/.env.local`** (also set these on Vercel):

- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin (server-only)
- `WALLET_ENCRYPTION_KEY` — 32 bytes hex for AES-256-GCM

## The three-minute demo

In real use the source owner rewrites their own page and journalists catch them. For a controlled demo we play the newsroom ourselves so you can watch the round-trip.

Read `/try-it` on the deployed site for the walkthrough:

1. Witness `[your-domain]/demo/breaking-news.txt` — a fake newsroom page we control
2. Ask us to rewrite it (a small commit) — standing in for what a real news outlet does to their own page
3. Re-witness — verdict: `EDITED`
4. The record lands in the Memory Hole with the change described

For a *real*, self-serve demo: witness a fast-moving news homepage like `bbc.com/news`, wait a few hours, and re-witness. The BBC will update their own page all day.
