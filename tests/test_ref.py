"""Python reference tests: exact fixture values and Hypothesis properties.
Run: python3 -m pytest -q tests/test_ref.py   (or python3 tests/test_ref.py)"""
import sys
from fractions import Fraction as Fr
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
import rudy_ref as R  # noqa: E402
from hypothesis import given, settings, strategies as st, seed  # noqa: E402

FX = R.load_fixture(Path(__file__).resolve().parents[1] / "python" / "fixture.json")
SPREAD = FX["presets"]["spread"]["positions"]
CLUSTER = FX["presets"]["cluster"]["positions"]


def test_spread_exact():
    D = R.demand_p(FX, SPREAD)
    assert D == [[Fr(37, 6), Fr(37, 6)], [Fr(14, 3), Fr(25, 6)], [Fr(20, 3), Fr(37, 6)], [0, 0]]
    m2, m1 = R.overflow_metrics(D, 2), R.overflow_metrics(D, 1)
    assert (m2["total"], m2["max"], m2["count"]) == (22, Fr(14, 3), 6)
    assert (m1["total"], m1["max"], m1["count"]) == (28, Fr(17, 3), 6)


def test_cluster_exact():
    D = R.demand_p(FX, CLUSTER)
    assert D == [[0, 0], [7, 0], [0, 0], [0, 0]]
    m2, m1 = R.overflow_metrics(D, 2), R.overflow_metrics(D, 1)
    assert (m2["total"], m2["max"], m2["count"]) == (5, 5, 1)
    assert (m1["total"], m1["max"], m1["count"]) == (6, 6, 1)


def test_boundary_and_degenerate():
    p = {"chip": FX["chip"], "gcell": FX["gcell"], "nets": [["P", "Q"], ["U", "V"]]}
    D = R.demand_p(p, {"P": {"x": 1, "y": 1}, "Q": {"x": 3, "y": 1}, "U": {"x": 5, "y": 5}, "V": {"x": 5, "y": 5}})
    assert D[0][0] == 1 and D[1][0] == 1 and D[1][1] == 0


def test_rejects_bad_input():
    import pytest
    for prob, pos in [
        ({**FX, "nets": [[]]}, SPREAD),
        ({**FX, "nets": [["A", "Z"]]}, SPREAD),
        (FX, {**SPREAD, "A": {"x": float("nan"), "y": 1}}),
        (FX, {**SPREAD, "A": {"x": 13, "y": 1}}),
    ]:
        with pytest.raises(R.RudyInputError):
            R.demand_p(prob, pos)
    with pytest.raises(R.RudyInputError):
        R.overflow_metrics([[Fr(1)]], 0)


coord_x = st.one_of(st.integers(0, 12), st.fractions(0, 12, max_denominator=24))
coord_y = st.one_of(st.integers(0, 8), st.fractions(0, 8, max_denominator=24))
pos_st = st.fixed_dictionaries({p: st.fixed_dictionaries({"x": coord_x, "y": coord_y}) for p in FX["pins"]})
nets_st = st.lists(st.lists(st.sampled_from(FX["pins"]), min_size=1, max_size=6, unique=True), max_size=8)


@seed(20261123)
@settings(max_examples=300, deadline=None)
@given(pos_st, nets_st)
def test_conservation_exact(pos, nets):
    p = {**FX, "nets": nets}
    h = R.total_hpwl(p, pos)
    assert sum((sum(c, Fr(0)) for c in R.demand_p(p, pos)), Fr(0)) == h
    T, H, V = R.demand_a(p, pos)
    assert sum((sum(c, Fr(0)) for c in T), Fr(0)) == h
    assert sum((sum(c, Fr(0)) for c in H), Fr(0)) == sum((R.net_box(n, R._pos(pos))[2] - R.net_box(n, R._pos(pos))[0] for n in nets), Fr(0))


@seed(20261123)
@settings(max_examples=200, deadline=None)
@given(pos_st, nets_st, st.fractions(Fr(1, 10), 20))
def test_capacity_independent(pos, nets, C):
    p = {**FX, "nets": nets}
    D1 = R.demand_p(p, pos)
    R.overflow_metrics(D1, C)
    assert R.demand_p(p, pos) == D1


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-q"]))
