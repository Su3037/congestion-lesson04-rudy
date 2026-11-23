# Advanced · The limits of RUDY

Caption transcript of the silent film. Times match site/data/films/advanced.clock.en.json.

## The boundary rule

### Advanced: the limits of RUDY `a01` (00:00:00.000)

- The concise film gave the algorithm. This one asks: where are its limits?
- Each section answers one question with real computation.

### A point on the edge `a02` (00:00:11.000)

- Move Q from x = 2.5 to x = 3: the length goes from 1.5 to 2.
- But the selected tiles go from 1 to 2: each tile drops from 3/2 to 1.
- x = 12 is the right chip edge: ⌊12 ÷ 3⌋ = 4, clamped back to the last column, 3.

### The edge in the teacher's example `a03` (00:00:27.756)

- Move A from x = 1 to x = 3: AC now selects 4 tiles instead of 2.
- Max overflow goes from 14/3 to 29/6; total demand is still 34.

## Comparing layouts

### Spread and cluster `a04` (00:00:39.156)

- One colour scale for the teacher's two layouts.
- Total overflow 22 vs 5; max overflow 14/3 vs 5.
- By total, cluster wins; by the worst tile, spread wins. Name the metric first.

### Changing capacity `a05` (00:00:55.467)

- Capacity from 2 to 1: not one demand number changes.
- Only ratio and overflow change: total 22 → 28, max 14/3 → 17/3.

## Area-weighted RUDY

### Model A: by area `a06` (00:01:06.978)

- Model A shares by the overlap of box and tile, as DREAMPlace and OpenROAD do.
- ABCD's box has area 28: middle tiles get more, edge tiles less; the sum is still 34.
- It also splits into horizontal and vertical maps: w × overlap / area and h × overlap / area.

### The ranking flips `a07` (00:01:30.067)

- Under model A, the spread's max overflow is 5.54, above the cluster's 5.
- Same pins, another RUDY, and the ranking flips. Always state the model.

## Limits

### What it cannot tell you `a08` (00:01:43.356)

- RUDY is a pre-routing estimate, not a routing result.
- Real capacity is split by direction and layer; multi-pin nets run longer, and RISA scales them up.
- Its strength is speed: one box per net, quick feedback for placement.

### Summary `a09` (00:02:02.778)

- One net, one box; tiles share HPWL equally, and demand sums to total HPWL.
- The edge rule, capacity and model all change conclusions: state them before comparing.
- The lab below can continue from any frame.
