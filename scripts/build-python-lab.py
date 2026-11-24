"""Bundle the existing Python practice for the real browser interpreter."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXERCISE = ROOT / 'exercises/python'
RUNNER = '''import json, types
from pathlib import Path
import grader

def execute(source, mode):
    mod = types.ModuleType('__main__' if mode == 'run' else 'student_solution')
    mod.__file__ = 'rudy_starter.py'
    try:
        exec(compile(source, 'rudy_starter.py', 'exec'), mod.__dict__)
    except SystemExit as e:
        if mode != 'run' or e.code not in (None, 0):
            raise
    if mode == 'run':
        return json.dumps({'kind': 'run'})
    data = json.loads(Path('fixtures/cases.json').read_text())
    rows = []
    for case in data['cases']:
        passed, info = grader.run_case(mod, case, data)
        status = 'pass' if passed else 'incomplete' if info == 'not implemented yet' else 'fail'
        rows.append({'name': case['name'], 'status': status, 'detail': info})
    return json.dumps({'kind': 'tests', 'rows': rows})
'''
SAMPLE = '''# Model P: share a net's HPWL equally among endpoint-index tiles.
import math

pins = [(1, 1), (3, 1)]
xs, ys = [p[0] for p in pins], [p[1] for p in pins]
hpwl = max(xs) - min(xs) + max(ys) - min(ys)
lo, hi = math.floor(min(xs) / 3), math.floor(max(xs) / 3)
tiles = [(i, 0) for i in range(lo, hi + 1)]
share = hpwl / len(tiles)
print("HPWL:", hpwl)
print("Tiles:", tiles)
print("Demand per tile:", share)
assert share * len(tiles) == hpwl
print("Demand conservation check passed.")
'''
data = {'id': 'rudy', 'filename': 'rudy_starter.py',
        'starter': (EXERCISE / 'rudy_starter.py').read_text(),
        'reference': (EXERCISE / 'reference/rudy_reference.py').read_text(),
        'grader': (EXERCISE / 'check.py').read_text(),
        'fixtures': json.loads((EXERCISE / 'fixtures/cases.json').read_text()),
        'runner': RUNNER, 'sample': SAMPLE}
destination = ROOT / 'site/python-lab/exercise.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'Browser Python exercise: {len(data["fixtures"]["cases"])} cases')
