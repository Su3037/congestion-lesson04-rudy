"""RUDY Python track: reference solution (model P, the teacher's equal-share proxy).

Exact when you pass ints/Fractions; floats work too (the checker uses a 1e-9 tolerance).
SPDX-License-Identifier: MIT
"""
from __future__ import annotations

import math
from fractions import Fraction
from typing import Dict, List, Mapping, Optional, Sequence

Positions = Mapping[str, Mapping[str, float]]
Grid = Mapping[str, float]  # {"W", "H", "nx", "ny", "cellW", "cellH"}


def _num(v, what):
    if isinstance(v, bool) or not isinstance(v, (int, float, Fraction)):
        raise ValueError(f"{what}: not a number: {v!r}")
    if isinstance(v, float) and not math.isfinite(v):
        raise ValueError(f"{what}: non-finite")
    return v


def validate(nets: Sequence[Sequence[str]], positions: Positions, grid: Grid, capacity=None) -> None:
    """Task 5: raise ValueError for any broken input. Never skip silently."""
    nx, ny = grid["nx"], grid["ny"]
    if not (isinstance(nx, int) and isinstance(ny, int) and nx >= 1 and ny >= 1):
        raise ValueError("grid: nx and ny must be positive integers")
    W, H, cw, ch = (_num(grid[k], f"grid {k}") for k in ("W", "H", "cellW", "cellH"))
    if min(W, H, cw, ch) <= 0:
        raise ValueError("grid: sizes must be positive")
    if nx * cw != W or ny * ch != H:
        raise ValueError("grid: the tiles do not cover the chip exactly")
    if capacity is not None and _num(capacity, "capacity") <= 0:
        raise ValueError("capacity: must be > 0")
    for k, net in enumerate(nets):
        if len(net) == 0:
            raise ValueError(f"net {k}: empty")
        if len(set(net)) != len(net):
            raise ValueError(f"net {k}: repeated pin")
        for pin in net:
            if pin not in positions:
                raise ValueError(f"net {k}: unknown pin {pin!r}")
    for pin, p in positions.items():
        x, y = _num(p["x"], f"pin {pin} x"), _num(p["y"], f"pin {pin} y")
        if x < 0 or y < 0 or x > W or y > H:
            raise ValueError(f"pin {pin}: outside the chip")


def tile_of(x, y, grid: Grid):
    """Task 1: the tile (i, j) containing point (x, y): round down, then clamp into the grid."""
    i = min(grid["nx"] - 1, max(0, math.floor(x / grid["cellW"])))
    j = min(grid["ny"] - 1, max(0, math.floor(y / grid["cellH"])))
    return i, j


def net_tiles(net: Sequence[str], positions: Positions, grid: Grid) -> Dict:
    """Task 2: {"hpwl", "tiles": [(i, j), ...] from the lower-left corner tile to the upper-right one, inclusive, "share"}."""
    xs = [positions[p]["x"] for p in net]
    ys = [positions[p]["y"] for p in net]
    hpwl = (max(xs) - min(xs)) + (max(ys) - min(ys))
    i0, j0 = tile_of(min(xs), min(ys), grid)
    i1, j1 = tile_of(max(xs), max(ys), grid)
    tiles = [(i, j) for i in range(i0, i1 + 1) for j in range(j0, j1 + 1)]
    return {"hpwl": hpwl, "tiles": tiles, "share": hpwl / len(tiles)}


def demand_map(nets: Sequence[Sequence[str]], positions: Positions, grid: Grid) -> List[List[float]]:
    """Task 3: demand[x][y] (column first) after adding every net's equal shares. Validate first."""
    validate(nets, positions, grid)
    D = [[0] * grid["ny"] for _ in range(grid["nx"])]
    for net in nets:
        t = net_tiles(net, positions, grid)
        for i, j in t["tiles"]:
            D[i][j] += t["share"]
    return D


def overflow(demand: Sequence[Sequence[float]], capacity) -> Dict:
    """Task 4: {"total", "max", "count"} of max(0, demand - capacity). Capacity must be > 0."""
    if _num(capacity, "capacity") <= 0:
        raise ValueError("capacity: must be > 0")
    ov = [max(0, d - capacity) for col in demand for d in col]
    return {"total": sum(ov), "max": max(ov), "count": sum(1 for v in ov if v > 0)}
