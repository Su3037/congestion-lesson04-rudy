"""Independent Python reference for the RUDY classroom lesson.

Written separately from site/js/rudy.js (not a transliteration of it) and in
exact rational arithmetic, so the fixture numbers (37/6, 14/3, ...) are checked
exactly rather than within a float tolerance.

Model P: the teacher's discrete equal-share proxy (inclusive endpoint bins).
Model A: area-weighted extension (labelled separately; see docs/model-spec.md).

SPDX-License-Identifier: MIT
"""
from __future__ import annotations

import json
import math
from fractions import Fraction as Fr
from pathlib import Path
from typing import Dict, List, Mapping, Sequence

Pos = Mapping[str, Mapping[str, object]]


class RudyInputError(ValueError):
    def __init__(self, errors: List[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


def _frac(v) -> Fr:
    if isinstance(v, bool):
        raise TypeError("bool is not a coordinate")
    if isinstance(v, Fr):
        return v
    if isinstance(v, int):
        return Fr(v)
    if isinstance(v, float):
        if not math.isfinite(v):
            raise ValueError("non-finite")
        return Fr(v)  # exact binary value of the float
    raise TypeError(f"not a number: {v!r}")


def load_fixture(path: str | Path | None = None) -> dict:
    p = Path(path) if path else Path(__file__).with_name("fixture.json")
    return json.loads(p.read_text(encoding="utf-8"))


def grid(problem: Mapping) -> dict:
    g = problem["gcell"]
    return {
        "W": _frac(problem["chip"]["W"]),
        "H": _frac(problem["chip"]["H"]),
        "nx": int(g["nx"]),
        "ny": int(g["ny"]),
        "cw": _frac(g["cellW"]),
        "ch": _frac(g["cellH"]),
    }


def validate(problem: Mapping, positions: Pos, capacity=None) -> List[str]:
    errs: List[str] = []
    try:
        G = grid(problem)
    except Exception as e:  # missing keys, wrong types
        return [f"grid: {e}"]
    if G["nx"] < 1 or G["ny"] < 1 or G["cw"] <= 0 or G["ch"] <= 0 or G["W"] <= 0 or G["H"] <= 0:
        errs.append("grid: sizes must be positive")
    elif G["nx"] * G["cw"] != G["W"] or G["ny"] * G["ch"] != G["H"]:
        errs.append("grid: does not tile the chip")
    if capacity is not None:
        try:
            c = _frac(capacity)
            if c <= 0:
                errs.append("capacity: must be > 0")
        except Exception:
            errs.append("capacity: must be a finite number")
    nets = problem.get("nets")
    if not isinstance(nets, list):
        errs.append("nets: must be a list")
        nets = []
    for k, net in enumerate(nets):
        if not isinstance(net, list) or len(net) == 0:
            errs.append(f"net {k}: empty")
            continue
        for pid in net:
            if pid not in positions:
                errs.append(f"net {k}: unknown pin {pid}")
    for pid, p in positions.items():
        try:
            x, y = _frac(p["x"]), _frac(p["y"])
        except Exception:
            errs.append(f"pin {pid}: non-finite coordinate")
            continue
        if not errs or all(not e.startswith("grid") for e in errs):
            if x < 0 or y < 0 or x > G["W"] or y > G["H"]:
                errs.append(f"pin {pid}: outside chip")
    return errs


def _check(problem, positions, capacity=None) -> dict:
    errs = validate(problem, positions, capacity)
    if errs:
        raise RudyInputError(errs)
    return grid(problem)


def tile_of(x, y, G: dict):
    """Floor, then clamp. Accepts the internal grid dict or a raw "gcell" dict."""
    cw = G["cw"] if "cw" in G else _frac(G["cellW"])
    ch = G["ch"] if "ch" in G else _frac(G["cellH"])
    x, y = _frac(x), _frac(y)
    i = min(int(G["nx"]) - 1, max(0, math.floor(x / cw)))
    j = min(int(G["ny"]) - 1, max(0, math.floor(y / ch)))
    return i, j


def net_box(net: Sequence[str], P: Mapping[str, tuple]):
    xs = [P[p][0] for p in net]
    ys = [P[p][1] for p in net]
    return min(xs), min(ys), max(xs), max(ys)


def _pos(positions: Pos) -> Dict[str, tuple]:
    return {k: (_frac(v["x"]), _frac(v["y"])) for k, v in positions.items()}


def demand_p(problem: Mapping, positions: Pos, upto: int | None = None) -> List[List[Fr]]:
    """Teacher proxy: HPWL split equally over the inclusive endpoint-bin tiles."""
    G = _check(problem, positions)
    P = _pos(positions)
    D = [[Fr(0)] * G["ny"] for _ in range(G["nx"])]
    nets = problem["nets"] if upto is None else problem["nets"][:upto]
    for net in nets:
        x0, y0, x1, y1 = net_box(net, P)
        wl = (x1 - x0) + (y1 - y0)
        ia, ja = tile_of(x0, y0, G)
        ib, jb = tile_of(x1, y1, G)
        cells = [(i, j) for i in range(ia, ib + 1) for j in range(ja, jb + 1)]
        share = wl / len(cells)
        for i, j in cells:
            D[i][j] += share
    return D


def _ov(a0, a1, b0, b1) -> Fr:
    return max(Fr(0), min(a1, b1) - max(a0, b0))


def demand_a(problem: Mapping, positions: Pos):
    """Area-weighted extension. Returns (total, H, V) as exact matrices."""
    G = _check(problem, positions)
    P = _pos(positions)
    nx, ny, cw, ch = G["nx"], G["ny"], G["cw"], G["ch"]
    T = [[Fr(0)] * ny for _ in range(nx)]
    Hm = [[Fr(0)] * ny for _ in range(nx)]
    Vm = [[Fr(0)] * ny for _ in range(nx)]
    for net in problem["nets"]:
        x0, y0, x1, y1 = net_box(net, P)
        w, h = x1 - x0, y1 - y0
        if w > 0 and h > 0:
            area = w * h
            for i in range(nx):
                for j in range(ny):
                    o = _ov(x0, x1, i * cw, (i + 1) * cw) * _ov(y0, y1, j * ch, (j + 1) * ch)
                    if o:
                        T[i][j] += (w + h) * o / area
                        Hm[i][j] += w * o / area
                        Vm[i][j] += h * o / area
        elif w > 0:
            _, j = tile_of(x0, y0, G)
            for i in range(nx):
                o = _ov(x0, x1, i * cw, (i + 1) * cw)
                T[i][j] += o
                Hm[i][j] += o
        elif h > 0:
            i, _ = tile_of(x0, y0, G)
            for j in range(ny):
                o = _ov(y0, y1, j * ch, (j + 1) * ch)
                T[i][j] += o
                Vm[i][j] += o
    return T, Hm, Vm


def overflow_metrics(D: List[List[Fr]], capacity) -> dict:
    c = _frac(capacity)
    if c <= 0:
        raise RudyInputError(["capacity: must be > 0"])
    ov = [[max(Fr(0), d - c) for d in col] for col in D]
    flat = [v for col in ov for v in col]
    return {"total": sum(flat, Fr(0)), "max": max(flat), "count": sum(1 for v in flat if v > 0), "perCell": ov}


def total_hpwl(problem: Mapping, positions: Pos) -> Fr:
    P = _pos(positions)
    s = Fr(0)
    for net in problem["nets"]:
        x0, y0, x1, y1 = net_box(net, P)
        s += (x1 - x0) + (y1 - y0)
    return s


if __name__ == "__main__":
    fx = load_fixture()
    for name in ("spread", "cluster"):
        pos = fx["presets"][name]["positions"]
        D = demand_p(fx, pos)
        print(name, [[str(v) for v in col] for col in D], "sum", sum(sum(c, Fr(0)) for c in D))
        for C in (2, 1):
            m = overflow_metrics(D, C)
            print(f"  C={C}: total={m['total']} max={m['max']} count={m['count']}")
