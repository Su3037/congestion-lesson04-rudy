"""Checker for the RUDY practice.  Usage:  python3 check.py [module.py]
Prints PASS, INCOMPLETE (functions not implemented yet) or FAIL with details."""
import importlib.util
import json
import sys
from fractions import Fraction
from pathlib import Path

HERE = Path(__file__).resolve().parent
target = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "starter.py"
spec = importlib.util.spec_from_file_location("student", target)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
fx = json.loads((HERE / "fixture.json").read_text(encoding="utf-8"))
exp = json.loads((HERE / "expected.json").read_text(encoding="utf-8"))
F = lambda s: Fraction(s)
close = lambda a, b: abs(float(a) - float(b)) < 1e-6
fails, incomplete = [], []


def run(name, fn):
    try:
        fn()
    except NotImplementedError:
        incomplete.append(name)
    except AssertionError as e:
        fails.append(f"{name}: {e}")
    except Exception as e:  # noqa: BLE001
        fails.append(f"{name}: {type(e).__name__}: {e}")


def t_tile():
    g = fx["gcell"]
    for (x, y), want in [((1, 1), (0, 0)), ((3, 1), (1, 0)), ((8, 5), (2, 1)), ((12, 8), (3, 1)), ((0, 4), (0, 1))]:
        got = tuple(mod.tile_of(x, y, g))
        assert got == want, f"tile_of({x},{y}) = {got}, expected {want}"


def t_demand():
    for name, e in exp["fixtures"].items():
        d = mod.demand_p(fx, fx["presets"][name]["positions"])
        want = [[F(v) for v in col] for col in e["demand"]]
        assert len(d) == len(want) and len(d[0]) == len(want[0]), f"{name}: shape must be [nx][ny] = [4][2]"
        for i in range(len(want)):
            for j in range(len(want[0])):
                assert close(d[i][j], want[i][j]), f"{name}: demand[{i}][{j}] = {d[i][j]}, expected {want[i][j]}"
    # fresh start every call
    a = mod.demand_p(fx, fx["presets"]["spread"]["positions"])
    b = mod.demand_p(fx, fx["presets"]["spread"]["positions"])
    assert all(close(a[i][j], b[i][j]) for i in range(4) for j in range(2)), "two calls gave different results (did you reuse a matrix?)"
    # boundary and coincident cases
    p = {"chip": fx["chip"], "gcell": fx["gcell"], "nets": [["P", "Q"], ["U", "V"]]}
    d = mod.demand_p(p, {"P": {"x": 1, "y": 1}, "Q": {"x": 3, "y": 1}, "U": {"x": 5, "y": 5}, "V": {"x": 5, "y": 5}})
    assert close(d[0][0], 1) and close(d[1][0], 1), "(1,1)-(3,1) should give 1 to tiles (0,0) and (1,0)"
    assert close(d[1][1], 0), "coincident pins must add 0"


def t_metrics():
    for name, e in exp["fixtures"].items():
        d = [[F(v) for v in col] for col in e["demand"]]
        for C, m in e["metrics"].items():
            got = mod.overflow_metrics(d, F(C))
            assert close(got["total"], F(m["total"])) and close(got["max"], F(m["max"])) and int(got["count"]) == m["count"], f"{name} C={C}: got {got}, expected {m}"
    for bad in (0, -1):
        try:
            mod.overflow_metrics([[1]], bad)
        except ValueError:
            continue
        raise AssertionError(f"capacity {bad} should raise ValueError")


run("tile_of", t_tile)
run("demand_p", t_demand)
run("overflow_metrics", t_metrics)
if fails:
    print("FAIL")
    for f in fails:
        print("  -", f)
    sys.exit(1)
if incomplete:
    print("INCOMPLETE: not implemented yet ->", ", ".join(incomplete))
    sys.exit(2)
print("PASS: tile_of, demand_p and overflow_metrics match the teacher's fixtures exactly.")
