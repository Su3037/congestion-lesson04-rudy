# RUDY slides: speaker notes

## 1. RUDY congestion estimate

This lesson teaches RUDY: before routing, use each net's bounding box to estimate where routing demand lands. The main line is the teacher's equal-share model P; model A is a labelled comparison only.

## 2. Why HPWL alone is not enough

HPWL = box width + box height, a lower-bound style wirelength estimate. It is a total with no location. Dashed lines show connections, not routes.

## 3. GCell grid and storage order

Mind the order: demand[x][y], not screen row-major. A coordinate on the far edge such as x=12 is clamped into column 3.

## 4. One net: box, tiles, share

Tile rule: floor each corner to a tile index, then take every tile between them, inclusive. This is the teacher's source rule, not area intersection.

## 5. Pseudocode

Line 6 is the classroom model's key step: divide by the tile count, not by area. Coincident pins give hpwl = 0 and a zero share.

## 6. The boundary rule

When a pin crosses a boundary, the selected tiles jump discretely. That is the rule itself, not a display artefact.

## 7. Accumulation: the full demand map

This is after all six nets; a partial sum must be labelled partial. In model P the sum of demand equals the sum of HPWL.

## 8. Capacity changes ratio and overflow only

ratio = demand / C, overflow = max(0, demand − C). From C = 2 to C = 1 the demand matrix is unchanged.

## 9. Cluster vs spread: one legend

Do not call the spread 'better overall'. In model P total demand equals total HPWL, so total overflow largely measures wirelength. Name the metric before saying 'better'.

## 10. Model P vs model A

RUDY is a family; the discretisation decides the edge cases. DREAMPlace also multiplies by a RISA factor by pin count (1.0828 for 4 pins).

## 11. What it can and cannot do

To test prediction quality: route the same placement with a global router (e.g. OpenROAD global_route) and compare per-tile RUDY with routed usage.

## 12. Lab and practice

Adapted from yongfu-li/eda-learning (CC BY 4.0, Yongfu Li). No figures from the paper are reproduced.
