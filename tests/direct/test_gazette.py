"""
Direct-mode tests for gazette.py — the deterministic surface without
GenLayer's AI/consensus stack. Run with:  python -m pytest tests/direct -q

The genlayer runtime is stubbed; gl.eq_principle.prompt_comparative RUNS the
observe fn (so the web-fetch and LLM fail-safe paths execute) and returns the
canned output — or whatever observe returned when the LLM stub is primed to
raise. Covers the two production-hardening items from the judges:
  1. exec_prompt failures degrade to BLOCKED / no-op UNCHANGED, never abort.
  2. One-to-many indexes are flat sequential keys (O(1) appends), with the
     memory hole's dedup preserved via a membership map.
"""

import importlib.util
import json
import pathlib
import sys
import types

import pytest

CONTRACT_PATH = pathlib.Path(__file__).resolve().parents[2] / "contracts" / "gazette.py"


# ── GenLayer runtime stubs ───────────────────────────────────────────────────

class _UserError(Exception):
    pass


class _VmModule:
    UserError = _UserError


class _TreeMap(dict):
    def get(self, k, default=None):
        return super().get(k, default)

    def __contains__(self, k):
        return super().__contains__(k)


class _U256(int):
    def __new__(cls, v):
        return super().__new__(cls, int(v))


class _ViewDeco:
    def __call__(self, fn): return fn


class _WriteDeco:
    payable = staticmethod(lambda fn: fn)
    def __call__(self, fn): return fn


class _Public:
    view = _ViewDeco()
    write = _WriteDeco()


class _NondetWeb:
    page_text = "OFFICIAL RELEASE — The agency confirmed the program on Monday. Quote: 'we proceed'."
    raise_next = False

    @classmethod
    def render(cls, url, mode="text"):
        if cls.raise_next:
            raise RuntimeError("403 blocked")
        return cls.page_text


class _Nondet:
    web = _NondetWeb

    @staticmethod
    def exec_prompt(prompt):
        if _EqPrinciple.llm_raise:
            raise RuntimeError("provider 503: transient upstream error")
        return _EqPrinciple.canned


class _EqPrinciple:
    canned = "{}"
    llm_raise = False

    @classmethod
    def prompt_comparative(cls, fn, principle):
        # run the leader's observe fn for real — its try/except paths ARE the test
        return fn()


class _GL:
    class Contract: pass
    nondet = _Nondet; eq_principle = _EqPrinciple
    public = _Public(); vm = _VmModule
    class message:
        sender_address = "0x0000000000000000000000000000000000000000"
        value = 0


def _install():
    mod = types.ModuleType("genlayer")
    mod.gl = _GL; mod.TreeMap = _TreeMap; mod.u256 = _U256; mod.Address = str
    mod.__all__ = ["gl", "TreeMap", "u256", "Address"]
    sys.modules["genlayer"] = mod


def _load():
    _install()
    spec = importlib.util.spec_from_file_location("gazette_contract", CONTRACT_PATH)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


WITNESS = "0x1111111111111111111111111111111111111111"
OTHER   = "0x2222222222222222222222222222222222222222"


def _attest_json(state="LIVE", title="The agency confirms the program"):
    return json.dumps({
        "page_state": state, "title": title, "outlet": "Example Wire",
        "author": "A. Reporter", "as_of": "Monday",
        "summary": "The agency confirmed the program.",
        "key_claims": ["The agency confirmed the program."],
        "quotes": ["we proceed"], "claim": None,
    })


def _diff_json(verdict="UNCHANGED", changes=""):
    return json.dumps({"verdict": verdict, "changes": changes,
                       "current_summary": "Still says the program is confirmed."})


@pytest.fixture
def module():
    return _load()


@pytest.fixture
def c(module):
    _EqPrinciple.canned = _attest_json()
    _EqPrinciple.llm_raise = False
    _NondetWeb.raise_next = False
    _NondetWeb.page_text = "OFFICIAL RELEASE — The agency confirmed the program on Monday. Quote: 'we proceed'."
    module.gl.message.sender_address = WITNESS
    g = module.Gazette()
    for name in ("records", "url_history", "wallet_records", "memory_hole",
                 "wallet_dossiers", "seq_counts", "hole_seen", "reputation", "dossiers"):
        setattr(g, name, module.TreeMap())
    return g


def _as(module, who):
    module.gl.message.sender_address = who


def _witness(module, c, url="https://example.org/story", who=WITNESS):
    _as(module, who)
    return json.loads(c.witness(url, "note", ""))


# ── LLM error resilience (judge item #1) ─────────────────────────────────────

