"""RUDY practice: implement the teacher's classroom proxy (model P).

Fill in the three functions marked TODO, then run:  python3 check.py
Coordinates may be ints, floats or fractions.Fraction; use exact arithmetic if
you like (the checker compares with a small tolerance).

Matrix orientation: demand[x][y]  (column index first, then row index).
"""
import math


def tile_of(x, y, grid):
    """Return (i, j): floor(x / cellW), floor(y / cellH), clamped into the grid.
    grid = {"nx":..., "ny":..., "cellW":..., "cellH":...}"""
    # TODO: floor each coordinate by the tile size, then clamp to 0..nx-1 / 0..ny-1
    raise NotImplementedError


def demand_p(problem, positions):
    """Return demand[x][y] for all nets.
    For each net: box of its pins, hpwl = width + height, select every tile between
    the two corner tiles (inclusive), add hpwl / (number of selected tiles) to each.
    Start from zeros every call."""
    grid = problem["gcell"]
    # TODO
    raise NotImplementedError


def overflow_metrics(demand, capacity):
    """Return {"total": ..., "max": ..., "count": ...} with overflow = max(0, d - C).
    Reject capacity <= 0 by raising ValueError."""
    # TODO
    raise NotImplementedError
