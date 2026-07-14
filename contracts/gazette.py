# v0.2.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import hashlib
from genlayer import *

# GAZETTE — the official record of the living web. Validators independently
# fetch a URL, AI consensus attests what it said, and the record is permanent.
# Re-witnessing catches stealth edits; vanished sources are recorded as GONE.
#
# Intelligent Oracle, Reader pattern (GenLayer taxonomy). All consensus fields
# are bucketed (page_state, verdicts) so validators agree on substance, never
# exact wording. No wall-clock exists on Studionet — records are ordered by
# sequence, and any date the page itself displays is captured as text.

MAX_URL       = 500
MAX_NOTE      = 300
MAX_QUESTION  = 300
MAX_TITLE     = 120
MAX_DOSSIER   = 60
PAGE_STATES   = ("LIVE", "BLOCKED", "GONE")
REV_VERDICTS  = ("UNCHANGED", "EDITED", "GONE")
CLAIM_BUCKETS = ("yes", "no", "unclear")


def _parse_json(raw):
    text = raw.strip()
    if "```" in text:
        parts = text.split("```")
        text  = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _normalize_url(url):
    u = url.strip()
    if not (u.startswith("http://") or u.startswith("https://")):
        raise gl.vm.UserError("url must start with http(s)://")
    if len(u) > MAX_URL:
        raise gl.vm.UserError("url too long")
    # strip fragment
    u = u.split("#", 1)[0]
    # strip tracking params, keep the rest in original order
    if "?" in u:
        base, qs = u.split("?", 1)
        kept = [p for p in qs.split("&")
                if p and not p.lower().startswith(("utm_", "fbclid", "gclid", "ref="))]
        u = base + ("?" + "&".join(kept) if kept else "")
    # lowercase scheme + host only
    scheme, rest = u.split("://", 1)
    host, _, path = rest.partition("/")
    u = scheme.lower() + "://" + host.lower() + (("/" + path) if path else "")
    return u.rstrip("/") if "/" not in rest else u


def _url_hash(normalized):
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _clip(s, n):
    return str(s or "").strip()[:n]