def test_llm_error_during_witness_degrades_to_blocked(module, c):
    _EqPrinciple.llm_raise = True
    rec = _witness(module, c)
    assert rec["attestation"]["page_state"] == "BLOCKED"
    assert "LLM provider errored" in rec["attestation"]["summary"]
    # a degraded round never enters the permanent memory hole
    assert json.loads(c.get_memory_hole("10")) == []


def test_llm_error_during_rewitness_is_a_noop_not_a_verdict(module, c):
    rec = _witness(module, c)
    _EqPrinciple.llm_raise = True
    out = json.loads(c.rewitness(rec["record_id"]))
    rev = out["revisions"][0]
    # an outage must never write EDITED/GONE into the permanent record
    assert rev["verdict"] == "UNCHANGED"
    assert "LLM provider errored" in rev["current_summary"]
    assert out["latest"] == "LIVE"
    assert json.loads(c.get_memory_hole("10")) == []
    stats = json.loads(c.get_stats())
    assert stats["total_edits"] == 0 and stats["total_gone"] == 0


def test_dead_page_still_handled_without_llm(module, c):
    _NondetWeb.raise_next = True     # fetch itself fails — pre-existing fail-safe
    rec = _witness(module, c)
    assert rec["attestation"]["page_state"] == "BLOCKED"


# ── Flat sequential storage (judge item #2) ──────────────────────────────────

def test_indexes_are_flat_keys_not_json_blobs(module, c):
    rec = _witness(module, c)
    uhash = rec["url_hash"]
    # one id per key, counter alongside — no JSON list blob under a single key
    assert c.url_history.get(f"{uhash}:0") == rec["record_id"]
    assert c.seq_counts.get(uhash) == "1"
    assert c.wallet_records.get(f"{WITNESS.lower()}:0") == rec["record_id"]
    assert uhash not in c.url_history          # the old blob key is gone
    _witness(module, c)                        # same URL again
    assert c.seq_counts.get(uhash) == "2"


def test_wallet_and_url_reads_traverse_flat_lists(module, c):
    r0 = _witness(module, c, url="https://example.org/a")
    r1 = _witness(module, c, url="https://example.org/a")
    r2 = _witness(module, c, url="https://example.org/b")
    hist = json.loads(c.get_url_history("https://example.org/a"))
    assert [h["record_id"] for h in hist] == [r0["record_id"], r1["record_id"]]
    mine = json.loads(c.get_records_for(WITNESS))
    assert [m["record_id"] for m in mine] == [r2["record_id"], r1["record_id"], r0["record_id"]]
    assert json.loads(c.get_records_for(OTHER)) == []


def test_memory_hole_dedup_and_newest_first_pagination(module, c):
    recs = []
    for i in range(3):
        recs.append(_witness(module, c, url=f"https://example.org/{i}"))
    # each record gets EDITED twice — must enter the hole exactly once
    _EqPrinciple.canned = _diff_json("EDITED", "headline softened")
    for r in recs:
        c.rewitness(r["record_id"])
        c.rewitness(r["record_id"])
    hole = json.loads(c.get_memory_hole("10"))
    assert [h["record_id"] for h in hole] == [r["record_id"] for r in reversed(recs)]
    # pagination takes the newest N
    hole2 = json.loads(c.get_memory_hole("2"))
    assert [h["record_id"] for h in hole2] == [recs[2]["record_id"], recs[1]["record_id"]]
    stats = json.loads(c.get_stats())
    assert stats["total_edits"] == 6            # every catch counts; the hole dedupes


def test_dossier_index_uses_flat_keys(module, c):
    _as(module, WITNESS)
    d = json.loads(c.create_dossier("Watch: agency page", "tracked"))
    assert c.wallet_dossiers.get(f"{WITNESS.lower()}:0") == d["dossier_id"]
    mine = json.loads(c.get_dossiers_for(WITNESS))
    assert [x["dossier_id"] for x in mine] == [d["dossier_id"]]


# ── Core record flow still intact after the refactor ─────────────────────────

def test_witness_and_gone_flow(module, c):
    _EqPrinciple.canned = _attest_json(state="GONE")
    rec = _witness(module, c)
    assert rec["attestation"]["page_state"] == "GONE"
    hole = json.loads(c.get_memory_hole("10"))
    assert [h["record_id"] for h in hole] == [rec["record_id"]]
    assert json.loads(c.get_stats())["total_gone"] == 1


def test_rewitness_gone_enters_hole_once(module, c):
    rec = _witness(module, c)
    _EqPrinciple.canned = _diff_json("GONE", "content replaced with a removal notice")
    out = json.loads(c.rewitness(rec["record_id"]))
    assert out["latest"] == "GONE"
    assert len(json.loads(c.get_memory_hole("10"))) == 1
    rep = json.loads(c.get_reputation(WITNESS))
    assert rep["gone_caught"] == 1 and rep["witnessed"] == 1
