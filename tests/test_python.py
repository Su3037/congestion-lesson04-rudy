"""Python-side tests: the practice reference vs hand-written goldens, starter/checker behaviour, and agreement
with the exact-fraction reference (python-ref/rudy_ref.py) used by the oracles.

  python3 -m unittest tests/test_python.py
"""
import json
import random
import subprocess
import sys
import unittest
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = ROOT / "exercises" / "python"
sys.path.insert(0, str(PY / "reference"))
sys.path.insert(0, str(ROOT / "python-ref"))
import rudy_reference as ref  # noqa: E402
import rudy_ref as exact  # noqa: E402

FX = json.loads((ROOT / "fixtures" / "rudy-fixtures.json").read_text())["fixtures"]["teacher"]
GRID = {"W": 12, "H": 8, "nx": 4, "ny": 2, "cellW": 3, "cellH": 4}
NETS = [n["pins"] for n in FX["nets"]]


class Goldens(unittest.TestCase):
    def test_spread_exact(self):
        pos = {k: {"x": Fraction(v["x"]), "y": Fraction(v["y"])} for k, v in FX["placements"]["spread"].items()}
        D = ref.demand_map(NETS, pos, GRID)
        F = Fraction
        self.assertEqual(D, [[F(37, 6), F(37, 6)], [F(14, 3), F(25, 6)], [F(20, 3), F(37, 6)], [0, 0]])
        self.assertEqual(ref.overflow(D, 2), {"total": 22, "max": F(14, 3), "count": 6})
        self.assertEqual(ref.overflow(D, 1), {"total": 28, "max": F(17, 3), "count": 6})


class Checker(unittest.TestCase):
    def run_check(self, module):
        return subprocess.run([sys.executable, "-I", str(PY / "check.py"), "--module", str(module), "--json"],
                              capture_output=True, text=True)

    def test_reference_passes_all(self):
        r = self.run_check(PY / "reference" / "rudy_reference.py")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(json.loads(r.stdout)["passed"], 26)

    def test_starter_fails_until_implemented(self):
        r = self.run_check(PY / "rudy_starter.py")
        self.assertEqual(r.returncode, 1)
        self.assertEqual(json.loads(r.stdout)["passed"], 0)

    def test_silent_skip_is_caught(self):
        # An implementation that skips unknown pins (like the teacher's helper) must fail.
        bad = ROOT / "build" / "bad_skip.py"
        bad.parent.mkdir(exist_ok=True)
        src = (PY / "reference" / "rudy_reference.py").read_text()
        src = src.replace('raise ValueError(f"net {k}: unknown pin {pin!r}")', 'continue')
        src = src.replace('xs = [positions[p]["x"] for p in net]', 'net = [p for p in net if p in positions]\n    xs = [positions[p]["x"] for p in net]')
        bad.write_text(src)
        r = json.loads(self.run_check(bad).stdout)
        self.assertLess(r["passed"], 26)
        self.assertFalse(next(x for x in r["results"] if x["name"] == "unknown pin raises")["pass"])

    def test_floor_without_clamp_is_caught(self):
        bad = ROOT / "build" / "bad_clamp.py"
        bad.write_text((PY / "reference" / "rudy_reference.py").read_text().replace(
            'i = min(grid["nx"] - 1, max(0, math.floor(x / grid["cellW"])))', 'i = math.floor(x / grid["cellW"])'))
        r = json.loads(self.run_check(bad).stdout)
        self.assertFalse(next(x for x in r["results"] if x["name"] == "chip corner (12, 8) is clamped")["pass"])


class AgreesWithExactReference(unittest.TestCase):
    def test_random_instances(self):
        rnd = random.Random(20261123)
        for _ in range(300):
            nx, ny = rnd.randint(1, 5), rnd.randint(1, 4)
            cw, ch = rnd.choice([1, 2, 3]), rnd.choice([1, 2, 4])
            grid = {"W": nx * cw, "H": ny * ch, "nx": nx, "ny": ny, "cellW": cw, "cellH": ch}
            pins = [f"p{i}" for i in range(rnd.randint(2, 7))]
            pos = {p: {"x": Fraction(rnd.randint(0, 4 * nx * cw), 4), "y": Fraction(rnd.randint(0, 4 * ny * ch), 4)} for p in pins}
            nets = [rnd.sample(pins, rnd.randint(1, len(pins))) for _ in range(rnd.randint(1, 5))]
            mine = ref.demand_map(nets, pos, grid)
            prob = {"chip": {"W": grid["W"], "H": grid["H"]}, "gcell": {"nx": nx, "ny": ny, "cellW": cw, "cellH": ch}, "nets": nets}
            self.assertEqual(mine, exact.demand_p(prob, pos))


if __name__ == "__main__":
    unittest.main()