class Gazette(gl.Contract):
    total_records:  u256
    total_edits:    u256
    total_gone:     u256
    total_dossiers: u256
    records:        TreeMap[str, str]   # r_N -> record JSON
    # Flat sequential lists: every one-to-many index stores single ids under
    # "<list key>:<i>" with the item count in seq_counts["<list key>"]. An
    # append writes ONE key and ONE counter — O(1) regardless of how long the
    # list grows. (The previous JSON-blob-per-key layout re-parsed and re-wrote
    # the whole list on every append: costs rose with list length and a busy
    # index would eventually hit transaction memory limits.)
    url_history:    TreeMap[str, str]   # "<url_hash>:<i>" -> record id
    wallet_records: TreeMap[str, str]   # "<address>:<i>"  -> record id
    memory_hole:    TreeMap[str, str]   # "ids:<i>"        -> record id
    wallet_dossiers: TreeMap[str, str]  # "<address>:<i>"  -> dossier id
    seq_counts:     TreeMap[str, str]   # list key -> item count
    hole_seen:      TreeMap[str, str]   # record id -> "1" (memory-hole membership)
    reputation:     TreeMap[str, str]   # address -> reputation JSON
    dossiers:       TreeMap[str, str]   # d_N -> dossier JSON

    def __init__(self):
        self.total_records  = u256(0)
        self.total_edits    = u256(0)
        self.total_gone     = u256(0)
        self.total_dossiers = u256(0)

    # ── internal helpers ─────────────────────────────────────────────────────

    def _record(self, record_id):
        raw = self.records.get(record_id, "")
        if not raw:
            raise gl.vm.UserError("no such record")
        return json.loads(raw)

    def _save(self, rec):
        self.records[rec["record_id"]] = json.dumps(rec)

    def _seq_len(self, key):
        raw = self.seq_counts.get(key, "")
        return int(raw) if raw else 0

    def _seq_push(self, tree, key, value):
        """O(1) append to a flat sequential list."""
        n = self._seq_len(key)
        tree[f"{key}:{n}"] = value
        self.seq_counts[key] = str(n + 1)

    def _seq_slice(self, tree, key, take=None, newest_first=False):
        """Read a flat list; optionally only the newest `take` items."""
        n = self._seq_len(key)
        lo = max(0, n - take) if take is not None else 0
        ids = [tree.get(f"{key}:{i}", "") for i in range(lo, n)]
        ids = [i for i in ids if i]
        if newest_first:
            ids.reverse()
        return ids

    def _rep(self, address):
        raw = self.reputation.get(address.lower(), "")
        if raw:
            return json.loads(raw)
        return {"owner": address, "witnessed": 0, "rewitnessed": 0,
                "edits_caught": 0, "gone_caught": 0}

    def _bump(self, address, field):
        r = self._rep(address)
        r[field] = int(r.get(field, 0)) + 1
        self.reputation[address.lower()] = json.dumps(r)

    def _hole_add(self, record_id):
        # membership map keeps the dedup the old JSON list gave us, still O(1)
        if self.hole_seen.get(record_id, ""):
            return
        self.hole_seen[record_id] = "1"
        self._seq_push(self.memory_hole, "ids", record_id)

    # ── AI: witness a page (Reader pattern, comparative consensus) ──────────

    def _attest(self, url, claim_question):
        claim_part = ""
        if claim_question:
            claim_part = f"""
The witness also asks a specific question about this page:
"{claim_question}"
Answer it ONLY from the page text, with the single closest supporting quote."""

        def observe():
            try:
                page = gl.nondet.web.render(url, mode="text")
            except Exception as e:
                return json.dumps({
                    "page_state": "BLOCKED",
                    "title": "", "outlet": "", "author": "", "as_of": "",
                    "summary": f"The page could not be fetched by this validator: {str(e)[:120]}",
                    "key_claims": [], "quotes": [],
                    "claim": {"verdict": "unclear", "quote": ""} if claim_question else None,
                })
            page = (page or "")[:9000]
            if len(page.strip()) < 40:
                return json.dumps({
                    "page_state": "GONE",
                    "title": "", "outlet": "", "author": "", "as_of": "",
                    "summary": "The URL returned an empty or near-empty page.",
                    "key_claims": [], "quotes": [],
                    "claim": {"verdict": "unclear", "quote": ""} if claim_question else None,
                })
            prompt = f"""You are a notary witnessing a web page for GAZETTE, a permanent public record
used by journalists. Attest to what this page actually says, as of this fetch.

PAGE TEXT (may include navigation noise — ignore boilerplate):
{page}
{claim_part}

Rules:
- Report only what the page itself says. No outside knowledge, no interpretation.
- If the text is a paywall, cookie wall, bot check, or error page, page_state is "BLOCKED".
- If it is a 404/removed-content page, page_state is "GONE".
- Otherwise page_state is "LIVE".
- as_of: any date/time the page itself displays for the content (dateline, updated stamp), else "".

Respond ONLY with JSON:
{{"page_state": "<LIVE|BLOCKED|GONE>",
 "title": "<the page's own headline/title, up to 200 chars>",
 "outlet": "<publication/site name if evident, else ''>",
 "author": "<byline if evident, else ''>",
 "as_of": "<date text the page shows, else ''>",
 "summary": "<3-4 sentences: what this page says>",
 "key_claims": ["<up to 5 one-sentence factual claims the page makes>"],
 "quotes": ["<up to 3 short verbatim quotes, exact text>"],
 "claim": {("{\"verdict\": \"<yes|no|unclear>\", \"quote\": \"<supporting quote or ''>\"}" if claim_question else "null")}}}"""
            # A transient LLM-provider error must not abort consensus with an
            # unhandled exception — this validator degrades to BLOCKED (which
            # never enters the memory hole or bumps stats) instead.
            try:
                return gl.nondet.exec_prompt(prompt)
            except Exception as e:
                return json.dumps({
                    "page_state": "BLOCKED",
                    "title": "", "outlet": "", "author": "", "as_of": "",
                    "summary": f"Attestation inconclusive: this validator's LLM provider errored ({str(e)[:120]}).",
                    "key_claims": [], "quotes": [],
                    "claim": {"verdict": "unclear", "quote": ""} if claim_question else None,
                })

        principle = (
            "Outputs are equivalent if page_state matches, the titles refer to the same headline, "
            "the summaries describe the same content in substance, and the key claims overlap in "
            "meaning. Wording, ordering, quote selection, and claim counts may differ freely. "
            "If both report a claim verdict, the verdicts must match."
        )
        out = _parse_json(gl.eq_principle.prompt_comparative(observe, principle))

        state = str(out.get("page_state", "BLOCKED")).upper()
        if state not in PAGE_STATES:
            state = "BLOCKED"
        claim = None
        if claim_question:
            c = out.get("claim") or {}
            verdict = str(c.get("verdict", "unclear")).lower()
            claim = {"question": claim_question,
                     "verdict": verdict if verdict in CLAIM_BUCKETS else "unclear",
                     "quote": _clip(c.get("quote"), 400)}
        return {
            "page_state": state,
            "title":      _clip(out.get("title"), 200),
            "outlet":     _clip(out.get("outlet"), 100),
            "author":     _clip(out.get("author"), 100),
            "as_of":      _clip(out.get("as_of"), 80),
            "summary":    _clip(out.get("summary"), 1200),
            "key_claims": [_clip(c, 300) for c in (out.get("key_claims") or [])[:5]],
            "quotes":     [_clip(q, 400) for q in (out.get("quotes") or [])[:3]],
            "claim":      claim,
        }

    # ── AI: re-witness and diff against the prior attestation ───────────────

    def _diff(self, url, prior):
        def observe():
            try:
                page = gl.nondet.web.render(url, mode="text")
            except Exception as e:
                return json.dumps({
                    "verdict": "GONE",
                    "changes": f"The page could no longer be fetched: {str(e)[:120]}",
                    "current_summary": "",
                })
            page = (page or "")[:9000]
            if len(page.strip()) < 40:
                return json.dumps({
                    "verdict": "GONE",
                    "changes": "The URL now returns an empty or near-empty page.",
                    "current_summary": "",
                })
            prompt = f"""You are re-witnessing a web page for GAZETTE's permanent record.
A prior attestation of this same URL is on the record. Compare the page AS IT IS NOW
against that attestation and report whether the content meaningfully changed.

PRIOR ATTESTATION:
title: {prior["title"]}
summary: {prior["summary"]}
key claims: {json.dumps(prior["key_claims"])}
quotes: {json.dumps(prior["quotes"])}

PAGE TEXT NOW:
{page}

Rules:
- "EDITED" means the substance changed: headline altered, claims added/removed/softened,
  quotes changed or gone. Ad rotation, timestamps, related-article boxes do NOT count.
- "UNCHANGED" means the substance is the same, even if trivial page furniture moved.
- "GONE" means the content was removed, replaced, or is now behind an error/removal notice.

Respond ONLY with JSON:
{{"verdict": "<UNCHANGED|EDITED|GONE>",
 "changes": "<if EDITED or GONE: 1-3 sentences saying exactly what changed; else ''>",
 "current_summary": "<2-3 sentences: what the page says now>"}}"""
            # LLM-provider fail-safe: an errored round must never mark a page
            # EDITED/GONE (both are permanent-record events) — degrade to a
            # no-op UNCHANGED with the inconclusiveness on the record.
            try:
                return gl.nondet.exec_prompt(prompt)
            except Exception as e:
                return json.dumps({
                    "verdict": "UNCHANGED",
                    "changes": "",
                    "current_summary": f"Revision round inconclusive: this validator's LLM provider errored ({str(e)[:120]}).",
                })

        principle = (
            "Outputs are equivalent if the verdict matches. Descriptions of what changed "
            "may differ in wording as long as they point at the same kind of change."
        )
        out = _parse_json(gl.eq_principle.prompt_comparative(observe, principle))
        verdict = str(out.get("verdict", "UNCHANGED")).upper()
        if verdict not in REV_VERDICTS:
            verdict = "UNCHANGED"
        return {
            "verdict":         verdict,
            "changes":         _clip(out.get("changes"), 600),
            "current_summary": _clip(out.get("current_summary"), 800),
        }

    # ── writes ───────────────────────────────────────────────────────────────

    @gl.public.write
    def witness(self, url: str, note: str, claim_question: str) -> str:
        sender = str(gl.message.sender_address)
        normalized = _normalize_url(url)
        uhash = _url_hash(normalized)
        question = _clip(claim_question, MAX_QUESTION)

        attestation = self._attest(normalized, question)

        seq = int(self.total_records)
        record_id = f"r_{seq}"
        rec = {
            "record_id":   record_id,
            "seq":         seq,
            "witness":     sender,
            "url":         normalized,
            "url_hash":    uhash,
            "note":        _clip(note, MAX_NOTE),
            "attestation": attestation,
            "revisions":   [],
            "latest":      attestation["page_state"],
        }
        self._save(rec)
        self._seq_push(self.url_history, uhash, record_id)
        self._seq_push(self.wallet_records, sender.lower(), record_id)
        self._bump(sender, "witnessed")
        if attestation["page_state"] == "GONE":
            self._hole_add(record_id)
            self.total_gone = u256(int(self.total_gone) + 1)
        self.total_records = u256(seq + 1)
        return json.dumps(rec)

    @gl.public.write
    def rewitness(self, record_id: str) -> str:
        sender = str(gl.message.sender_address)
        rec = self._record(record_id)
        if rec["attestation"]["page_state"] != "LIVE":
            raise gl.vm.UserError("only a record witnessed LIVE can be re-witnessed")

        result = self._diff(rec["url"], rec["attestation"])
        rec["revisions"].append({
            "n":               len(rec["revisions"]),
            "by":              sender,
            "verdict":         result["verdict"],
            "changes":         result["changes"],
            "current_summary": result["current_summary"],
        })
        rec["latest"] = result["verdict"] if result["verdict"] != "UNCHANGED" else rec["latest"]
        self._save(rec)
        self._bump(sender, "rewitnessed")
        if result["verdict"] == "EDITED":
            self._hole_add(record_id)
            self._bump(sender, "edits_caught")
            self.total_edits = u256(int(self.total_edits) + 1)
        elif result["verdict"] == "GONE":
            self._hole_add(record_id)
            self._bump(sender, "gone_caught")
            self.total_gone = u256(int(self.total_gone) + 1)
        return json.dumps(rec)

    # ── dossiers (watchlists) ────────────────────────────────────────────────

    @gl.public.write
    def create_dossier(self, title: str, description: str) -> str:
        sender = str(gl.message.sender_address)
        if not title.strip():
            raise gl.vm.UserError("give the dossier a title")
        seq = int(self.total_dossiers)
        dossier_id = f"d_{seq}"
        d = {
            "dossier_id":  dossier_id,
            "seq":         seq,
            "owner":       sender,
            "title":       _clip(title, MAX_DOSSIER),
            "description": _clip(description, MAX_NOTE),
            "record_ids":  [],
        }
        self.dossiers[dossier_id] = json.dumps(d)
        self._seq_push(self.wallet_dossiers, sender.lower(), dossier_id)
        self.total_dossiers = u256(seq + 1)
        return json.dumps(d)

    @gl.public.write
    def add_to_dossier(self, dossier_id: str, record_id: str) -> str:
        sender = str(gl.message.sender_address)
        raw = self.dossiers.get(dossier_id, "")
        if not raw:
            raise gl.vm.UserError("no such dossier")
        d = json.loads(raw)
        if d["owner"].lower() != sender.lower():
            raise gl.vm.UserError("only the owner may edit a dossier")
        self._record(record_id)  # must exist
        if record_id not in d["record_ids"]:
            d["record_ids"].append(record_id)
            self.dossiers[dossier_id] = json.dumps(d)
        return json.dumps(d)

    @gl.public.write
    def remove_from_dossier(self, dossier_id: str, record_id: str) -> str:
        sender = str(gl.message.sender_address)
        raw = self.dossiers.get(dossier_id, "")
        if not raw:
            raise gl.vm.UserError("no such dossier")
        d = json.loads(raw)
        if d["owner"].lower() != sender.lower():
            raise gl.vm.UserError("only the owner may edit a dossier")
        if record_id in d["record_ids"]:
            d["record_ids"].remove(record_id)
            self.dossiers[dossier_id] = json.dumps(d)
        return json.dumps(d)

    # ── reads ────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_record(self, record_id: str) -> str:
        return self.records.get(record_id, "")

    @gl.public.view
    def get_records(self, n: str) -> str:
        count = int(self.total_records)
        take = min(count, max(1, int(n or "50")))
        out = []
        for i in range(count - 1, count - 1 - take, -1):
            raw = self.records.get(f"r_{i}", "")
            if raw:
                out.append(json.loads(raw))
        return json.dumps(out)

    @gl.public.view
    def get_url_history(self, url: str) -> str:
        uhash = _url_hash(_normalize_url(url))
        ids = self._seq_slice(self.url_history, uhash)
        return json.dumps([json.loads(self.records[i]) for i in ids if i in self.records])

    @gl.public.view
    def get_memory_hole(self, n: str) -> str:
        take = max(1, int(n or "50"))
        ids = self._seq_slice(self.memory_hole, "ids", take=take, newest_first=True)
        return json.dumps([json.loads(self.records[i]) for i in ids if i in self.records])

    @gl.public.view
    def get_records_for(self, address: str) -> str:
        ids = self._seq_slice(self.wallet_records, address.lower(), newest_first=True)
        return json.dumps([json.loads(self.records[i]) for i in ids if i in self.records])

    @gl.public.view
    def get_reputation(self, address: str) -> str:
        return json.dumps(self._rep(address))

    @gl.public.view
    def get_dossier(self, dossier_id: str) -> str:
        return self.dossiers.get(dossier_id, "")

    @gl.public.view
    def get_dossiers_for(self, address: str) -> str:
        ids = self._seq_slice(self.wallet_dossiers, address.lower())
        return json.dumps([json.loads(self.dossiers[i]) for i in ids if i in self.dossiers])

    @gl.public.view
    def get_recent_dossiers(self, n: str) -> str:
        count = int(self.total_dossiers)
        take = min(count, max(1, int(n or "20")))
        out = []
        for i in range(count - 1, count - 1 - take, -1):
            raw = self.dossiers.get(f"d_{i}", "")
            if raw:
                out.append(json.loads(raw))
        return json.dumps(out)

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({
            "total_records":  int(self.total_records),
            "total_edits":    int(self.total_edits),
            "total_gone":     int(self.total_gone),
            "total_dossiers": int(self.total_dossiers),
        })
