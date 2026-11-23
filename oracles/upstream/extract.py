"""Copy two RUDY kernels verbatim out of the pinned upstream files so they can
be compiled with small stub headers. Nothing inside the copied text is edited;
the script fails if the expected anchors are missing.
  research/upstream/dreamplace/rudy.cpp  (DREAMPlace 4adf954, BSD-3-Clause)
  research/upstream/openroad/Rudy.h      (OpenROAD 7b26270, BSD-3-Clause)"""
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)

dp = (root / "research/upstream/dreamplace/rudy.cpp").read_text()
a = dp.index("template <typename T>\ninline DEFINE_NET_WIRING_DISTRIBUTION_MAP_WEIGHT;")
b = dp.index("return 0;\n}", dp.index("int rudyLauncher(")) + len("return 0;\n}")
(out / "dp_kernel.inc").write_text(dp[a:b] + "\n")

orh = (root / "research/upstream/openroad/Rudy.h").read_text()
a = orh.index("  template <typename Visitor>\n  void visitNetTiles(")
# end: the closing brace of the function at two-space indentation
b = orh.index("\n  }\n", a) + len("\n  }\n")
(out / "or_visit.inc").write_text(orh[a:b])
print("extracted", (out / "dp_kernel.inc").stat().st_size, (out / "or_visit.inc").stat().st_size, "bytes")
