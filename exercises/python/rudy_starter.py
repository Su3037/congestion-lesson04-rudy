"""RUDY Python track: starter. Fill in each TODO, then run:  python3 check.py

Model P (the teacher's proxy). grid = {"W", "H", "nx", "ny", "cellW", "cellH"}; positions maps a pin id
to {"x": .., "y": ..}; a net is a list of pin ids.
  * tile of a point: i = floor(x / cellW), j = floor(y / cellH), then clamp into [0, nx-1] and [0, ny-1]
  * a net selects every tile from its box's lower-left corner tile to its upper-right corner tile, inclusive
  * each selected tile gets HPWL / (number of selected tiles)
  * demand is stored demand[x][y]: column first, then row
  * broken input raises ValueError; never skip a pin and return a normal-looking map
"""
from __future__ import annotations

import math
from typing import Dict, List, Mapping, Sequence

Positions = Mapping[str, Mapping[str, float]]
Grid = Mapping[str, float]


def validate(nets: Sequence[Sequence[str]], positions: Positions, grid: Grid, capacity=None) -> None:
    """Task 5: raise ValueError if the tiles do not cover the chip exactly, capacity <= 0, a net is empty,
    a pin repeats in a net, a pin is unknown, a coordinate is not finite, or a pin lies outside the chip."""
    # TODO
    raise NotImplementedError


def tile_of(x, y, grid: Grid):
    """Task 1: return (i, j). Round down, then clamp. (3, 1) with cellW 3 is in column 1."""
    # TODO
    raise NotImplementedError


def net_tiles(net: Sequence[str], positions: Positions, grid: Grid) -> Dict:
    """Task 2: return {"hpwl": .., "tiles": [(i, j), ...], "share": hpwl / len(tiles)}."""
    # TODO
    raise NotImplementedError


def demand_map(nets: Sequence[Sequence[str]], positions: Positions, grid: Grid) -> List[List[float]]:
    """Task 3: validate, then add every net's share into its tiles. Return demand[x][y]."""
    # TODO
    raise NotImplementedError


def overflow(demand: Sequence[Sequence[float]], capacity) -> Dict:
    """Task 4: return {"total", "max", "count"} of max(0, demand - capacity); capacity <= 0 raises ValueError."""
    # TODO
    raise NotImplementedError
