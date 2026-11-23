# Concise · RUDY congestion estimate

Narration transcript (matches the voice-over). Times match site/data/films/concise.clock.en.json.

## The problem

### Opening `k01` (00:00:00.000)

- In a few minutes: RUDY, a way to estimate where wires will crowd before routing.
- RUDY stands for Rectangular Uniform wire DensitY.

### Why estimate `k02` (00:00:11.000)

- The teacher's example: a 12 by 8 chip, six pins, six nets.
- The six nets' HPWL adds up to 34.
- But a total cannot say where the wires will crowd.

## Routing tiles

### Routing tiles `k03` (00:00:23.913)

- So cut the chip into 4 by 2 routing tiles, each 3 wide and 4 tall.
- Demand is stored as demand[x][y]: column first, then row.
- What a tile can carry is its capacity; here it is 2.

## One net

### One net `k04` (00:00:38.263)

- Take one net, ABCD: its box is 7 wide and 4 tall, so HPWL = 11.
- The lower-left corner (1, 1) is in tile (0, 0); the upper-right (8, 5) is in tile (2, 1).
- Every tile between the two corners is selected: 3 by 2, six tiles.

### Equal shares `k05` (00:01:00.013)

- RUDY shares the 11 equally: each tile gets 11/6.
- Tile indices are rounded down, then clamped into the grid.
- So a point exactly on x = 3 belongs to the tile on its right.

## The demand map

### Building the map `k06` (00:01:14.563)

- Add the six nets in turn: AB, CD, AC, BD, ABCD, EF.
- Until the last one is in, the map is only a partial sum.
- The eight tiles add up to 34, exactly the total HPWL.

## Capacity and overflow

### Capacity and overflow `k07` (00:01:32.663)

- Against capacity 2: demand over capacity is the ratio, and the excess is overflow.
- Six tiles overflow: 22 in total, the worst one 14/3 over.
- Set capacity to 1: no demand changes, but total overflow becomes 28.

## In code

### Pseudocode `k08` (00:01:51.513)

- In code, validate first: the grid, the capacity and the pins must all be valid.
- Then for each net, find its box and its corner tiles, and add HPWL equally to every tile between.
- Finally read ratio and overflow against capacity; capacity never changes demand.

### Summary `k09` (00:02:12.063)

- Remember: one net, one box, and the box's tiles share its length equally.
- Demand is conserved: the map sums to total HPWL; overflow depends on capacity.
- The advanced film covers area-weighted RUDY, and why conclusions can flip.
