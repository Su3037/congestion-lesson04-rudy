"""Checker for the RUDY Python track.

  python3 check.py                                   # checks rudy_starter.py
  python3 check.py --module reference/rudy_reference.py
  python3 check.py --task 3                          # only one task

Exit code 0 only when every selected case passes. Numbers are compared with a 1e-9 relative tolerance,
never display rounding.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOL = 1e-9


def load(path: Path):
    spec = importlib.util.spec_from_file_location("student_rudy", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def close(a, b):
    a, b = float(a), float(b)
    return math.isfinite(a) and abs(a - b) <= TOL * max(1.0, abs(a), abs(b))


def fix_nan(positions):
    return {k: {kk: (float("nan") if vv == "nan" else vv) for kk, vv in v.items()} for k, v in positions.items()}


def run_case(mod, case, data):
    fn, exp = case["fn"], case["expect"]
    grid = case.get("grid", data["grid"])
    pos = case.get("positions")
    pos = fix_nan(data["placements"][pos] if isinstance(pos, str) else pos) if pos is not None else None
    nets = case.get("nets", data["nets"])
    try:
        if fn == "tile_of":
            got = list(mod.tile_of(*case["point"], grid))
            return got == exp, f"got {got!r}"
        if fn == "net_tiles":
            r = mod.net_tiles(case["net"], pos, grid)
            got = {"hpwl": r["hpwl"], "count": len(r["tiles"]), "share": r["share"]}
        elif fn == "demand_map":
            got = mod.demand_map(nets, pos, grid)
        elif fn == "overflow":
            got = mod.overflow(mod.demand_map(nets, pos, grid), case["capacity"])
        elif fn == "validate":
            got = mod.validate(nets, pos, grid, case.get("capacity"))
        else:
            return False, f"unknown case kind {fn}"
    except NotImplementedError:
        return False, "not implemented yet"
    except ValueError as e:
        return exp == "ValueError", f"raised ValueError({e})"
    except Exception as e:  # noqa: BLE001 - report any student error
        return False, f"raised {type(e).__name__}: {e}"
    if exp == "ValueError":
        return False, f"returned {got!r}; broken input must raise ValueError"
    if exp is None:
        return got is None, "accepted"
    if isinstance(exp, dict):
        ok = isinstance(got, dict) and all(k in got and close(got[k], v) for k, v in exp.items())
        return ok, f"got {got!r}"
    ok = (isinstance(got, list) and len(got) == len(exp)
          and all(len(gc) == len(ec) and all(close(g, e) for g, e in zip(gc, ec)) for gc, ec in zip(got, exp)))
    return ok, f"got {[[round(float(v), 4) for v in col] for col in got] if isinstance(got, list) else got!r}"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--module", default=str(HERE / "rudy_starter.py"))
    ap.add_argument("--task", type=int)
    ap.add_argument("--json", action="store_true", help="print a JSON summary")
    args = ap.parse_args(argv)
    data = json.loads((HERE / "fixtures" / "cases.json").read_text(encoding="utf-8"))
    mod = load(Path(args.module))
    results = []
    for case in data["cases"]:
        if args.task and case["task"] != args.task:
            continue
        ok, info = run_case(mod, case, data)
        results.append({"task": case["task"], "name": case["name"], "pass": ok, "info": info})
        if not args.json:
            print(f"[{'PASS' if ok else 'FAIL'}] task {case['task']}: {case['name']}; {info}")
    passed = sum(r["pass"] for r in results)
    if args.json:
        print(json.dumps({"passed": passed, "total": len(results), "results": results}, indent=1))
    else:
        print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) and results else 1


if __name__ == "__main__":
    sys.exit(main())
